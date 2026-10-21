import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import communityQuestion from "models/community-question.js";
import authorization from "models/authorization.js";

async function getHandler(request, response) {
  const userTryingToGet = request.context.user;

  const activeQuestion = await communityQuestion.findActive({
    viewerId: userTryingToGet.id,
  });

  const secureOutputValues = authorization.filterOutput(
    userTryingToGet,
    "read:community_question",
    activeQuestion,
  );
  secureOutputValues.categories = communityQuestion.CATEGORIES;

  return response.status(200).json(secureOutputValues);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .get(controller.canRequest("read:community_question"), getHandler)
  .handler(controller.errorHandlers);
