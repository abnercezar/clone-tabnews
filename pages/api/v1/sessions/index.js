import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authentication from "models/authentication.js";
import authorization from "models/authorization.js";
import session from "models/session.js";

import { ForbiddenError, ValidationError } from "infra/errors";

async function postHandler(request, response) {
  const userInputValues = request.body ?? {};

  if (!userInputValues.email || !userInputValues.password) {
    throw new ValidationError({
      message: "Email e senha são obrigatórios.",
      action: "Preencha email e senha para fazer login.",
    });
  }

  // Autentica o usuário
  const authenticatedUser = await authentication.getUser(
    userInputValues.email,
    userInputValues.password,
  );

  if (!authorization.can(authenticatedUser, "create:session")) {
    throw new ForbiddenError({
      message: "Você não possui permissão para fazer login.",
      action: "Contate o suporte caso você acredite que isso seja um erro.",
    });
  }

  const newSession = await session.create(authenticatedUser.id);

  controller.setSessionCookie(newSession.token, response);

  const secureOutputValues = authorization.filterOutput(
    authenticatedUser,
    "read:session",
    newSession,
  );

  return response.status(201).json(secureOutputValues);
}

async function deleteHandler(request, response) {
  const userTryingToDelete = request.context.user;
  const sessionToken = request.cookies.session_id;

  const sessionObject = await session.findOneValidByToken(sessionToken);
  const expiredSession = await session.expireById(sessionObject.id);
  controller.clearSessionCookie(response);

  const secureOutputValues = authorization.filterOutput(
    userTryingToDelete,
    "read:session",
    expiredSession,
  );

  return response.status(200).json(secureOutputValues);
}

const TEN_MINUTES = 10 * 60 * 1000;

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .post(
    controller.rateLimit({
      name: "create-session",
      limit: 30,
      windowMs: TEN_MINUTES,
    }),
    controller.canRequest("create:session"),
    postHandler,
  )
  .delete(deleteHandler)
  .handler(controller.errorHandlers);
