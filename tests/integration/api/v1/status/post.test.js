import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("POST /api/v1/status", () => {
  describe("Anonymous user", () => {
    // Teste: "GET para api/v1/status deve retornar 200"
    test("Retrieving current system status", async () => {
      // Faz uma requisição GET para a rota api/v1/status
      const response = await fetch("http://localhost:3000/api/v1/status", {
        method: "POST",
      });
      // Espera que o status da resposta seja 200
      expect(response.status).toBe(405);

      // Converte a resposta para JSON
      const responseBody = await response.json();

      // Verifica se o corpo da resposta corresponde ao objeto de erro esperado
      expect(responseBody).toEqual({
        name: "MethodNotAllowedError", // Nome do erro
        message: "Método não permitido para este endpoint.", // Mensagem de erro
        action:
          "Verifique se o método HTTP enviado é valido para este endpoint.",
        status_code: 405, // Código de status HTTP
      });
    });
  });
});
