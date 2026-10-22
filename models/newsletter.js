import database from "infra/database.js";
import email from "infra/email.js";
import webserver from "infra/webserver.js";
import { NotFoundError, ValidationError } from "infra/errors.js";
import content from "models/content.js";
import validator from "models/validator.js";
import { createExcerpt } from "interface/excerpt";

const FROM = "Agrotab <contato@agrotab.com.br>";
const CONFIRMATION_RESEND_INTERVAL_MINUTES = 10;
const CONFIRMATION_EXPIRATION_DAYS = 7;
const EDITION_DAYS = 7;
const EDITION_MAX_CONTENTS = 10;
const EDITION_CANDIDATES = 50;
const EDITION_MIN_INTERVAL_MINUTES = 60;

// A resposta é a mesma para e-mail novo, pendente ou já confirmado:
// quem pede não descobre quem já está na lista.
async function subscribe(emailAddress) {
  const normalizedEmail = normalizeEmail(emailAddress);
  validator.email(normalizedEmail);

  await database.query({
    text: `
      INSERT INTO
        newsletter_subscriptions (email)
      VALUES
        ($1)
      ON CONFLICT ((LOWER(email))) DO NOTHING
    ;`,
    values: [normalizedEmail],
  });

  const results = await database.query({
    text: `
      UPDATE
        newsletter_subscriptions
      SET
        token = gen_random_uuid(),
        confirmed_at = NULL,
        unsubscribed_at = NULL,
        confirmation_sent_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
      WHERE
        LOWER(email) = LOWER($1)
        AND (confirmed_at IS NULL OR unsubscribed_at IS NOT NULL)
        AND (
          confirmation_sent_at IS NULL
          OR confirmation_sent_at < timezone('utc', now()) - make_interval(mins => $2)
        )
      RETURNING
        *
    ;`,
    values: [normalizedEmail, CONFIRMATION_RESEND_INTERVAL_MINUTES],
  });

  if (results.rowCount === 0) {
    return { confirmationSent: false };
  }

  try {
    await sendConfirmationEmail(results.rows[0]);
  } catch (error) {
    await database.query({
      text: `
        UPDATE
          newsletter_subscriptions
        SET
          confirmation_sent_at = NULL
        WHERE
          id = $1
      ;`,
      values: [results.rows[0].id],
    });
    throw error;
  }

  return { confirmationSent: true };
}

async function confirm(token) {
  validator.uuid(token);

  const results = await database.query({
    text: `
      UPDATE
        newsletter_subscriptions
      SET
        confirmed_at = COALESCE(confirmed_at, timezone('utc', now())),
        updated_at = timezone('utc', now())
      WHERE
        token = $1
        AND unsubscribed_at IS NULL
        AND (
          confirmed_at IS NOT NULL
          OR confirmation_sent_at >= timezone('utc', now()) - make_interval(days => $2)
        )
      RETURNING
        *
    ;`,
    values: [token, CONFIRMATION_EXPIRATION_DAYS],
  });

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "O link de confirmação não é válido ou expirou.",
      action: "Peça a inscrição de novo para receber outro link.",
    });
  }

  return results.rows[0];
}

async function unsubscribe(token) {
  validator.uuid(token);

  const results = await database.query({
    text: `
      UPDATE
        newsletter_subscriptions
      SET
        unsubscribed_at = COALESCE(unsubscribed_at, timezone('utc', now())),
        updated_at = timezone('utc', now())
      WHERE
        token = $1
      RETURNING
        *
    ;`,
    values: [token],
  });

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "O link para sair da newsletter não é válido.",
      action: "Use o link que veio no último e-mail da newsletter.",
    });
  }

  return results.rows[0];
}

async function findActiveSubscribers() {
  const results = await database.query({
    text: `
      SELECT
        id,
        email,
        token
      FROM
        newsletter_subscriptions
      WHERE
        confirmed_at IS NOT NULL
        AND unsubscribed_at IS NULL
      ORDER BY
        confirmed_at ASC
    ;`,
  });

  return results.rows;
}

// Publicações dos últimos dias, na ordem de Relevantes.
async function buildEdition() {
  const cutoff = Date.now() - EDITION_DAYS * 24 * 60 * 60 * 1000;
  const published = await content.findPublished({
    strategy: "relevant",
    perPage: EDITION_CANDIDATES,
  });

  return published.contents
    .filter((item) => new Date(item.published_at).getTime() >= cutoff)
    .slice(0, EDITION_MAX_CONTENTS);
}

async function previewEdition() {
  const [contents, subscribers] = await Promise.all([
    buildEdition(),
    findActiveSubscribers(),
  ]);

  return {
    recipients: subscribers.length,
    contents,
  };
}

async function sendEdition() {
  await ensureNoRecentEdition();

  const contents = await buildEdition();

  if (contents.length === 0) {
    throw new ValidationError({
      message: `Não há publicações dos últimos ${EDITION_DAYS} dias para enviar.`,
      action: "Espere novas publicações antes de enviar a newsletter.",
    });
  }

  const subscribers = await findActiveSubscribers();

  if (subscribers.length === 0) {
    throw new ValidationError({
      message: "Ninguém confirmou a inscrição na newsletter ainda.",
      action: "Divulgue a página da newsletter antes de enviar.",
    });
  }

  let sent = 0;
  let failed = 0;

  for (const subscriber of subscribers) {
    try {
      await sendEditionEmail(subscriber, contents);
      sent++;
    } catch (error) {
      failed++;
      console.error("[newsletter] falha ao enviar edição", {
        name: error?.name,
        message: error?.message,
        subscriptionId: subscriber.id,
      });
    }
  }

  return {
    recipients: subscribers.length,
    sent,
    failed,
    contents,
  };
}

async function ensureNoRecentEdition() {
  const results = await database.query({
    text: `
      SELECT
        1
      FROM
        events
      WHERE
        type = 'send:newsletter'
        AND created_at >= timezone('utc', now()) - make_interval(mins => $1)
      LIMIT 1
    ;`,
    values: [EDITION_MIN_INTERVAL_MINUTES],
  });

  if (results.rowCount > 0) {
    throw new ValidationError({
      message: "Uma edição da newsletter foi enviada há menos de uma hora.",
      action: "Espere um pouco antes de enviar de novo.",
    });
  }
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : value;
}

function confirmationUrl(token) {
  return `${webserver.origin}/newsletter/confirmar/${token}`;
}

function unsubscribeUrl(token) {
  return `${webserver.origin}/newsletter/sair/${token}`;
}

function contentUrl(item) {
  return `${webserver.origin}/${encodeURIComponent(item.owner_username)}/${encodeURIComponent(item.slug)}`;
}

async function sendConfirmationEmail(subscription) {
  const link = confirmationUrl(subscription.token);

  await email.send({
    from: FROM,
    to: subscription.email,
    subject: "Confirme sua inscrição na newsletter do AgroTab",
    text: `Olá,

Alguém pediu para receber a newsletter do AgroTab neste endereço.

Para confirmar, abra o link abaixo (válido por ${CONFIRMATION_EXPIRATION_DAYS} dias):

${link}

Se não foi você, ignore este e-mail. Sem a confirmação, nada será enviado.

Equipe AgroTab`,
  });
}

async function sendEditionEmail(subscriber, contents) {
  const leaveLink = unsubscribeUrl(subscriber.token);
  const items = contents.map((item) => ({
    title: item.title,
    author: item.owner_username,
    url: contentUrl(item),
    excerpt: createExcerpt(item.body, 160),
  }));

  const text = `Os destaques da semana no AgroTab:

${items
  .map(
    (item, index) =>
      `${index + 1}. ${item.title} (por ${item.author})
${item.excerpt ? `${item.excerpt}\n` : ""}${item.url}`,
  )
  .join("\n\n")}

Para não receber mais a newsletter, abra:
${leaveLink}

Equipe AgroTab`;

  const html = renderEditionHtml(items, leaveLink);

  await email.send({
    from: FROM,
    to: subscriber.email,
    subject: "Destaques da semana no AgroTab",
    text,
    html,
    headers: {
      "List-Unsubscribe": `<${leaveLink}>`,
    },
  });
}

// Layout em tabelas com estilo inline: é o que Gmail e Outlook respeitam.
// Fontes e cores ficam em fallback seguro quando o cliente ignora algo.
const EDITION_COLORS = {
  background: "#0b2618",
  card: "#123b26",
  border: "#1f5c3b",
  highlight: "#f2c94c",
  text: "#ffffff",
  muted: "#c9dccf",
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

function renderEditionHtml(items, leaveLink) {
  const [highlight, ...others] = items;
  const c = EDITION_COLORS;

  const highlightBlock = `
          <tr>
            <td style="padding: 8px 0 12px; border-bottom: 2px solid ${c.text}; font-family: ${SERIF}; font-size: 30px; line-height: 1.2; font-weight: 700; color: ${c.text}; text-align: center;">
              <a href="${escapeHtml(highlight.url)}" style="color: ${c.text}; text-decoration: none;">${escapeHtml(highlight.title)}</a>
            </td>
          </tr>
          ${
            highlight.excerpt
              ? `<tr>
            <td style="padding: 16px 0 8px; font-family: ${SERIF}; font-size: 18px; line-height: 1.5; color: ${c.muted}; text-align: center;">${escapeHtml(highlight.excerpt)}</td>
          </tr>`
              : ""
          }
          <tr>
            <td style="padding: 4px 0 20px; font-family: ${SANS}; font-size: 14px; color: ${c.muted}; text-align: center;">
              por <span style="color: ${c.highlight}; text-decoration: underline;">${escapeHtml(highlight.author)}</span>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 0 32px;">
              <a href="${escapeHtml(highlight.url)}" style="display: inline-block; padding: 12px 24px; background: ${c.highlight}; color: ${c.background}; font-family: ${SANS}; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 4px;">Ler no AgroTab</a>
            </td>
          </tr>`;

  const otherBlocks = others
    .map(
      (item) => `
          <tr>
            <td style="padding: 0 0 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${c.card}; border: 1px solid ${c.border}; border-radius: 6px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <a href="${escapeHtml(item.url)}" style="font-family: ${SERIF}; font-size: 19px; line-height: 1.3; font-weight: 700; color: ${c.text}; text-decoration: none;">${escapeHtml(item.title)}</a>
                    <div style="padding-top: 4px; font-family: ${SANS}; font-size: 13px; color: ${c.highlight};">por ${escapeHtml(item.author)}</div>
                    ${item.excerpt ? `<div style="padding-top: 8px; font-family: ${SANS}; font-size: 14px; line-height: 1.5; color: ${c.muted};">${escapeHtml(item.excerpt)}</div>` : ""}
                  </td>
                </tr>
              </table>
            </td>
          </tr>`,
    )
    .join("");

  const othersSection = others.length
    ? `
          <tr>
            <td style="padding: 0 0 16px; font-family: ${SANS}; font-size: 13px; font-weight: 700; letter-spacing: 1px; color: ${c.highlight};">TAMBÉM EM ALTA NA SEMANA</td>
          </tr>${otherBlocks}`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>Destaques da semana no AgroTab</title>
</head>
<body style="margin: 0; padding: 0; background: ${c.background};">
  <div style="display: none; max-height: 0; overflow: hidden;">${escapeHtml(highlight.title)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${c.background};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 600px;">
          <tr>
            <td style="padding: 0 0 24px;">
              <span style="display: inline-block; padding: 8px 16px; background: ${c.highlight}; color: ${c.background}; font-family: ${SERIF}; font-size: 18px; font-weight: 700; letter-spacing: 1px;"><img src="${escapeHtml(`${webserver.origin}/email/logo-agrotab.png`)}" width="24" height="24" alt="AgroTab" style="display: inline-block; width: 24px; height: 24px; margin-right: 8px; border: 0; vertical-align: middle;"><span style="vertical-align: middle;">DESTAQUES DA SEMANA</span></span>
            </td>
          </tr>${highlightBlock}${othersSection}
          <tr>
            <td style="padding: 24px 0 0; border-top: 1px solid ${c.border}; font-family: ${SANS}; font-size: 12px; line-height: 1.5; color: ${c.muted}; text-align: center;">
              Você recebe este e-mail porque confirmou a inscrição na newsletter do AgroTab.<br>
              <a href="${escapeHtml(leaveLink)}" style="color: ${c.muted}; text-decoration: underline;">Sair da newsletter</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const newsletter = {
  subscribe,
  confirm,
  unsubscribe,
  previewEdition,
  sendEdition,
  renderEditionHtml,
  CONFIRMATION_RESEND_INTERVAL_MINUTES,
};

export default newsletter;
