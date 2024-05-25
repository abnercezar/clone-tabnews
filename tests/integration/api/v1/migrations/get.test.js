import database from "infra/database.js";

beforeAll(cleanDatabase);

async function cleanDatabase() {
  await database.query("drop schema public cascade; create schema public;");
}

// Teste: "GET para api/v1/migrations deve retornar 200"
test("GET to api/v1/migrations should return 200", async () => {
  // Faz uma requisição GET para a rota api/v1/migrations
  const response = await fetch("http://localhost:3000/api/v1/migrations");
  // Espera que o migrations da resposta seja 200
  expect(response.status).toBe(200);

  const responseBody = await response.json();

  expect(Array.isArray(responseBody)).toBe(true);
  expect(responseBody.length).toBeGreaterThan(0);
});
