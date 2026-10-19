import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import content from "models/content.js";
import rss from "models/rss.js";

async function getHandler(request, response) {
  const userTryingToList = request.context.user;

  const published = await content.findPublished({
    strategy: "new",
    page: 1,
    perPage: 30,
    type: "content",
  });

  const secureContentListFound = authorization.filterOutput(
    userTryingToList,
    "read:content",
    published.contents,
  );

  const rss2 = rss.generateRss2(secureContentListFound);

  response.setHeader("Content-Type", "text/xml; charset=utf-8");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; style-src 'unsafe-inline'; sandbox",
  );
  return response.status(200).send(rss2);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .get(getHandler)
  .handler(controller.errorHandlers);
