import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import database from "infra/database.js";
import communityQuestion from "models/community-question.js";
import event from "models/event.js";
import authorization from "models/authorization.js";

const TEN_MINUTES = 10 * 60 * 1000;

async function postHandler(request, response) {
  const userTryingToVote = request.context.user;

  const votedQuestion = await database.withTransaction(async (transaction) => {
    const updatedQuestion = await communityQuestion.vote(
      {
        questionId: request.query.id,
        optionId: request.body?.option_id,
        userId: userTryingToVote.id,
      },
      { transaction },
    );

    await event.create(
      {
        type: "create:community_question_vote",
        originatorUserId: userTryingToVote.id,
        originatorIp: request.context.clientIp,
        metadata: {
          question_id: updatedQuestion.id,
          option_id: updatedQuestion.viewer_option_id,
        },
      },
      { transaction },
    );

    return updatedQuestion;
  });

  const secureOutputValues = authorization.filterOutput(
    userTryingToVote,
    "read:community_question",
    votedQuestion,
  );

  return response.status(201).json(secureOutputValues);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .post(
    controller.rateLimit({
      name: "community-question-vote",
      limit: 30,
      windowMs: TEN_MINUTES,
    }),
    controller.canRequest("create:community_question_vote"),
    postHandler,
  )
  .handler(controller.errorHandlers);
