import email from "infra/email.js";
import webserver from "infra/webserver.js";
import content from "models/content.js";
import user from "models/user.js";

const FROM = "Agrotab <contato@agrotab.com.br>";
const SNIPPET_MAX = 140;

/**
 * Notifica o autor do conteúdo pai após um comentário ou resposta.
 * Best-effort: erros de SMTP são registrados e não propagados.
 * Destinatário vem só do banco (owner do parent_id), nunca do body da request.
 */
async function notifyParentContentAuthor({ newContent, actorUsername }) {
  if (!newContent?.parent_id) {
    return { sent: false, reason: "not_a_reply" };
  }

  try {
    const parent = await content.findPublishedById(newContent.parent_id);

    if (parent.owner_id === newContent.owner_id) {
      return { sent: false, reason: "self" };
    }

    const recipient = await user.findOneById(parent.owner_id);
    if (recipient.notify_replies === false) {
      return { sent: false, reason: "opted_out" };
    }
    if (!isValidRecipientEmail(recipient?.email)) {
      return { sent: false, reason: "invalid_email" };
    }

    const isReplyToComment = Boolean(parent.parent_id);
    const root = isReplyToComment
      ? await content.findPublishedById(parent.parent_id)
      : parent;
    const rootOwner = await user.findOneById(root.owner_id);

    const conversationUrl = buildConversationUrl({
      rootUsername: rootOwner.username,
      rootSlug: root.slug,
      commentId: newContent.id,
    });

    const snippet = truncateSnippet(newContent.body);
    const mail = isReplyToComment
      ? buildReplyMail({
          recipientUsername: recipient.username,
          actorUsername,
          rootTitle: root.title,
          snippet,
          conversationUrl,
        })
      : buildCommentMail({
          recipientUsername: recipient.username,
          actorUsername,
          rootTitle: root.title,
          snippet,
          conversationUrl,
        });

    await email.send({
      from: FROM,
      to: recipient.email,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    return {
      sent: true,
      kind: isReplyToComment ? "reply" : "comment",
      recipientId: recipient.id,
    };
  } catch (error) {
    console.error("[notification] falha ao enviar e-mail", {
      name: error?.name,
      message: error?.message,
      contentId: newContent?.id,
      parentId: newContent?.parent_id,
    });
    return { sent: false, reason: "send_failed" };
  }
}

function isValidRecipientEmail(value) {
  if (typeof value !== "string") {
    return false;
  }
  const emailAddress = value.trim();
  return emailAddress.includes("@") && emailAddress.length >= 3;
}

function buildConversationUrl({ rootUsername, rootSlug, commentId }) {
  const path = `/${encodeURIComponent(rootUsername)}/${encodeURIComponent(rootSlug)}`;
  const hash = commentId ? `#comentario-${commentId}` : "#comentarios";
  return `${webserver.origin}${path}${hash}`;
}

// Onde a pessoa desliga os avisos de resposta.
function settingsUrl() {
  return `${webserver.origin}/perfil#avisos`;
}

function truncateSnippet(body) {
  const normalized = String(body || "")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length <= SNIPPET_MAX) {
    return normalized;
  }
  return `${normalized.slice(0, SNIPPET_MAX - 1)}…`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildCommentMail({
  recipientUsername,
  actorUsername,
  rootTitle,
  snippet,
  conversationUrl,
}) {
  const subject = `${actorUsername} comentou na sua publicação no AgroTab`;
  const text = `${recipientUsername},

${actorUsername} comentou na sua publicação "${rootTitle}".

Trecho:
${snippet}

Abra a conversa:
${conversationUrl}

Atenciosamente,
Equipe AgroTab

Para não receber mais estes avisos, desligue em ${settingsUrl()}`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.5; color: #1f2328; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p>Olá, <strong>${escapeHtml(recipientUsername)}</strong>,</p>
  <p><strong>${escapeHtml(actorUsername)}</strong> comentou na sua publicação <strong>${escapeHtml(rootTitle)}</strong>.</p>
  <blockquote style="margin: 16px 0; padding: 12px 16px; border-left: 3px solid #1a7f37; background: #f6f8fa;">${escapeHtml(snippet)}</blockquote>
  <p><a href="${escapeHtml(conversationUrl)}" style="display: inline-block; padding: 10px 16px; background: #1a7f37; color: #fff; text-decoration: none; border-radius: 6px;">Ver comentário</a></p>
  <p style="font-size: 12px; color: #656d76;">AgroTab — comunidade do agronegócio brasileiro · <a href="${escapeHtml(settingsUrl())}" style="color: #656d76;">Desligar estes avisos</a></p>
</body>
</html>`;

  return { subject, text, html };
}

function buildReplyMail({
  recipientUsername,
  actorUsername,
  rootTitle,
  snippet,
  conversationUrl,
}) {
  const subject = `${actorUsername} respondeu ao seu comentário no AgroTab`;
  const text = `${recipientUsername},

${actorUsername} respondeu ao seu comentário na publicação "${rootTitle}".

Trecho:
${snippet}

Abra a conversa:
${conversationUrl}

Atenciosamente,
Equipe AgroTab

Para não receber mais estes avisos, desligue em ${settingsUrl()}`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.5; color: #1f2328; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p>Olá, <strong>${escapeHtml(recipientUsername)}</strong>,</p>
  <p><strong>${escapeHtml(actorUsername)}</strong> respondeu ao seu comentário na publicação <strong>${escapeHtml(rootTitle)}</strong>.</p>
  <blockquote style="margin: 16px 0; padding: 12px 16px; border-left: 3px solid #1a7f37; background: #f6f8fa;">${escapeHtml(snippet)}</blockquote>
  <p><a href="${escapeHtml(conversationUrl)}" style="display: inline-block; padding: 10px 16px; background: #1a7f37; color: #fff; text-decoration: none; border-radius: 6px;">Ver resposta</a></p>
  <p style="font-size: 12px; color: #656d76;">AgroTab — comunidade do agronegócio brasileiro · <a href="${escapeHtml(settingsUrl())}" style="color: #656d76;">Desligar estes avisos</a></p>
</body>
</html>`;

  return { subject, text, html };
}

/**
 * Avisa o usuário que a conta foi desativada pelo firewall de abuso.
 * Best-effort: erros de SMTP não propagam.
 */
async function sendUserDisabled({ eventId, user: targetUser }) {
  try {
    if (!isValidRecipientEmail(targetUser?.email)) {
      return { sent: false, reason: "invalid_email" };
    }

    const subject = "Sua conta foi desativada";
    const text = `${targetUser.username},

Identificamos a criação de muitos usuários em um curto período, então a sua conta foi desativada.

Identificador do evento: ${eventId}

Se acredita que isso foi um engano, contate o suporte do AgroTab.

Atenciosamente,
Equipe AgroTab`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #1f2328; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p>Olá, <strong>${escapeHtml(targetUser.username)}</strong>,</p>
  <p>Identificamos a criação de muitos usuários em um curto período, então a sua conta foi desativada.</p>
  <p>Identificador do evento: <code>${escapeHtml(eventId)}</code></p>
  <p style="font-size: 12px; color: #656d76;">AgroTab — comunidade do agronegócio brasileiro</p>
</body>
</html>`;

    await email.send({
      from: FROM,
      to: targetUser.email,
      subject,
      text,
      html,
    });

    return { sent: true };
  } catch (error) {
    console.error("[notification] falha ao enviar e-mail de firewall (user)", {
      name: error?.name,
      message: error?.message,
      eventId,
      userId: targetUser?.id,
    });
    return { sent: false, reason: "send_failed" };
  }
}

/**
 * Avisa autores (exceto o originador) que conteúdos foram removidos pelo firewall.
 * Best-effort: erros de SMTP não propagam.
 */
async function sendContentDeletedToUser({ contents, eventId, userId }) {
  try {
    const recipient = await user.findOneById(userId);
    if (!isValidRecipientEmail(recipient?.email)) {
      return { sent: false, reason: "invalid_email" };
    }

    const titles = (contents || [])
      .map((row) => row.title || "(comentário)")
      .slice(0, 10);
    const listText = titles.map((title) => `- ${title}`).join("\n");

    const subject = "Conteúdo removido pelo AgroTab";
    const text = `${recipient.username},

Identificamos atividade abusiva em um curto período e removemos publicações recentes relacionadas.

${listText}

Identificador do evento: ${eventId}

Atenciosamente,
Equipe AgroTab`;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #1f2328; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p>Olá, <strong>${escapeHtml(recipient.username)}</strong>,</p>
  <p>Identificamos atividade abusiva em um curto período e removemos publicações recentes relacionadas.</p>
  <ul>${titles.map((title) => `<li>${escapeHtml(title)}</li>`).join("")}</ul>
  <p>Identificador do evento: <code>${escapeHtml(eventId)}</code></p>
  <p style="font-size: 12px; color: #656d76;">AgroTab — comunidade do agronegócio brasileiro</p>
</body>
</html>`;

    await email.send({
      from: FROM,
      to: recipient.email,
      subject,
      text,
      html,
    });

    return { sent: true };
  } catch (error) {
    console.error(
      "[notification] falha ao enviar e-mail de firewall (content)",
      {
        name: error?.name,
        message: error?.message,
        eventId,
        userId,
      },
    );
    return { sent: false, reason: "send_failed" };
  }
}

const notification = {
  notifyParentContentAuthor,
  sendUserDisabled,
  sendContentDeletedToUser,
  // Exportados para testes unitários
  truncateSnippet,
  escapeHtml,
  buildConversationUrl,
};

export default notification;
