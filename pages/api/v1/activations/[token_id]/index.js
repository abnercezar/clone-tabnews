import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import activation from "models/activation.js";
import authorization from "models/authorization";
import validator from "models/validator.js";

async function patchHandler(request, response) {
  const activationTokenId = request.query.token_id;

  // Rejeita um token malformado com 400 em vez de deixar o Postgres gerar 500.
  validator.uuid(activationTokenId);

  const usedActivationToken =
    await activation.activateUserUsingTokenId(activationTokenId);

  const secureOutputValues = authorization.filterOutput(
    request.context.user,
    "read:activation_token",
    usedActivationToken,
  );

  return response.status(200).json(secureOutputValues);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .patch(controller.canRequest("read:activation_token"), patchHandler)
  .handler(controller.errorHandlers);
