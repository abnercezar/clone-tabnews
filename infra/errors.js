// Classe de erro para erros internos do servidor
export class InternalServerError extends Error {
  constructor({ cause, statusCode }) {
    // Chama o construtor da classe pai (Error) com uma mensagem padrão e a causa do erro
    super("Um erro interno não esperado aconteceu.", {
      cause,
    });
    this.name = "InternalServerError"; // Nome do erro
    this.action = "Entre em contato com o suporte"; // Ação recomendada ao usuário
    this.statusCode = statusCode || 500; // Código de status HTTP
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

export class ServiceError extends Error {
  constructor({ cause, message }) {
    // Chama o construtor da classe pai (Error) com uma mensagem padrão e a causa do erro
    super(message || "Serviço indisponível no momento.", {
      cause,
    });
    this.name = "ServiceError"; // Nome do erro
    this.action = "Verifique se o serviço está disponível."; // Ação recomendada ao usuário
    this.statusCode = 503; // Código de status HTTP
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

// Classe de erro para erros internos do servidor
export class MethodNotAllowedError extends Error {
  constructor() {
    // Chama o construtor da classe pai (Error) com uma mensagem padrão e a causa do erro
    super("Método não permitido para este endpoint.");
    this.name = "MethodNotAllowedError"; // Nome do erro
    this.action =
      "Verifique se o método HTTP enviado é valido para este endpoint."; // Ação recomendada ao usuário
    this.statusCode = 405; // Código de status HTTP
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
