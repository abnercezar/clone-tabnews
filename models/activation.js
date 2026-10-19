import email from "infra/email.js";
import database from "infra/database.js";
import webserver from "infra/webserver.js";
import { ForbiddenError, NotFoundError } from "infra/errors.js";
import user from "models/user.js";
import authorization from "models/authorization.js";

const EXPIRATION_IN_MILLISECONDS = 60 * 15 * 1000; // 15 minutes

async function findOneById(tokenId) {
  const results = await database.query({
    text: `
      SELECT
        *
      FROM
        user_activation_tokens
      WHERE
        id = $1
      LIMIT
        1
    ;`,
    values: [tokenId],
  });

  if (results.rows.length === 0) {
    throw new NotFoundError({
      message:
        "O token de ativação informado não foi encontrado ou é inválido.",
      action: "Faça login novamente para receber um novo token por e-mail.",
    });
  }

  return results.rows[0];
}

async function findOneValidById(tokenId) {
  const tokenById = await findOneById(tokenId);

  if (tokenById.used_at) {
    throw new NotFoundError({
      message:
        "O token de ativação informado não foi encontrado no sistema ou expirou.",
      action: "Faça login novamente para receber um novo token por e-mail.",
    });
  }

  if (new Date(tokenById.expires_at).getTime() <= Date.now()) {
    throw new NotFoundError({
      message:
        "O token de ativação informado não foi encontrado no sistema ou expirou.",
      action: "Faça login novamente para receber um novo token por e-mail.",
    });
  }

  return tokenById;
}

async function create(userId) {
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);

  const results = await database.query({
    text: `
      INSERT INTO
        user_activation_tokens (user_id, expires_at)
      VALUES
        ($1, $2)
      RETURNING
        *
    ;`,
    values: [userId, expiresAt],
  });

  return results.rows[0];
}

async function markTokenAsUsed(activationTokenId) {
  const results = await database.query({
    text: `
      UPDATE
        user_activation_tokens
      SET
        used_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
      WHERE
        id = $1
      RETURNING
        *
    ;`,
    values: [activationTokenId],
  });

  return results.rows[0];
}

async function activateUserByUserId(userId) {
  const userToActivate = await user.findOneById(userId);

  if (!authorization.can(userToActivate, "read:activation_token")) {
    throw new ForbiddenError({
      message: "Você não pode mais utilizar tokens de ativação.",
      action: "Entre em contato com o suporte.",
    });
  }

  return await user.setFeatures(userId, authorization.defaultActivatedFeatures);
}

async function sendEmailToUser(userObject, activationToken) {
  await email.send({
    from: "Agrotab <contato@agrotab.com.br>",
    to: userObject.email,
    subject: "Ative seu cadastro Agrotab",
    text: `${userObject.username}, clique no link abaixo para ativar seu cadastro no Agrotab:

${webserver.origin}/cadastro/ativar/${activationToken.id}

Atenciosamente,
Equipe Agrotab`,
  });
}

async function createAndSendActivationEmail(userObject) {
  const activationToken = await create(userObject.id);
  await sendEmailToUser(userObject, activationToken);
  return activationToken;
}

async function activateUserUsingTokenId(tokenId) {
  const tokenById = await findOneById(tokenId);

  // Idempotente como no TabNews: link já usado continua 200.
  if (tokenById.used_at) {
    return tokenById;
  }

  if (new Date(tokenById.expires_at).getTime() <= Date.now()) {
    throw new NotFoundError({
      message:
        "O token de ativação informado não foi encontrado no sistema ou expirou.",
      action: "Faça login novamente para receber um novo token por e-mail.",
    });
  }

  await activateUserByUserId(tokenById.user_id);
  return await markTokenAsUsed(tokenId);
}

const activation = {
  create,
  sendEmailToUser,
  createAndSendActivationEmail,
  findOneById,
  findOneValidById,
  markTokenAsUsed,
  activateUserByUserId,
  activateUserUsingTokenId,
  EXPIRATION_IN_MILLISECONDS,
};

export default activation;
