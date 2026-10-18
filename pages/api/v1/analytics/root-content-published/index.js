import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import analytics from "models/analytics.js";

async function getHandler(request, response) {
  const rows = await analytics.getRootContentsPublished();
  return response.status(200).json(rows);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .get(getHandler)
  .handler(controller.errorHandlers);
