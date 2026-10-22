import crypto from "node:crypto";
import webserver from "infra/webserver.js";
import {
  ForbiddenError,
  NotFoundError,
  ServiceError,
  UnauthorizedError,
} from "infra/errors.js";
import activation from "models/activation.js";
import authorization from "models/authorization.js";
import user from "models/user.js";

// Login com Google (OAuth 2.0 / OpenID Connect, fluxo "authorization code").
// Sem SDK: são três chamadas HTTP. Desligado enquanto as credenciais não
// estiverem no ambiente.
const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

function getConfig() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUri: `${webserver.origin}/api/v1/sessions/google/callback`,
  };
}

function isConfigured() {
  return Boolean(getConfig());
}

function requireConfig() {
  const config = getConfig();
  if (!config) {
    throw new NotFoundError({
      message: "O login com Google não está disponível.",
      action: "Entre com seu e-mail e senha.",
    });
  }
  return config;
}

function createState() {
  return crypto.randomBytes(24).toString("hex");
}

function buildAuthorizeUrl(state) {
  const config = requireConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `${AUTHORIZE_URL}?${params}`;
}

async function fetchProfile(code) {
  const config = requireConfig();

  let tokenResponse;
  try {
    tokenResponse = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    });
  } catch (error) {
    throw new ServiceError({
      cause: error,
      message: "Não foi possível falar com o Google.",
      action: "Tente novamente em alguns minutos.",
    });
  }

  if (!tokenResponse.ok) {
    throw new UnauthorizedError({
      message: "O Google não confirmou o login.",
      action: "Tente entrar com o Google novamente.",
    });
  }

  const tokens = await tokenResponse.json();
  const profileResponse = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileResponse.ok) {
    throw new UnauthorizedError({
      message: "O Google não devolveu os dados da conta.",
      action: "Tente entrar com o Google novamente.",
    });
  }

  const profile = await profileResponse.json();

  if (!profile.sub || !profile.email || profile.email_verified !== true) {
    throw new UnauthorizedError({
      message: "O e-mail desta conta Google não está verificado.",
      action:
        "Verifique o e-mail no Google ou crie a conta com e-mail e senha.",
    });
  }

  return {
    googleId: String(profile.sub),
    email: String(profile.email),
    name: profile.given_name || profile.name || "",
  };
}

function randomPassword() {
  return crypto.randomBytes(32).toString("hex");
}

async function findOrCreateUser(profile) {
  try {
    return {
      user: await user.findOneByGoogleId(profile.googleId),
      isNew: false,
    };
  } catch (error) {
    if (!(error instanceof NotFoundError)) throw error;
  }

  let existing = null;
  try {
    existing = await user.findOneByEmail(profile.email);
  } catch (error) {
    if (!(error instanceof NotFoundError)) throw error;
  }

  if (existing) {
    const canLogin = authorization.can(existing, "create:session");
    const isPendingActivation = authorization.can(
      existing,
      "read:activation_token",
    );

    if (!canLogin && !isPendingActivation) {
      throw new ForbiddenError({
        message: "Você não possui permissão para fazer login.",
        action: "Contate o suporte caso você acredite que isso seja um erro.",
      });
    }

    if (!canLogin) {
      // O Google confirmou o e-mail: vale como ativação. A senha antiga é
      // trocada porque quem criou o cadastro pendente pode não ser o dono
      // do e-mail.
      await user.update(
        existing.username,
        { password: randomPassword() },
        { skipEmailConfirmation: true },
      );
      await activation.activateUserByUserId(existing.id);
    }

    return {
      user: await user.linkGoogleAccount(existing.id, profile.googleId),
      isNew: false,
    };
  }

  const username = await user.generateAvailableUsername(
    profile.email.split("@")[0] || profile.name,
  );
  const created = await user.create({
    username,
    email: profile.email,
    password: randomPassword(),
  });
  await activation.activateUserByUserId(created.id);

  return {
    user: await user.linkGoogleAccount(created.id, profile.googleId),
    isNew: true,
  };
}

const googleAuth = {
  isConfigured,
  createState,
  buildAuthorizeUrl,
  fetchProfile,
  findOrCreateUser,
};

export default googleAuth;
