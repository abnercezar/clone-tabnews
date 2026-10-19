import email from "infra/email.js";
import database from "infra/database.js";
import webserver from "infra/webserver.js";
import { NotFoundError } from "infra/errors.js";
import user from "models/user.js";
import session from "models/session.js";

const EXPIRATION_IN_MILLISECONDS = 60 * 15 * 1000; // 15 minutes
const MAX_VALID_TOKENS_PER_USER = 2;

async function findOneValidById(tokenId) {
  const resultsById = await database.query({
    text: `
      SELECT
        *
      FROM
        reset_password_tokens
      WHERE
        id = $1
      LIMIT
        1
    ;`,
    values: [tokenId],
  });

  if (resultsById.rows.length === 0) {
    throw new NotFoundError({
      message:
        "O token de recuperação informado não foi encontrado ou é inválido.",
      action: "Solicite uma nova recuperação de senha.",
    });
  }

  const results = await database.query({
    text: `
      SELECT
        *
      FROM
        reset_password_tokens
      WHERE
        id = $1
        AND expires_at > NOW()
        AND used_at IS NULL
      LIMIT
        1
    ;`,
    values: [tokenId],
  });

  if (results.rows.length === 0) {
    throw new NotFoundError({
      message:
        "O token de recuperação informado não foi encontrado no sistema ou expirou.",
      action: "Solicite uma nova recuperação de senha.",
    });
  }

  return results.rows[0];
}

async function create(userId) {
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);
  const results = await database.query({
    text: `
      INSERT INTO
        reset_password_tokens (user_id, expires_at)
      VALUES
        ($1, $2)
      RETURNING
        *
    ;`,
    values: [userId, expiresAt],
  });

  return results.rows[0];
}

async function markTokenAsUsed(tokenId) {
  const results = await database.query({
    text: `
      UPDATE
        reset_password_tokens
      SET
        used_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
      WHERE
        id = $1
        AND used_at IS NULL
        AND expires_at > NOW()
      RETURNING
        *
    ;`,
    values: [tokenId],
  });

  if (results.rows.length === 0) {
    throw new NotFoundError({
      message:
        "O token de recuperação informado não foi encontrado no sistema ou expirou.",
      action: "Solicite uma nova recuperação de senha.",
    });
  }

  return results.rows[0];
}

async function markAllValidTokensAsUsedByUserId(userId) {
  const results = await database.query({
    text: `
      UPDATE
        reset_password_tokens
      SET
        used_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
      WHERE
        user_id = $1
        AND used_at IS NULL
        AND expires_at > NOW()
      RETURNING
        *
    ;`,
    values: [userId],
  });

  return results.rows;
}

async function countValidTokensByUserId(userId) {
  const results = await database.query({
    text: `
      SELECT
        COUNT(*)::INTEGER AS total
      FROM
        reset_password_tokens
      WHERE
        user_id = $1
        AND used_at IS NULL
        AND expires_at >= NOW()
    ;`,
    values: [userId],
  });

  return results.rows[0].total;
}

function buildFakeToken() {
  const now = new Date();
  return {
    used_at: null,
    expires_at: new Date(now.getTime() + EXPIRATION_IN_MILLISECONDS),
    created_at: now,
    updated_at: now,
  };
}

async function sendEmailToUser(userObject, recoveryToken) {
  await email.send({
    from: "Agrotab <contato@agrotab.com.br>",
    to: userObject.email,
    subject: "Recuperação de senha",
    text: `${userObject.username}, recebemos um pedido para redefinir a senha da sua conta no AgroTab.

Se foi você, abra o link abaixo (válido por 15 minutos):

${webserver.origin}/cadastro/recuperar/${recoveryToken.id}

Se não foi você, ignore este e-mail — sua senha permanece a mesma.

Equipe AgroTab`,
  });
}

async function requestPasswordRecovery({ email: emailAddress }) {
  try {
    const userFound = await user.findOneByEmail(emailAddress);
    const validTokensCount = await countValidTokensByUserId(userFound.id);

    if (validTokensCount >= MAX_VALID_TOKENS_PER_USER) {
      return buildFakeToken();
    }

    const recoveryToken = await create(userFound.id);
    await sendEmailToUser(userFound, recoveryToken);
    return recoveryToken;
  } catch (error) {
    if (error instanceof NotFoundError) {
      return buildFakeToken();
    }

    throw error;
  }
}

async function resetUserPassword(tokenId, newPassword) {
  const validToken = await findOneValidById(tokenId);
  const userFound = await user.findOneById(validToken.user_id);

  await user.update(userFound.username, { password: newPassword });
  await session.expireAllFromUserId(validToken.user_id);

  const usedTokens = await markAllValidTokensAsUsedByUserId(validToken.user_id);
  const usedToken =
    usedTokens.find((token) => token.id === tokenId) || usedTokens[0];

  if (!usedToken) {
    throw new NotFoundError({
      message:
        "O token de recuperação informado não foi encontrado no sistema ou expirou.",
      action: "Solicite uma nova recuperação de senha.",
    });
  }

  return usedToken;
}

const recovery = {
  create,
  findOneValidById,
  markTokenAsUsed,
  markAllValidTokensAsUsedByUserId,
  countValidTokensByUserId,
  buildFakeToken,
  sendEmailToUser,
  requestPasswordRecovery,
  resetUserPassword,
  EXPIRATION_IN_MILLISECONDS,
  MAX_VALID_TOKENS_PER_USER,
};

export default recovery;
