import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import user from "models/user.js";
import authorization from "models/authorization.js";
import { ForbiddenError, ValidationError } from "infra/errors.js";

// Apenas estes campos podem ser alterados via PATCH; qualquer outro é rejeitado.
const ALLOWED_UPDATE_FIELDS = ["username", "email", "password"];

function pickAllowedUpdateFields(inputValues) {
  const receivedValues = inputValues ?? {};
  const unknownFields = Object.keys(receivedValues).filter(
    (field) => !ALLOWED_UPDATE_FIELDS.includes(field),
  );

  if (unknownFields.length > 0) {
    throw new ValidationError({
      message: `Os campos a seguir não são permitidos nesta operação: ${unknownFields.join(", ")}.`,
      action: `Envie apenas os campos permitidos: ${ALLOWED_UPDATE_FIELDS.join(", ")}.`,
    });
  }

  const cleanValues = {};
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (field in receivedValues) {
      cleanValues[field] = receivedValues[field];
    }
  }

  return cleanValues;
}

async function getHandler(request, response) {
  const userTryingToGet = request.context.user;
  const username = request.query.username;
  const userFound = await user.findOneByUsername(username);

  const secureOutputValues = authorization.filterOutput(
    userTryingToGet,
    "read:user",
    userFound,
  );

  return response.status(200).json(secureOutputValues);
}

async function patchHandler(request, response) {
  const username = request.query.username;

  const userTryingToPatch = request.context.user;
  const targetUser = await user.findOneByUsername(username);

  if (!authorization.can(userTryingToPatch, "update:user", targetUser)) {
    throw new ForbiddenError({
      message: "Você não possui permissão para atualizar outro usuário",
      action:
        "Verifique se você tem a feature necessária para atualizar outro usuário.",
    });
  }

  const userInputValues = pickAllowedUpdateFields(request.body);

  const updatedUser = await user.update(username, userInputValues);

  const secureOutputValues = authorization.filterOutput(
    userTryingToPatch,
    "read:user:updated",
    updatedUser,
  );

  return response.status(200).json(secureOutputValues);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .get(getHandler)
  .patch(controller.canRequest("update:user"), patchHandler)
  .handler(controller.errorHandlers);
