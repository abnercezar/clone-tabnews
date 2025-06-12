import crypto from "node:crypto";
import database from "infra/database.js";

// Define o tempo de expiração da sessão: 30 dias em milissegundos
const EXPIRATION_IN_MILLISECONDS = 60 * 60 * 24 * 30 * 1000; // 30 Days

// Cria uma nova sessão para o usuário
async function create(userId) {
  // Gera um token aleatório em formato hexadecimal
  const token = crypto.randomBytes(48).toString("hex");

  // Calcula a data de expiração com base no tempo atual
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);

  // Insere a nova sessão no banco de dados
  const newSession = await runInsertQuery(token, userId, expiresAt);
  return newSession;

  // Função auxiliar para inserir a sessão no banco
  async function runInsertQuery(token, userId, expiresAt) {
    const results = await database.query({
      text: `
        INSERT INTO
          sessions (token, user_id, expires_at)
        VALUES
          ($1, $2, $3)
        RETURNING
          *
      ;`,
      values: [token, userId, expiresAt],
    });

    // Retorna a sessão criada
    return results.rows[0];
  }
}

// Exporta o módulo de sessão
const session = {
  create,
  EXPIRATION_IN_MILLISECONDS,
};

export default session;
