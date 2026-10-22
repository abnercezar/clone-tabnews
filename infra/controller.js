import * as cookie from "cookie";
import session from "models/session.js";
import user from "models/user.js";
import authorization from "models/authorization.js";
import { createRateLimiter } from "infra/rate-limit.js";
import {
  InternalServerError,
  MethodNotAllowedError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  UnprocessableEntityError,
  TooManyRequestsError,
} from "infra/errors";

function onNoMatchHandler(request, response) {
  const publicErrorObject = new MethodNotAllowedError();
  response.status(publicErrorObject.statusCode).json(publicErrorObject);
}

// Manipulador de erros para o servidor
function onErrorHandler(error, request, response) {
  if (
    error instanceof ValidationError ||
    error instanceof NotFoundError ||
    error instanceof ForbiddenError ||
    error instanceof UnprocessableEntityError ||
    error instanceof TooManyRequestsError
  ) {
    return response.status(error.statusCode).json(error);
  }

  if (error instanceof UnauthorizedError) {
    clearSessionCookie(response);
    return response.status(error.statusCode).json(error);
  }

  const publicErrorObject = new InternalServerError({
    cause: error,
  });

  console.error(publicErrorObject);

  // Retorna uma resposta de erro 500 com o objeto de erro público
  response.status(publicErrorObject.statusCode).json(publicErrorObject);
}

function setSessionCookie(sessionToken, response) {
  // Define cookie de sessão
  const setCookie = cookie.serialize("session_id", sessionToken, {
    path: "/",
    maxAge: session.EXPIRATION_IN_MILLISECONDS / 1000,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  });
  response.setHeader("Set-Cookie", setCookie);
}

function clearSessionCookie(response) {
  // Define cookie de sessão
  const setCookie = cookie.serialize("session_id", "invalid", {
    path: "/",
    maxAge: -1,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  });
  response.setHeader("Set-Cookie", setCookie);
}

async function injectAnonymousOrUser(request, response, next) {
  if (request.cookies?.session_id) {
    await injectAuthenticatedUser(request);
    return next();
  }

  injectAnonymousUser(request);
  return next();
}

async function injectAuthenticatedUser(request) {
  const sessionToken = request.cookies.session_id;
  const sessionObject = await session.findOneValidByToken(sessionToken);
  const userObject = await user.findOneById(sessionObject.user_id);

  request.context = {
    ...request.context,
    user: userObject,
    clientIp: getClientIp(request),
  };
}

// Usado também no getServerSideProps das páginas públicas.
function createAnonymousUser() {
  return {
    features: [
      "read:activation_token",
      "read:recovery_token",
      "read:email_confirmation_token",
      "create:session",
      "create:user",
      "read:content",
      "read:community_question",
      "read:sponsorship",
      "read:status",
      "create:newsletter_subscription",
      "update:newsletter_subscription",
    ],
  };
}

function injectAnonymousUser(request) {
  request.context = {
    ...request.context,
    user: createAnonymousUser(),
    clientIp: getClientIp(request),
  };
}

function getClientIp(request) {
  const forwarded = request.headers["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim().slice(0, 100);
  }

  return request.socket?.remoteAddress || null;
}

// O limite vale só para o processo atual. A chave é o IP; o cabeçalho
// encaminhado pode ser forjado se o proxy não o substituir.
function rateLimit({ name, limit, windowMs }) {
  const consume = createRateLimiter({ limit, windowMs });

  return function rateLimitMiddleware(request, response, next) {
    const result = consume(`${name}:${getClientIp(request) || "unknown"}`);

    if (!result.allowed) {
      response.setHeader(
        "Retry-After",
        String(Math.max(1, Math.ceil(result.retryAfterMs / 1000))),
      );
      throw new TooManyRequestsError({
        message: "Muitas tentativas em pouco tempo.",
        action: "Aguarde alguns minutos e tente novamente.",
      });
    }

    return next();
  };
}

function canRequest(feature) {
  return function canRequestMiddleware(request, response, next) {
    const userTryingToRequest = request.context.user;

    if (authorization.can(userTryingToRequest, feature)) {
      return next();
    }

    throw new ForbiddenError({
      message: "Você não tem permissão para executar esta ação.",
      action: `Verifique se o seu usuário possui a feature "${feature}".`,
    });
  };
}

const controller = {
  errorHandlers: {
    onNoMatch: onNoMatchHandler, // Manipulador para métodos não permitidos
    onError: onErrorHandler, // Manipulador para erros internos do servidor
  },
  setSessionCookie, // Função para definir o cookie de sessão
  clearSessionCookie, // Função para limpar o cookie de sessão
  injectAnonymousOrUser, // Middleware para injetar usuário anônimo ou autenticado
  createAnonymousUser, // Usuário anônimo para páginas renderizadas no servidor
  canRequest, // Função para verificar permissões do usuário
  getClientIp,
  rateLimit,
};

export default controller;
