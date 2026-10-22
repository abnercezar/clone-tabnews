import webserver from "infra/webserver.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/tags", () => {
  describe("Anonymous user", () => {
    test("Lists the fixed tags by category", async () => {
      const response = await fetch(`${webserver.origin}/api/v1/tags`);
      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody.length).toBe(30);
      expect(responseBody[0]).toEqual({
        slug: "soja",
        label: "Soja",
        category: "cultura",
      });

      const categories = new Set(responseBody.map((tag) => tag.category));
      expect([...categories]).toEqual(["cultura", "tema", "regiao"]);
      expect(responseBody.map((tag) => tag.slug)).toEqual(
        expect.arrayContaining([
          "pecuaria-de-leite",
          "pragas-e-doencas",
          "credito-rural",
          "cerrado",
        ]),
      );
    });
  });
});
