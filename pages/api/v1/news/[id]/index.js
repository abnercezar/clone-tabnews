import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import { ValidationError } from "infra/errors.js";
import authorization from "models/authorization.js";
import event from "models/event.js";
import news from "models/news.js";

// Corpo: { "action": "publish" | "reject", title?, summary?,
//          discussion_question?, tags? }
async function patchHandler(request, response) {
  const reviewer = request.context.user;
  const { action, ...edits } = request.body || {};

  let reviewed;

  if (action === "publish") {
    reviewed = await news.publish(request.query.id, edits, reviewer);
  } else if (action === "reject") {
    reviewed = await news.reject(request.query.id, reviewer);
  } else {
    throw new ValidationError({
      message: '"action" deve ser "publish" ou "reject".',
      action: "Escolha publicar ou descartar a notícia.",
    });
  }

  await event.create({
    type: `${action}:news`,
    originatorUserId: reviewer.id,
    originatorIp: controller.getClientIp(request),
    metadata: { id: reviewed.id, content_id: reviewed.content_id ?? null },
  });

  const output = authorization.filterOutput(reviewer, "review:news", reviewed);

  if (reviewed.content) {
    output.content = reviewed.content;
  }

  return response.status(200).json(output);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .patch(controller.canRequest("review:news"), patchHandler)
  .handler(controller.errorHandlers);
