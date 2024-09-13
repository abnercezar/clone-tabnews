import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("GET /api/v1/status", () => {
  describe("Anonymous user", () => {
    // Teste: "GET para api/v1/status deve retornar 200"
    test("Retrieving current system status", async () => {
      // Faz uma requisição GET para a rota api/v1/status
      const response = await fetch("http://localhost:3000/api/v1/status");
      // Espera que o status da resposta seja 200
      expect(response.status).toBe(200);
      // Converte a resposta para JSON
      const responseBody = await response.json();

      // Converte a data de atualização recebida da resposta em um formato de string ISO.
      const parsedUpdatedAt = new Date(responseBody.updated_at).toISOString();

      // Compara se a data de atualização da resposta é igual à data convertida para o formato ISO.
      expect(responseBody.updated_at).toEqual(parsedUpdatedAt);

      // Verifica se a versão do banco de dados na resposta é igual a "16.0".
      expect(responseBody.dependencies.database.version).toEqual("16.0");

      // Verifica se o número máximo de conexões do banco de dados na resposta é igual a 100.
      expect(responseBody.dependencies.database.max_connections).toEqual(100);

      // Verifica se o número de conexões abertas do banco de dados na resposta é igual a 1.
      expect(responseBody.dependencies.database.opened_connections).toEqual(1);
    });
  });
});
