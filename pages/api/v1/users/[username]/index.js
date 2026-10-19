import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import database from "infra/database.js";
import user from "models/user.js";
import ban from "models/ban.js";
import event from "models/event.js";
import authorization from "models/authorization.js";
import {
  ForbiddenError,
  UnprocessableEntityError,
  ValidationError,
} from "infra/errors.js";

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

async function deleteHandler(request, response) {
  const userTryingToDelete = request.context.user;
  const targetUsername = request.query.username;
  const targetUser = await user.findOneByUsername(targetUsername);
  const banType = request.body?.ban_type;

  if (!banType) {
    throw new ValidationError({
      message: '"ban_type" é um campo obrigatório.',
      action: "Ajuste os dados enviados e tente novamente.",
    });
  }

  if (banType !== "nuke") {
    throw new ValidationError({
      message: '"ban_type" deve ser "nuke".',
      action: "Ajuste os dados enviados e tente novamente.",
    });
  }

  if (userTryingToDelete.id === targetUser.id) {
    throw new ForbiddenError({
      message: "Você não pode banir a si mesmo.",
      action: "Escolha outro usuário para realizar esta operação.",
    });
  }

  if (targetUser.features.includes("nuked")) {
    throw new UnprocessableEntityError({
      message: "Este usuário já está banido permanentemente.",
      action:
        "Verifique se você está tentando banir permanentemente o usuário correto.",
    });
  }

  const nukedUser = await database.withTransaction(async (transaction) => {
    await event.create(
      {
        type: "ban:user",
        originatorUserId: userTryingToDelete.id,
        originatorIp: controller.getClientIp(request),
        metadata: {
          ban_type: banType,
          user_id: targetUser.id,
        },
      },
      { transaction },
    );

    return await ban.nuke(targetUser.id, { transaction });
  });

  const secureOutputValues = authorization.filterOutput(
    userTryingToDelete,
    "read:user",
    nukedUser,
  );

  return response.status(200).json(secureOutputValues);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .get(getHandler)
  .patch(controller.canRequest("update:user"), patchHandler)
  .delete(controller.canRequest("ban:user"), deleteHandler)
  .handler(controller.errorHandlers);
