import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import emailConfirmation from "models/email-confirmation.js";
import validator from "models/validator.js";

const TEN_MINUTES = 10 * 60 * 1000;

async function patchHandler(request, response) {
  const tokenId = request.body?.token_id;
  validator.uuid(tokenId);

  const tokenObject = await emailConfirmation.confirmEmailUpdate(tokenId);

  const secureOutputValues = authorization.filterOutput(
    request.context.user,
    "read:email_confirmation_token",
    tokenObject,
  );

  return response.status(200).json(secureOutputValues);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .patch(
    controller.rateLimit({
      name: "use-email-confirmation",
      limit: 20,
      windowMs: TEN_MINUTES,
    }),
    controller.canRequest("read:email_confirmation_token"),
    patchHandler,
  )
  .handler(controller.errorHandlers);
