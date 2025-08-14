import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authentication from "models/authentication.js";
import session from "models/session.js";

const router = createRouter();

router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const userInputValues = request.body;

  // Autentica o usuário
  const authenticatedUser = await authentication.getAuthenticatedUser(
    userInputValues.email,
    userInputValues.password,
  );

  // Cria uma nova sessão
  const newSession = await session.create(authenticatedUser.id);

  controller.setSessionCookie(newSession.token, response);

  // Retorna a sessão criada
  return response.status(201).json(newSession);
}
