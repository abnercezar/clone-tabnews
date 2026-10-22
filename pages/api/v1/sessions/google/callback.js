import * as cookie from "cookie";
import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import event from "models/event.js";
import googleAuth from "models/google-auth.js";
import session from "models/session.js";
import { safeRedirectPath } from "interface/loginRedirect";

const STATE_COOKIE = "google_oauth";
const TEN_MINUTES = 10 * 60 * 1000;

function clearStateCookie() {
  return cookie.serialize(STATE_COOKIE, "", {
    path: "/api/v1/sessions/google",
    maxAge: -1,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  });
}

function readStateCookie(request) {
  try {
    const value = JSON.parse(request.cookies?.[STATE_COOKIE] || "null");
    return typeof value?.state === "string" ? value : null;
  } catch {
    return null;
  }
}

// Volta do Google. Qualquer falha leva à tela de login com um aviso, em vez
// de mostrar JSON de erro para quem só queria entrar.
async function getHandler(request, response) {
  const saved = readStateCookie(request);
  const { code, state } = request.query;

  if (
    !saved ||
    typeof code !== "string" ||
    typeof state !== "string" ||
    state !== saved.state
  ) {
    response.setHeader("Set-Cookie", clearStateCookie());
    return response.redirect(302, "/login?erro=google");
  }

  try {
    const profile = await googleAuth.fetchProfile(code);
    const { user, isNew } = await googleAuth.findOrCreateUser(profile);

    if (isNew) {
      await event.create({
        type: "create:user",
        originatorUserId: user.id,
        originatorIp: request.context.clientIp,
        metadata: { id: user.id },
      });
    }

    const newSession = await session.create(user.id);
    response.setHeader("Set-Cookie", [
      controller.serializeSessionCookie(newSession.token),
      clearStateCookie(),
    ]);

    // Conta nova vai completar o perfil (ocupação, culturas), a não ser que
    // estivesse no meio de publicar uma pergunta.
    const redirect = safeRedirectPath(saved.redirect);
    const destination =
      isNew && !redirect.startsWith("/publicar") ? "/perfil?novo=1" : redirect;
    return response.redirect(302, destination);
  } catch (error) {
    console.error("[google-login]", {
      name: error?.name,
      message: error?.message,
    });
    response.setHeader("Set-Cookie", clearStateCookie());
    return response.redirect(302, "/login?erro=google");
  }
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .get(
    controller.rateLimit({
      name: "google-callback",
      limit: 30,
      windowMs: TEN_MINUTES,
    }),
    getHandler,
  )
  .handler(controller.errorHandlers);
