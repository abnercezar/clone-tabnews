import email from "infra/email.js";
import database from "infra/database.js";
import webserver from "infra/webserver.js";
import { NotFoundError } from "infra/errors.js";
import user from "models/user.js";

const EXPIRATION_IN_MILLISECONDS = 60 * 15 * 1000; // 15 minutes

async function createAndSendEmail(userObject, newEmail, options = {}) {
  const tokenObject = await create(userObject.id, newEmail, options);
  await sendEmailToUser(userObject, newEmail, tokenObject.id);
  return tokenObject;
}

async function create(userId, newEmail, options = {}) {
  const expiresAt = new Date(Date.now() + EXPIRATION_IN_MILLISECONDS);

  await database.query(
    {
      text: `
      UPDATE
        email_confirmation_tokens
      SET
        used_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
      WHERE
        user_id = $1
        AND used_at IS NULL
      ;`,
      values: [userId],
    },
    options,
  );

  const results = await database.query(
    {
      text: `
      INSERT INTO
        email_confirmation_tokens (user_id, email, expires_at)
      VALUES
        ($1, $2, $3)
      RETURNING
        *
      ;`,
      values: [userId, newEmail, expiresAt],
    },
    options,
  );

  return results.rows[0];
}

async function sendEmailToUser(userObject, newEmail, tokenId) {
  const confirmationLink = getEmailConfirmationPageEndpoint(tokenId);

  await email.send({
    from: "Agrotab <contato@agrotab.com.br>",
    to: newEmail,
    subject: "Confirme seu novo email",
    text: `${userObject.username}, uma alteração de email foi solicitada no AgroTab.

Para confirmar o novo endereço, abra o link abaixo (válido por 15 minutos):

${confirmationLink}

Se você não pediu essa alteração, ignore este e-mail — o endereço atual permanece o mesmo.

Equipe AgroTab`,
  });
}

function getEmailConfirmationPageEndpoint(tokenId) {
  return `${webserver.origin}/perfil/confirmar-email/${tokenId}`;
}

async function findOneTokenByUserId(userId) {
  const results = await database.query({
    text: `
      SELECT
        *
      FROM
        email_confirmation_tokens
      WHERE
        user_id = $1
        AND used_at IS NULL
      ORDER BY
        created_at DESC
      LIMIT
        1
    ;`,
    values: [userId],
  });

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message:
        "O token de confirmação de email utilizado não foi encontrado no sistema.",
      action: "Solicite uma nova alteração de email.",
    });
  }

  return results.rows[0];
}

async function findOneValidById(tokenId, options = {}) {
  const results = await database.query(
    {
      text: `
      SELECT
        *
      FROM
        email_confirmation_tokens
      WHERE
        id = $1
        AND used_at IS NULL
        AND expires_at >= NOW()
      LIMIT
        1
    ;`,
      values: [tokenId],
    },
    options,
  );

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message:
        "O token de confirmação de email utilizado não foi encontrado no sistema ou expirou.",
      action: "Solicite uma nova alteração de email.",
    });
  }

  return results.rows[0];
}

async function markTokenAsUsedById(tokenId, options = {}) {
  const results = await database.query(
    {
      text: `
      UPDATE
        email_confirmation_tokens
      SET
        used_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
      WHERE
        id = $1
        AND used_at IS NULL
        AND expires_at >= NOW()
      RETURNING
        *
    ;`,
      values: [tokenId],
    },
    options,
  );

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message:
        "O token de confirmação de email utilizado não foi encontrado no sistema ou expirou.",
      action: "Solicite uma nova alteração de email.",
    });
  }

  return results.rows[0];
}

async function confirmEmailUpdate(tokenId) {
  return await database.withTransaction(async (transaction) => {
    const validToken = await findOneValidById(tokenId, { transaction });
    const userFound = await user.findOneById(validToken.user_id, {
      transaction,
    });

    await user.update(
      userFound.username,
      { email: validToken.email },
      { skipEmailConfirmation: true, transaction },
    );

    return await markTokenAsUsedById(tokenId, { transaction });
  });
}

const emailConfirmation = {
  create,
  createAndSendEmail,
  findOneTokenByUserId,
  findOneValidById,
  getEmailConfirmationPageEndpoint,
  confirmEmailUpdate,
  EXPIRATION_IN_MILLISECONDS,
};

export default emailConfirmation;
