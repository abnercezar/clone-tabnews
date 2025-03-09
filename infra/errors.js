// Classe de erro para erros internos do servidor
export class InternalServerError extends Error {
  constructor({ cause, statusCode }) {
    // Chama o construtor da classe pai (Error) com uma mensagem padrão e a causa do erro
    super("Um erro interno não esperado aconteceu.", {
      cause,
    });
    this.name = "InternalServerError";
    this.action = "Entre em contato com o suporte";
    this.statusCode = statusCode || 500;
  }

  // Converte o erro para um formato JSON
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}

export class ServiceError extends Error {
  constructor({ cause, message }) {
    // Chama o construtor da classe pai (Error) com uma mensagem padrão e a causa do erro
    super(message || "Serviço indisponível no momento.", {
      cause,
    });
    this.name = "ServiceError";
    this.action = "Verifique se o serviço está disponível.";
    this.statusCode = 503;
  }

  // Converte o erro para um formato JSON
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}
export class ValidationError extends Error {
  constructor({ cause, message, action }) {
    // Chama o construtor da classe pai (Error) com uma mensagem padrão e a causa do erro
    super(message || "Um erro de validação ocorreu.", {
      cause,
    });
    this.name = "ValidationError";
    this.action = action || "Ajuste os dados enviados e tente novamente.";
    this.statusCode = 400;
  }

  // Converte o erro para um formato JSON
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
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
