import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import communityQuestion from "models/community-question.js";
import authorization from "models/authorization.js";

async function getHandler(request, response) {
  const userTryingToGet = request.context.user;

  const contributions = await communityQuestion.findContributions({
    questionId: request.query.id,
    category: request.query.category,
    page: request.query.page,
  });

  const secureContents = authorization.filterOutput(
    userTryingToGet,
    "read:content",
    contributions.contents,
  );

  // Categoria e total de comentários são públicos, como o próprio conteúdo.
  const secureOutputValues = secureContents.map((secureContent, index) => ({
    ...secureContent,
    community_question_category:
      contributions.contents[index].community_question_category,
    children_count: Number(contributions.contents[index].children_count ?? 0),
  }));

  response.setHeader("X-Total-Count", String(contributions.pagination.total));
  response.setHeader("X-Page", String(contributions.pagination.page));
  response.setHeader("X-Per-Page", String(contributions.pagination.perPage));

  return response.status(200).json(secureOutputValues);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .get(
    controller.canRequest("read:community_question"),
    controller.canRequest("read:content"),
    getHandler,
  )
  .handler(controller.errorHandlers);
