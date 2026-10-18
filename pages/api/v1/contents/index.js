import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import content from "models/content.js";
import authorization from "models/authorization.js";

async function getHandler(request, response) {
  const userTryingToGet = request.context.user;

  const publishedContents = await content.findPublished();

  const secureOutputValues = authorization.filterOutput(
    userTryingToGet,
    "read:content",
    publishedContents,
  );

  return response.status(200).json(secureOutputValues);
}

async function postHandler(request, response) {
  const userTryingToCreate = request.context.user;

  const newContent = await content.create({
    owner_id: userTryingToCreate.id,
    title: request.body?.title,
    body: request.body?.body,
  });

  // O INSERT não traz o username do autor (sem JOIN); como o autor é o próprio
  // usuário autenticado, anexamos a partir dele para a resposta ficar completa.
  newContent.owner_username = userTryingToCreate.username;

  const secureOutputValues = authorization.filterOutput(
    userTryingToCreate,
    "read:content",
    newContent,
  );

  return response.status(201).json(secureOutputValues);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .get(controller.canRequest("read:content"), getHandler)
  .post(controller.canRequest("create:content"), postHandler)
  .handler(controller.errorHandlers);
