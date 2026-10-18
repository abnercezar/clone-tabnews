import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import content from "models/content.js";
import authorization from "models/authorization.js";

async function getHandler(request, response) {
  const userTryingToGet = request.context.user;
  const { username, slug } = request.query;

  const contentFound = await content.findOneByUsernameAndSlug(username, slug);

  const secureOutputValues = authorization.filterOutput(
    userTryingToGet,
    "read:content",
    contentFound,
  );

  return response.status(200).json(secureOutputValues);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .get(controller.canRequest("read:content"), getHandler)
  .handler(controller.errorHandlers);
