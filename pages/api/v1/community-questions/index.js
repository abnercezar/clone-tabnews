import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import database from "infra/database.js";
import communityQuestion from "models/community-question.js";
import event from "models/event.js";
import authorization from "models/authorization.js";

async function getHandler(request, response) {
  const schedule = await communityQuestion.findSchedule();

  return response.status(200).json(
    schedule.map((question) => ({
      id: question.id,
      title: question.title,
      category: question.category,
      kind: question.kind,
      starts_at: question.starts_at,
      ends_at: question.ends_at,
    })),
  );
}

async function postHandler(request, response) {
  const userTryingToCreate = request.context.user;

  const createdQuestion = await database.withTransaction(
    async (transaction) => {
      const newQuestion = await communityQuestion.create(
        {
          owner_id: userTryingToCreate.id,
          title: request.body?.title,
          description: request.body?.description,
          category: request.body?.category,
          kind: request.body?.kind,
          results_visibility: request.body?.results_visibility,
          starts_at: request.body?.starts_at,
          ends_at: request.body?.ends_at,
          options: request.body?.options,
        },
        { transaction },
      );

      await event.create(
        {
          type: "create:community_question",
          originatorUserId: userTryingToCreate.id,
          originatorIp: request.context.clientIp,
          metadata: { id: newQuestion.id },
        },
        { transaction },
      );

      return newQuestion;
    },
  );

  const secureOutputValues = authorization.filterOutput(
    userTryingToCreate,
    "read:community_question",
    createdQuestion,
  );

  return response.status(201).json(secureOutputValues);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .get(controller.canRequest("create:community_question"), getHandler)
  .post(controller.canRequest("create:community_question"), postHandler)
  .handler(controller.errorHandlers);
