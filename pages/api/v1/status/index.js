// Controller
import database from "infra/database.js";

async function status(request, response) {
  const updateAt = new Date().toISOString();

  // Consulta o banco de dados para obter a versão do servidor
  const databaseVersionResult = await database.query("SHOW server_version;");

  // Extrai a versão do servidor do resultado da consulta
  const databaseVersionValue =
    await databaseVersionResult.rows[0].server_version;

  // Consulta o banco de dados para obter o número máximo de conexões
  const databaseMaxConnectionsResult = await database.query(
    "SHOW max_connections;",
  );

  // Extrai o número máximo de conexões do resultado da consulta
  const databaseMaxConnectionsValue =
    databaseMaxConnectionsResult.rows[0].max_connections;

  // Obtém o nome do banco de dados a partir das variáveis de ambiente
  const databaseName = process.env.POSTGRES_DB;

  // Consulta o banco de dados para obter o número de conexões abertas para esse banco de dados
  const databaseOpenedConnectionsResult = await database.query({
    text: "SELECT count(*)::int FROM pg_stat_activity WHERE datname = $1;",
    values: [databaseName],
  });

  // Extrai o número de conexões abertas do resultado da consulta
  const databaseOpenedConnectionsValue =
    databaseOpenedConnectionsResult.rows[0].count;

  //Inclui a versão na resposta
  response.status(200).json({
    updated_at: updateAt,
    dependencies: {
      database: {
        version: databaseVersionValue,
        max_connections: parseInt(databaseMaxConnectionsValue),
        opened_connections: databaseOpenedConnectionsValue,
      },
    },
  });
}

export default status;
