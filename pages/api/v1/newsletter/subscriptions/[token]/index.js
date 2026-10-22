import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import newsletter from "models/newsletter.js";

const TEN_MINUTES = 10 * 60 * 1000;

async function patchHandler(request, response) {
  const subscription = await newsletter.confirm(request.query.token);

  const secureOutputValues = authorization.filterOutput(
    request.context.user,
    "update:newsletter_subscription",
    subscription,
  );

  return response.status(200).json(secureOutputValues);
}

async function deleteHandler(request, response) {
  const subscription = await newsletter.unsubscribe(request.query.token);

  const secureOutputValues = authorization.filterOutput(
    request.context.user,
    "update:newsletter_subscription",
    subscription,
  );

  return response.status(200).json(secureOutputValues);
}

const limitTokenUse = controller.rateLimit({
  name: "use-newsletter-token",
  limit: 30,
  windowMs: TEN_MINUTES,
});

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .patch(
    limitTokenUse,
    controller.canRequest("update:newsletter_subscription"),
    patchHandler,
  )
  .delete(
    limitTokenUse,
    controller.canRequest("update:newsletter_subscription"),
    deleteHandler,
  )
  .handler(controller.errorHandlers);
