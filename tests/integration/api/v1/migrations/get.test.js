import database from "infra/database.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await database.query("drop schema public cascade; create schema public;");
});

describe("GET /api/v1/migrations", () => {
  describe("Anonymous user", () => {
    // Teste: "GET para api/v1/migrations deve retornar 200"
    test("Retrieving pending migrations", async () => {
      // Faz uma requisição GET para a rota api/v1/migrations
      const response = await fetch("http://localhost:3000/api/v1/migrations");
      // Espera que o migrations da resposta seja 200
      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(Array.isArray(responseBody)).toBe(true);
      expect(responseBody.length).toBeGreaterThan(0);
    });
  });
});
