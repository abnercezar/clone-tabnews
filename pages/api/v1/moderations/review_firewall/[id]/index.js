import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import { ValidationError } from "infra/errors.js";
import authorization from "models/authorization.js";
import firewall from "models/firewall";
import validator from "models/validator.js";

const ALLOWED_ACTIONS = new Set(["confirm", "undo"]);

function postValidationHandler(request, response, next) {
  validator.uuid(request.query.id);

  const action = request.body?.action;

  if (typeof action !== "string" || !ALLOWED_ACTIONS.has(action)) {
    throw new ValidationError({
      message: "A ação de revisão informada é inválida.",
      action: 'Envie "action" com o valor "confirm" ou "undo".',
    });
  }

  request.body = { action };
  return next();
}

async function postHandler(request, response) {
  const eventId = request.query.id;
  const action = request.body.action;
  const originatorIp = request.context.clientIp;
  const originatorUserId = request.context.user.id;

  const firewallData = await firewall.reviewEvent({
    eventId,
    action,
    originatorIp,
    originatorUserId,
  });

  const secureOutputValues = authorization.filterOutput(
    request.context.user,
    "read:firewall",
    firewallData,
  );

  return response.status(200).json(secureOutputValues);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .post(
    postValidationHandler,
    controller.canRequest("review:firewall"),
    postHandler,
  )
  .handler(controller.errorHandlers);
