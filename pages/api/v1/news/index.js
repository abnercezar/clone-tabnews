import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import news from "models/news.js";

async function getHandler(request, response) {
  const status = request.query.status || "pending";
  const items = await news.findByStatus(status);

  return response
    .status(200)
    .json(
      authorization.filterOutput(request.context.user, "review:news", items),
    );
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .get(controller.canRequest("review:news"), getHandler)
  .handler(controller.errorHandlers);
