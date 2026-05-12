import { version as uuidVersion } from "uuid";
import webserver from "infra/webserver.js";
import orchestrator from "tests/orchestrator.js";

// Configurações iniciais antes de todos os testes
beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("`GET /api/v1/users/[username]`", () => {
  describe("Anonymous user", () => {
    test("With exact case match on `username`", async () => {
      await orchestrator.createUser({
        username: "MesmoCase",
      });

      const response2 = await fetch(
        `${webserver.origin}/api/v1/users/MesmoCase`,
      );

      expect(response2.status).toBe(200);

      const response2Body = await response2.json();

      expect(response2Body).toEqual({
        id: response2Body.id,
        username: "MesmoCase",
        features: ["read:activation_token"],
        created_at: response2Body.created_at,
        updated_at: response2Body.updated_at,
      });

      expect(uuidVersion(response2Body.id)).toBe(4);

      expect(Date.parse(response2Body.created_at)).not.toBeNaN();
      expect(Date.parse(response2Body.updated_at)).not.toBeNaN();
    });

    test("With case mismatch on `username`", async () => {
      await orchestrator.createUser({
        username: "CaseDiferente",
      });

      const response2 = await fetch(
        `${webserver.origin}/api/v1/users/casediferente`,
      );

      expect(response2.status).toBe(200);

      const response2Body = await response2.json();

      expect(response2Body).toEqual({
        id: response2Body.id,
        username: "CaseDiferente",
        features: ["read:activation_token"],
        created_at: response2Body.created_at,
        updated_at: response2Body.updated_at,
      });

      expect(uuidVersion(response2Body.id)).toBe(4);

      expect(Date.parse(response2Body.created_at)).not.toBeNaN();
      expect(Date.parse(response2Body.updated_at)).not.toBeNaN();
    });

    test("With nonexistent `username`", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/users/UsuarioInexistente`,
      );

      expect(response.status).toBe(404);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "NotFoundError",
        message: "O username informado não foi encontrado no sistema.",
        action: "Verifique se o username esta digitado corretamente.",
        status_code: 404,
      });
    });
  });
});
