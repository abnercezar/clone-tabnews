// Controller
import { createRouter } from "next-connect";
import migrationRunner from "node-pg-migrate";
import { resolve } from "node:path";
import database from "infra/database";
import controller from "infra/controller.js";

// Cria uma instância do roteador
const router = createRouter();

// Define o manipulador para o método GET e para o método POST
router.get(getHandler);
router.post(postHandler);

// Exporta o roteador com os manipuladores de erro personalizados
export default router.handler(controller.errorHandlers);

// Manipulador para métodos não permitidos

const defaultMigrationOptions = {
  dryRun: true,
  dir: resolve("infra", "migrations"),
  direction: "up",
  verbose: true,
  migrationsTable: "pgmigrations",
};

async function getHandler(request, response) {
  let dbClient;

  try {
    // Abre a conexão com o banco de dados
    dbClient = await database.getNewClient();

    const pendingMigrations = await migrationRunner({
      ...defaultMigrationOptions,
      dbClient,
    });
    //Inclui a versão na resposta
    return response.status(200).json(pendingMigrations);
  } finally {
    // Fecha a conexão com o banco de dados
    await dbClient.end();
  }
}

async function postHandler(request, response) {
  let dbClient;

  try {
    // Abre a conexão com o banco de dados
    dbClient = await database.getNewClient();

    const migratedMigrations = await migrationRunner({
      ...defaultMigrationOptions,
      dbClient,
      dryRun: false,
    });

    if (migratedMigrations.length > 0) {
      return response.status(201).json(migratedMigrations);
    }

    //Inclui a versão na resposta
    return response.status(200).json(migratedMigrations);
  } finally {
    // Fecha a conexão com o banco de dados
    await dbClient.end();
  }
}
