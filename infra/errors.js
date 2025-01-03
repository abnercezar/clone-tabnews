// Classe de erro para erros internos do servidor
export class InternalServerError extends Error {
  constructor({ cause }) {
    // Chama o construtor da classe pai (Error) com uma mensagem padrão e a causa do erro
    super("Um erro interno não esperado aconteceu.", {
      cause,
    });
    this.name = "InternalServerError"; // Nome do erro
    this.action = "Entre em contato com o suporte"; // Ação recomendada ao usuário
    this.statusCode = 500; // Código de status HTTP
  }

  // Converte o erro para um formato JSON
  toJSON() {
    return {
      name: this.name, // Nome do erro
      message: this.message, // Mensagem do erro
      action: this.action, // Ação recomendada ao usuário
      status_code: this.statusCode, // Código de status HTTP
    };
  }
}
