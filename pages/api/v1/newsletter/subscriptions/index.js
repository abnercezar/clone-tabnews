import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import newsletter from "models/newsletter.js";

const TEN_MINUTES = 10 * 60 * 1000;

async function postHandler(request, response) {
  await newsletter.subscribe(request.body?.email);

  return response.status(202).json({
    message:
      "Se o endereço puder receber a newsletter, enviamos um link de confirmação.",
  });
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .post(
    controller.rateLimit({
      name: "create-newsletter-subscription",
      limit: 10,
      windowMs: TEN_MINUTES,
    }),
    controller.canRequest("create:newsletter_subscription"),
    postHandler,
  )
  .handler(controller.errorHandlers);
