import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import migrator from "models/migrator.js";

// Cria uma instância do roteador
const router = createRouter();

// Define os manipuladores para os métodos GET e POST
router.get(getHandler);
router.post(postHandler);

// Exporta o roteador com os manipuladores de erro personalizados
export default router.handler(controller.errorHandlers);

// Manipulador para requisições GET
async function getHandler(request, response) {
  // Obtém a lista de migrações pendentes
  const pendingMigrations = await migrator.listPendingMigrations();
  return response.status(200).json(pendingMigrations);
}

// Manipulador para requisições POST
async function postHandler(request, response) {
  // Executa as migrações pendentes
  const migratedMigrations = await migrator.runPendingMigrations();

  // Retorna status 201 se houver migrações executadas, caso contrário, 200
  if (migratedMigrations.length > 0) {
    return response.status(201).json(migratedMigrations);
  }

  return response.status(200).json(migratedMigrations);
}
