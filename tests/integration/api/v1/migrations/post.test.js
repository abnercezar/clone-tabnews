import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
});

describe("POST /api/v1/migrations", () => {
  describe("Anonymous user", () => {
    describe("Running pending migrations", () => {
      // Teste: "POST para api/v1/migrations deve retornar 200"
      test("For the first time", async () => {
        // Faz uma requisição POST para a rota api/v1/migrations
        const response1 = await fetch(
          "http://localhost:3000/api/v1/migrations",
          {
            method: "POST",
          },
        );
        // Espera que o migrations da resposta seja 200
        expect(response1.status).toBe(201);

        const response1Body = await response1.json();

        expect(Array.isArray(response1Body)).toBe(true);
        expect(response1Body.length).toBeGreaterThan(0);
      });

      test("For the second time", async () => {
        const response2 = await fetch(
          "http://localhost:3000/api/v1/migrations",
          {
            method: "POST",
          },
        );
        // Espera que o migrations da resposta seja 200
        expect(response2.status).toBe(200);

        const response2Body = await response2.json();

        expect(Array.isArray(response2Body)).toBe(true);
        expect(response2Body.length).toBe(0);
      });
    });
  });
});
