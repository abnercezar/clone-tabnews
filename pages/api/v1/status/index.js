import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import health from "models/health.js";

async function getHandler(request, response) {
  const userTryingToGet = request.context.user;
  const dependencies = await health.getDependencies();

  const statusObject = {
    updated_at: new Date().toISOString(),
    dependencies,
  };

  const secureOutputValues = authorization.filterOutput(
    userTryingToGet,
    "read:status",
    statusObject,
  );

  const httpStatus = dependencies.database?.status === "unhealthy" ? 503 : 200;

  return response.status(httpStatus).json(secureOutputValues);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .get(getHandler)
  .handler(controller.errorHandlers);
