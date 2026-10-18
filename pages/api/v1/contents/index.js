import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import database from "infra/database.js";
import content from "models/content.js";
import event from "models/event.js";
import notification from "models/notification.js";
import authorization from "models/authorization.js";

const TEN_MINUTES = 10 * 60 * 1000;

async function getHandler(request, response) {
  const userTryingToGet = request.context.user;

  const published = await content.findPublished({
    page: request.query.page,
    perPage: request.query.per_page,
    username: request.query.username,
    strategy: request.query.strategy,
  });

  const secureOutputValues = authorization.filterOutput(
    userTryingToGet,
    "read:content",
    published.contents,
  );

  response.setHeader("X-Total-Count", String(published.pagination.total));
  response.setHeader("X-Page", String(published.pagination.page));
  response.setHeader("X-Per-Page", String(published.pagination.perPage));

  return response.status(200).json(secureOutputValues);
}

async function postHandler(request, response) {
  const userTryingToCreate = request.context.user;

  const created = await database.withTransaction(async (transaction) => {
    const newContent = await content.create(
      {
        owner_id: userTryingToCreate.id,
        title: request.body?.title,
        body: request.body?.body,
        parent_id: request.body?.parent_id,
        type: request.body?.type,
      },
      { transaction },
    );

    await event.create(
      {
        type: "create:content",
        originatorUserId: userTryingToCreate.id,
        originatorIp: controller.getClientIp(request),
        metadata: {
          content_id: newContent.id,
          parent_id: newContent.parent_id,
        },
      },
      { transaction },
    );

    const publishedRootCount = newContent.parent_id
      ? 0
      : await content.countPublishedRootByOwner(userTryingToCreate.id, {
          transaction,
        });

    return {
      newContent,
      firstPublication: publishedRootCount === 1,
    };
  });

  // O INSERT não traz o username do autor (sem JOIN); como o autor é o próprio
  // usuário autenticado, anexamos a partir dele para a resposta ficar completa.
  created.newContent.owner_username = userTryingToCreate.username;

  // Best-effort após o commit: falha de SMTP não altera o 201 do comentário.
  if (created.newContent.parent_id) {
    await notification.notifyParentContentAuthor({
      newContent: created.newContent,
      actorUsername: userTryingToCreate.username,
    });
  }

  const secureOutputValues = authorization.filterOutput(
    userTryingToCreate,
    "read:content",
    created.newContent,
  );
  secureOutputValues.first_publication = created.firstPublication;

  return response.status(201).json(secureOutputValues);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .get(controller.canRequest("read:content"), getHandler)
  .post(
    controller.rateLimit({
      name: "create-content",
      limit: 30,
      windowMs: TEN_MINUTES,
    }),
    controller.canRequest("create:content"),
    postHandler,
  )
  .handler(controller.errorHandlers);
