import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("`models/user.js`", () => {
  describe("`.update()`", () => {
    // Defesa em profundidade do T1 (P0): mesmo que um `id` chegue no objeto de
    // entrada, o UPDATE deve usar o id do registro resolvido pelo `username`
    // autorizado, nunca o id fornecido. Testa a 2ª camada isoladamente, sem
    // passar pela whitelist do handler HTTP.
    test("ignores an `id` in the input and never updates another user", async () => {
      const ownerUser = await orchestrator.createUser({
        username: "ownerUser",
        email: "owner@gmail.com",
        password: "ownerPassword",
      });

      const victimUser = await orchestrator.createUser({
        username: "victimUser",
        email: "victim@gmail.com",
        password: "victimPassword",
      });

      const updatedUser = await user.update("ownerUser", {
        id: victimUser.id,
        username: "ownerRenamed",
      });

      // O registro alterado é o do `username` autorizado, não o do id enviado
      expect(updatedUser.id).toBe(ownerUser.id);
      expect(updatedUser.id).not.toBe(victimUser.id);
      expect(updatedUser.username).toBe("ownerRenamed");

      // A vítima permanece intacta no banco
      const victimInDatabase = await user.findOneById(victimUser.id);
      expect(victimInDatabase.username).toBe("victimUser");
      expect(victimInDatabase.email).toBe("victim@gmail.com");

      // O dono foi efetivamente renomeado
      const ownerInDatabase = await user.findOneById(ownerUser.id);
      expect(ownerInDatabase.username).toBe("ownerRenamed");
    });
  });
});
