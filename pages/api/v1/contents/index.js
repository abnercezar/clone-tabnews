import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import database from "infra/database.js";
import content from "models/content.js";
import communityQuestion from "models/community-question.js";
import event from "models/event.js";
import firewall from "models/firewall";
import notification from "models/notification.js";
import authorization from "models/authorization.js";
import { ValidationError } from "infra/errors.js";

const TEN_MINUTES = 10 * 60 * 1000;

async function getHandler(request, response) {
  const userTryingToGet = request.context.user;

  const published = await content.findPublished({
    page: request.query.page,
    perPage: request.query.per_page,
    username: request.query.username,
    strategy: request.query.strategy,
    withChildren: request.query.with_children,
    type: request.query.type,
    query: request.query.q,
    tag: request.query.tag,
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

  const communityQuestionId = request.body?.community_question_id;
  const communityQuestionCategory = request.body?.community_question_category;

  const created = await database.withTransaction(async (transaction) => {
    if (communityQuestionId !== undefined && communityQuestionId !== null) {
      if (request.body?.parent_id || request.body?.type === "ad") {
        throw new ValidationError({
          message:
            "Só publicações comuns podem responder à Pergunta da Comunidade.",
          action: "Remova o comentário ou o patrocínio e tente novamente.",
        });
      }

      await communityQuestion.findActiveById(
        communityQuestionId,
        {},
        { transaction },
      );
    }

    const newContent = await content.create(
      {
        owner_id: userTryingToCreate.id,
        title: request.body?.title,
        body: request.body?.body,
        parent_id: request.body?.parent_id,
        type: request.body?.type,
        tags: request.body?.tags,
      },
      { transaction },
    );

    if (communityQuestionId !== undefined && communityQuestionId !== null) {
      await communityQuestion.addContribution(
        {
          questionId: communityQuestionId,
          contentId: newContent.id,
          category: communityQuestionCategory,
        },
        { transaction },
      );
      newContent.community_question_id = communityQuestionId;
      newContent.community_question_category = communityQuestionCategory;
    }

    await event.create(
      {
        type: newContent.parent_id
          ? "create:content:text_child"
          : "create:content:text_root",
        originatorUserId: userTryingToCreate.id,
        originatorIp: request.context.clientIp,
        metadata: {
          id: newContent.id,
          content_id: newContent.id,
          parent_id: newContent.parent_id,
          community_question_id: newContent.community_question_id,
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
  created.newContent.owner_occupation = userTryingToCreate.occupation;
  created.newContent.owner_state = userTryingToCreate.state;
  created.newContent.owner_founder = userTryingToCreate.founder;

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
  if (created.newContent.community_question_id) {
    secureOutputValues.community_question_id =
      created.newContent.community_question_id;
    secureOutputValues.community_question_category =
      created.newContent.community_question_category;
  }

  return response.status(201).json(secureOutputValues);
}

function firewallValidationHandler(request, response, next) {
  if (!request.body?.parent_id) {
    return firewall.canRequest("create:content:text_root")(
      request,
      response,
      next,
    );
  }

  return firewall.canRequest("create:content:text_child")(
    request,
    response,
    next,
  );
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
    firewallValidationHandler,
    postHandler,
  )
  .handler(controller.errorHandlers);
