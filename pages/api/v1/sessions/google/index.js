import * as cookie from "cookie";
import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import googleAuth from "models/google-auth.js";
import { safeRedirectPath } from "interface/loginRedirect";

const STATE_COOKIE = "google_oauth";
const TEN_MINUTES = 10 * 60 * 1000;

// Começa o login com Google: guarda um "state" aleatório (contra CSRF) e o
// caminho de volta num cookie curto e manda a pessoa para o Google.
async function getHandler(request, response) {
  const state = googleAuth.createState();
  const authorizeUrl = googleAuth.buildAuthorizeUrl(state);
  const redirect = safeRedirectPath(request.query.redirect);

  response.setHeader(
    "Set-Cookie",
    cookie.serialize(STATE_COOKIE, JSON.stringify({ state, redirect }), {
      path: "/api/v1/sessions/google",
      maxAge: TEN_MINUTES / 1000,
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    }),
  );
  response.setHeader("Cache-Control", "no-store");
  response.redirect(302, authorizeUrl);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .get(
    controller.rateLimit({
      name: "google-login",
      limit: 30,
      windowMs: TEN_MINUTES,
    }),
    controller.canRequest("create:session"),
    getHandler,
  )
  .handler(controller.errorHandlers);
