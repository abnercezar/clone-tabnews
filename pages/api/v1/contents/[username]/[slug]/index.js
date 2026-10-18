import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import database from "infra/database.js";
import content from "models/content.js";
import event from "models/event.js";
import authorization from "models/authorization.js";
import { ForbiddenError } from "infra/errors.js";

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

async function deleteHandler(request, response) {
  const userTryingToDelete = request.context.user;
  const { username, slug } = request.query;

  const contentFound = await content.findOneByUsernameAndSlug(username, slug);
  const canDeleteOthers = authorization.can(
    userTryingToDelete,
    "delete:content:others",
  );

  if (userTryingToDelete.id !== contentFound.owner_id && !canDeleteOthers) {
    throw new ForbiddenError({
      message: "Você só pode excluir o seu próprio conteúdo.",
      action: "Escolha uma publicação sua.",
    });
  }

  const removedContent = await database.withTransaction(async (transaction) => {
    const deletedContent = await content.remove(contentFound.id, {
      transaction,
    });

    await event.create(
      {
        type: "delete:content",
        originatorUserId: userTryingToDelete.id,
        originatorIp: controller.getClientIp(request),
        metadata: {
          content_id: contentFound.id,
        },
      },
      { transaction },
    );

    return deletedContent;
  });

  removedContent.owner_username = contentFound.owner_username;

  const secureOutputValues = authorization.filterOutput(
    userTryingToDelete,
    "read:content",
    removedContent,
  );

  return response.status(200).json(secureOutputValues);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .get(controller.canRequest("read:content"), getHandler)
  .delete(controller.canRequest("delete:content"), deleteHandler)
  .handler(controller.errorHandlers);
