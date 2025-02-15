import migrationRunner from "node-pg-migrate";
import { resolve } from "node:path";
import database from "infra/database";

// Configurações padrão para as migrações
const defaultMigrationOptions = {
  dryRun: true,
  dir: resolve("infra", "migrations"),
  direction: "up",
  verbose: true,
  migrationsTable: "pgmigrations",
};

// Função para listar migrações pendentes
async function listPendingMigrations() {
  let dbClient;

  try {
    // Abre a conexão com o banco de dados
    dbClient = await database.getNewClient();

    // Executa o runner de migrações em modo dry-run para listar pendentes
    const pendingMigrations = await migrationRunner({
      ...defaultMigrationOptions,
      dbClient,
    });

    return pendingMigrations;
  } finally {
    // Fecha a conexão com o banco de dados
    await dbClient?.end();
  }
}

// Função para executar migrações pendentes
async function runPendingMigrations() {
  let dbClient;

  try {
    // Abre a conexão com o banco de dados
    dbClient = await database.getNewClient();

    // Executa o runner de migrações para aplicar migrações pendentes
    const migratedMigrations = await migrationRunner({
      ...defaultMigrationOptions,
      dbClient,
      dryRun: false,
    });

    return migratedMigrations;
  } finally {
    // Fecha a conexão com o banco de dados
    await dbClient?.end();
  }
}

// Exporta o objeto migrator com os métodos disponíveis
const migrator = {
  listPendingMigrations,
  runPendingMigrations,
};

export default migrator;
