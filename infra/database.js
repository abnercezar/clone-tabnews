import { Client } from "pg";
import { ServiceError } from "./errors.js";

// Executa uma consulta. Com `options.transaction`, reutiliza a conexão já
// aberta em vez de abrir outra — é o que permite gravar várias mudanças juntas.
async function query(queryObject, options = {}) {
  if (options.transaction) {
    try {
      return await options.transaction.query(queryObject);
    } catch (error) {
      throw new ServiceError({
        message: "Erro na conexão com Banco ou na Query.",
        cause: error,
      });
    }
  }

  let client;
  try {
    client = await getNewClient();
    const result = await client.query(queryObject);
    return result;
  } catch (error) {
    const serviceErrorObject = new ServiceError({
      message: "Erro na conexão com Banco ou na Query.",
      cause: error,
    });

    throw serviceErrorObject;
  } finally {
    // Certifique-se de fechar a conexão ao final, independentemente do sucesso ou falha
    await client?.end();
  }
}

// Abre uma conexão dedicada para um conjunto de consultas que precisa ser
// confirmado ou desfeito por inteiro.
async function transaction() {
  const client = await getNewClient();

  return {
    query(queryObject) {
      return client.query(queryObject);
    },
    async release() {
      await client.end();
    },
  };
}

async function withTransaction(callback) {
  const currentTransaction = await transaction();

  try {
    await currentTransaction.query("BEGIN");
    const result = await callback(currentTransaction);
    await currentTransaction.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await currentTransaction.query("ROLLBACK");
    } catch {
      // A falha original é a que importa; o rollback pode falhar se a
      // conexão já tiver caído.
    }
    throw error;
  } finally {
    await currentTransaction.release();
  }
}
// Cria e conecta um novo cliente ao banco de dados PostgreSQL
async function getNewClient() {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    user: process.env.POSTGRES_USER,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    ssl: getSSLValues(), // Configurações de SSL
  });

  await client.connect(); // Conecta ao banco de dados
  return client;
}

// Objeto de banco de dados com métodos disponíveis
const database = {
  query,
  getNewClient,
  transaction,
  withTransaction,
};

export default database;
// Função para obter valores de SSL
function getSSLValues() {
  if (process.env.POSTGRES_CA) {
    return {
      ca: process.env.POSTGRES_CA,
    };
  }
  return process.env.NODE_ENV === "production" ? true : false;
}
