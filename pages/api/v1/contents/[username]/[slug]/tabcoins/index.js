import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import database from "infra/database.js";
import content from "models/content.js";
import event from "models/event.js";
import balance from "models/balance.js";
import authorization from "models/authorization.js";
import { UnprocessableEntityError, ValidationError } from "infra/errors.js";

async function postHandler(request, response) {
  const userTryingToPost = request.context.user;
  const { username, slug } = request.query;
  const transactionType = request.body?.transaction_type;

  if (transactionType !== "credit" && transactionType !== "debit") {
    throw new ValidationError({
      message: "O tipo de transação informado não é válido.",
      action: 'Use "credit" ou "debit".',
    });
  }

  const contentFound = await content.findOneByUsernameAndSlug(username, slug);

  if (userTryingToPost.id === contentFound.owner_id) {
    throw new UnprocessableEntityError({
      message:
        "Você não pode realizar esta operação em conteúdos de sua própria autoria.",
      action: "Realize esta operação em conteúdos de outros usuários.",
    });
  }

  await canUpdateContentTabCoins(
    controller.getClientIp(request),
    userTryingToPost.id,
    contentFound.id,
  );

  const currentContentTabCoinsBalance = await tabcoinsTransaction(null, 5, {
    userTryingToPost,
    contentFound,
    transactionType,
    clientIp: controller.getClientIp(request),
  });

  const secureOutputValues = authorization.filterOutput(
    userTryingToPost,
    "read:content:tabcoins",
    currentContentTabCoinsBalance,
  );

  return response.status(201).json(secureOutputValues);
}

async function tabcoinsTransaction(transaction, remainingAttempts, context) {
  if (!transaction) {
    transaction = await database.transaction();
  }

  try {
    await transaction.query("BEGIN");
    await transaction.query("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");

    const tabCoinsRequiredAmount = 2;

    const currentEvent = await event.create(
      {
        type: "update:content:tabcoins",
        originatorUserId: context.userTryingToPost.id,
        originatorIp: context.clientIp,
        metadata: {
          transaction_type: context.transactionType,
          from_user_id: context.userTryingToPost.id,
          content_owner_id: context.contentFound.owner_id,
          content_id: context.contentFound.id,
          amount: tabCoinsRequiredAmount,
        },
      },
      { transaction },
    );

    const currentContentTabCoinsBalance = await balance.rateContent(
      {
        contentId: context.contentFound.id,
        contentOwnerId: context.contentFound.owner_id,
        fromUserId: context.userTryingToPost.id,
        transactionType: context.transactionType,
      },
      {
        eventId: currentEvent.id,
        transaction,
      },
    );

    await transaction.query("COMMIT");
    await transaction.release();

    return currentContentTabCoinsBalance;
  } catch (error) {
    try {
      await transaction.query("ROLLBACK");
    } catch {
      // Mantém o erro original.
    }

    if (isSerializationFailure(error) && remainingAttempts > 0) {
      return tabcoinsTransaction(transaction, remainingAttempts - 1, context);
    }

    await transaction.release();

    if (isSerializationFailure(error)) {
      throw new UnprocessableEntityError({
        message: "Muitos votos ao mesmo tempo.",
        action: "Tente realizar esta operação mais tarde.",
      });
    }

    throw unwrapDomainError(error);
  }
}

function isSerializationFailure(error) {
  let current = error;

  while (current) {
    if (current.code === "40001") {
      return true;
    }

    if (
      typeof current.message === "string" &&
      current.message.includes("could not serialize access")
    ) {
      return true;
    }

    current = current.cause;
  }

  return false;
}

function unwrapDomainError(error) {
  let current = error;

  while (current) {
    if (
      current.name === "UnprocessableEntityError" ||
      current.name === "ValidationError" ||
      current.name === "ForbiddenError" ||
      current.name === "NotFoundError"
    ) {
      return current;
    }

    current = current.cause;
  }

  return error;
}

async function canUpdateContentTabCoins(clientIp, userId, contentId) {
  const results = await database.query({
    text: `
      SELECT
        count(*) FILTER (WHERE originator_ip = $1) AS ip_count,
        count(*) FILTER (WHERE originator_user_id = $2) AS user_count
      FROM
        events
      WHERE
        type = 'update:content:tabcoins'
        AND metadata->>'content_id' = $3
        AND created_at > NOW() - INTERVAL '72 hours'
    ;`,
    values: [clientIp, userId, contentId],
  });

  const { ip_count, user_count } = results.rows[0];

  if (Number(ip_count) > 2 || Number(user_count) > 2) {
    throw new ValidationError({
      message: "Você está tentando qualificar muitas vezes o mesmo conteúdo.",
      action: "Esta operação não poderá ser repetida dentro de 72 horas.",
    });
  }
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .post(controller.canRequest("update:content"), postHandler)
  .handler(controller.errorHandlers);
