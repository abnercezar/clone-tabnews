import webserver from "infra/webserver.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("`GET /api/v1/contents/[username]/[slug]`", () => {
  describe("Anonymous user", () => {
    test("Reads a published content by username and slug", async () => {
      const author = await orchestrator.createUser({ username: "autorpost" });
      await orchestrator.activateUser(author);

      const createdContent = await orchestrator.createContent({
        owner_id: author.id,
        title: "Plantio direto",
        body: "Como funciona o plantio direto.",
      });

      const response = await fetch(
        `${webserver.origin}/api/v1/contents/autorpost/${createdContent.slug}`,
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.title).toBe("Plantio direto");
      expect(responseBody.body).toBe("Como funciona o plantio direto.");
      expect(responseBody.slug).toBe("plantio-direto");
      expect(responseBody.owner_username).toBe("autorpost");
    });

    test("Returns 404 for a nonexistent content", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/contents/autorpost/nao-existe`,
      );

      expect(response.status).toBe(404);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("NotFoundError");
      expect(responseBody.status_code).toBe(404);
    });
  });
});
