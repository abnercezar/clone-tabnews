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

async function patchHandler(request, response) {
  const userTryingToUpdate = request.context.user;
  const { username, slug } = request.query;

  const contentFound = await content.findOneByUsernameAndSlug(username, slug);
  const canUpdateOthers = authorization.can(
    userTryingToUpdate,
    "update:content:others",
  );

  if (userTryingToUpdate.id !== contentFound.owner_id && !canUpdateOthers) {
    throw new ForbiddenError({
      message: "Você só pode editar o seu próprio conteúdo.",
      action: "Escolha uma publicação sua.",
    });
  }

  const updatedContent = await database.withTransaction(async (transaction) => {
    await event.create(
      {
        type: "update:content",
        originatorUserId: userTryingToUpdate.id,
        originatorIp: controller.getClientIp(request),
        metadata: {
          content_id: contentFound.id,
        },
      },
      { transaction },
    );

    return content.update(
      contentFound,
      {
        title: request.body?.title,
        body: request.body?.body,
        tags: request.body?.tags,
      },
      { transaction },
    );
  });

  const secureOutputValues = authorization.filterOutput(
    userTryingToUpdate,
    "read:content",
    updatedContent,
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
    const currentEvent = await event.create(
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

    const deletedContent = await content.remove(contentFound, {
      transaction,
      eventId: currentEvent.id,
    });

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
  .patch(controller.canRequest("update:content"), patchHandler)
  .delete(controller.canRequest("delete:content"), deleteHandler)
  .handler(controller.errorHandlers);
