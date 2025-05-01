import { Client } from "pg";
import { ServiceError } from "./errors.js";

//Função assíncrona para executar uma consulta no banco de dados.
async function query(queryObject) {
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
