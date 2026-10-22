import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import tag from "models/tag.js";

// Lista fixa de tags (cultura/criação, tema e região). Não contém dados de
// usuário, então sai como está do banco.
async function getHandler(request, response) {
  const tags = await tag.findAll();

  response.setHeader(
    "Cache-Control",
    "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
  );

  return response.status(200).json(tags);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .get(controller.canRequest("read:content"), getHandler)
  .handler(controller.errorHandlers);
