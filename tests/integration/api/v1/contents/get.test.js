import webserver from "infra/webserver.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("`GET /api/v1/contents`", () => {
  describe("Anonymous user", () => {
    test("Returns an empty list when there is no content", async () => {
      const response = await fetch(`${webserver.origin}/api/v1/contents`);

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(Array.isArray(responseBody)).toBe(true);
      expect(responseBody.length).toBe(0);
    });

    test("Returns the published feed with the author username", async () => {
      const author = await orchestrator.createUser({ username: "autorfeed" });
      await orchestrator.activateUser(author);

      await orchestrator.createContent({
        owner_id: author.id,
        title: "Primeiro post",
        body: "Conteúdo do primeiro post.",
      });
      await orchestrator.createContent({
        owner_id: author.id,
        title: "Segundo post",
        body: "Conteúdo do segundo post.",
      });

      const response = await fetch(`${webserver.origin}/api/v1/contents`);

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.length).toBe(2);
      // Mais recente primeiro
      expect(responseBody[0].title).toBe("Segundo post");
      expect(responseBody[1].title).toBe("Primeiro post");
      expect(responseBody[0].owner_username).toBe("autorfeed");
      expect(responseBody[0].status).toBe("published");
    });
  });
});
