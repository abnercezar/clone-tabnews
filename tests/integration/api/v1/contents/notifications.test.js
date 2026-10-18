import webserver from "infra/webserver.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

beforeEach(async () => {
  await orchestrator.deleteAllEmails();
});

async function createActivatedSession(userOverrides = {}) {
  const createdUser = await orchestrator.createUser({
    activate: true,
    ...userOverrides,
  });
  const session = await orchestrator.createSession(createdUser);
  return { user: createdUser, session };
}

async function postContent(sessionToken, body) {
  return fetch(`${webserver.origin}/api/v1/contents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `session_id=${sessionToken}`,
    },
    body: JSON.stringify(body),
  });
}

describe("Content interaction e-mail notifications", () => {
  test("Comment on another user's post notifies the post author", async () => {
    const { user: author, session: authorSession } =
      await createActivatedSession({
        username: "autorNotif",
        email: "autor.notif@agrotab.test",
      });
    const postResponse = await postContent(authorSession.token, {
      title: "Manejo de pragas na soja",
      body: "Como monitorar a lavoura na safra.",
    });
    expect(postResponse.status).toBe(201);
    const post = await postResponse.json();

    await orchestrator.deleteAllEmails();

    const { user: commenter, session: commenterSession } =
      await createActivatedSession({
        username: "leitorNotif",
        email: "leitor.notif@agrotab.test",
      });

    const commentResponse = await postContent(commenterSession.token, {
      parent_id: post.id,
      body: "Qual cultivar você está usando nesta safra?",
    });
    expect(commentResponse.status).toBe(201);
    const comment = await commentResponse.json();

    const lastEmail = await orchestrator.getLastEmail();
    expect(lastEmail).not.toBeNull();
    expect(lastEmail.recipients[0]).toBe("<autor.notif@agrotab.test>");
    expect(lastEmail.subject).toContain("leitorNotif");
    expect(lastEmail.subject).toMatch(/comentou/i);
    expect(lastEmail.text).toContain("leitorNotif");
    expect(lastEmail.text).toContain("Manejo de pragas na soja");
    expect(lastEmail.text).toContain("Qual cultivar você está usando");
    expect(lastEmail.text).toContain(
      `/conteudos/${author.username}/${post.slug}#comentario-${comment.id}`,
    );
    expect(lastEmail.text).not.toContain(commenter.email);
    expect(lastEmail.html).toContain("Ver comentário");
  });

  test("SMTP failure in notification is swallowed and does not throw", async () => {
    const email = (await import("infra/email.js")).default;
    const notification = (await import("models/notification.js")).default;

    const author = await orchestrator.createUser({
      activate: true,
      username: "autorSmtpFail",
      email: "autor.smtp.fail@agrotab.test",
    });
    const post = await orchestrator.createContent({
      owner_id: author.id,
      title: "Post com SMTP falho",
      body: "Base.",
    });
    const commenter = await orchestrator.createUser({
      activate: true,
      username: "leitorSmtpFail",
      email: "leitor.smtp.fail@agrotab.test",
    });
    const comment = await orchestrator.createContent({
      owner_id: commenter.id,
      parent_id: post.id,
      body: "Comentario mesmo com SMTP fora.",
    });

    const sendSpy = jest
      .spyOn(email, "send")
      .mockRejectedValueOnce(new Error("smtp indisponivel"));

    try {
      const result = await notification.notifyParentContentAuthor({
        newContent: comment,
        actorUsername: commenter.username,
      });
      expect(result).toEqual({ sent: false, reason: "send_failed" });
      expect(sendSpy).toHaveBeenCalled();
    } finally {
      sendSpy.mockRestore();
    }
  });

  test("Reply to a comment notifies the comment author, not the post author", async () => {
    const { session: authorSession } = await createActivatedSession({
      username: "donoPost",
      email: "dono.post@agrotab.test",
    });
    const postResponse = await postContent(authorSession.token, {
      title: "Irrigacao no algodao",
      body: "Turnos de rega na entressafra.",
    });
    const post = await postResponse.json();

    const { session: commenterSession } = await createActivatedSession({
      username: "donoComentario",
      email: "dono.comentario@agrotab.test",
    });
    const commentResponse = await postContent(commenterSession.token, {
      parent_id: post.id,
      body: "Vale a pena sensor de umidade?",
    });
    const comment = await commentResponse.json();

    await orchestrator.deleteAllEmails();

    const { session: replierSession } = await createActivatedSession({
      username: "quemResponde",
      email: "quem.responde@agrotab.test",
    });
    const replyResponse = await postContent(replierSession.token, {
      parent_id: comment.id,
      body: "Sim, principalmente em solo arenoso.",
    });
    expect(replyResponse.status).toBe(201);
    const reply = await replyResponse.json();

    const emails = await orchestrator.getEmails();
    expect(emails).toHaveLength(1);

    const lastEmail = await orchestrator.getLastEmail();
    expect(lastEmail.recipients[0]).toBe("<dono.comentario@agrotab.test>");
    expect(lastEmail.subject).toMatch(/respondeu/i);
    expect(lastEmail.text).toContain("quemResponde");
    expect(lastEmail.text).toContain("Irrigacao no algodao");
    expect(lastEmail.text).toContain(
      `/conteudos/donoPost/${post.slug}#comentario-${reply.id}`,
    );
    expect(lastEmail.recipients.join("")).not.toContain("dono.post@");
  });

  test("Author does not receive e-mail for commenting on own post", async () => {
    const { session } = await createActivatedSession({
      username: "autoComent",
      email: "auto.coment@agrotab.test",
    });
    const postResponse = await postContent(session.token, {
      title: "Meu post",
      body: "Conteudo proprio.",
    });
    const post = await postResponse.json();
    await orchestrator.deleteAllEmails();

    const commentResponse = await postContent(session.token, {
      parent_id: post.id,
      body: "Comentario no meu proprio post.",
    });
    expect(commentResponse.status).toBe(201);

    const emails = await orchestrator.getEmails();
    expect(emails).toHaveLength(0);
  });

  test("Author does not receive e-mail for replying to own comment", async () => {
    const { session: authorSession } = await createActivatedSession({
      username: "autorThread",
      email: "autor.thread@agrotab.test",
    });
    const postResponse = await postContent(authorSession.token, {
      title: "Post da thread",
      body: "Base da conversa.",
    });
    const post = await postResponse.json();

    const { session: commenterSession } = await createActivatedSession({
      username: "comentarista",
      email: "comentarista@agrotab.test",
    });
    const commentResponse = await postContent(commenterSession.token, {
      parent_id: post.id,
      body: "Comentario inicial.",
    });
    const comment = await commentResponse.json();
    await orchestrator.deleteAllEmails();

    const replyResponse = await postContent(commenterSession.token, {
      parent_id: comment.id,
      body: "Eu mesmo respondendo ao meu comentario.",
    });
    expect(replyResponse.status).toBe(201);

    const emails = await orchestrator.getEmails();
    expect(emails).toHaveLength(0);
  });

  test("Root publication does not send interaction e-mail", async () => {
    const { session } = await createActivatedSession({
      username: "soPublica",
      email: "so.publica@agrotab.test",
    });
    await orchestrator.deleteAllEmails();

    const postResponse = await postContent(session.token, {
      title: "So publicacao",
      body: "Sem parent_id.",
    });
    expect(postResponse.status).toBe(201);

    const emails = await orchestrator.getEmails();
    expect(emails).toHaveLength(0);
  });

  test("Malicious HTML in comment body is escaped in the HTML e-mail", async () => {
    const { session: authorSession } = await createActivatedSession({
      username: "autorXss",
      email: "autor.xss@agrotab.test",
    });
    const postResponse = await postContent(authorSession.token, {
      title: "Post XSS",
      body: "Conteudo alvo.",
    });
    const post = await postResponse.json();
    await orchestrator.deleteAllEmails();

    const { session: attackerSession } = await createActivatedSession({
      username: "atacanteXss",
      email: "atacante.xss@agrotab.test",
    });
    const commentResponse = await postContent(attackerSession.token, {
      parent_id: post.id,
      body: `<script>alert("xss")</script><img src=x onerror=alert(1)>`,
    });
    expect(commentResponse.status).toBe(201);

    const lastEmail = await orchestrator.getLastEmail();
    expect(lastEmail.html).toContain("&lt;script&gt;");
    expect(lastEmail.html).toContain("&lt;img");
    // Texto escapado pode citar "onerror="; o que importa é não haver tag HTML real.
    expect(lastEmail.html).not.toMatch(/<script[\s>]/i);
    expect(lastEmail.html).not.toMatch(/<img\b/i);
  });

  test("Anonymous user cannot create a comment that would notify", async () => {
    const { session: authorSession } = await createActivatedSession({
      username: "autorAnon",
      email: "autor.anon@agrotab.test",
    });
    const postResponse = await postContent(authorSession.token, {
      title: "Post protegido",
      body: "So autenticados comentam.",
    });
    const post = await postResponse.json();
    await orchestrator.deleteAllEmails();

    const response = await fetch(`${webserver.origin}/api/v1/contents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parent_id: post.id,
        body: "Tentativa anonima.",
      }),
    });

    expect(response.status).toBe(403);
    const emails = await orchestrator.getEmails();
    expect(emails).toHaveLength(0);
  });

  test("Each distinct comment generates at most one notification e-mail", async () => {
    const { session: authorSession } = await createActivatedSession({
      username: "autorDup",
      email: "autor.dup@agrotab.test",
    });
    const postResponse = await postContent(authorSession.token, {
      title: "Post duplicidade",
      body: "Base.",
    });
    const post = await postResponse.json();
    await orchestrator.deleteAllEmails();

    const { session: commenterSession } = await createActivatedSession({
      username: "dupComent",
      email: "dup.coment@agrotab.test",
    });

    const first = await postContent(commenterSession.token, {
      parent_id: post.id,
      body: "Primeiro comentario distinto.",
    });
    expect(first.status).toBe(201);

    const second = await postContent(commenterSession.token, {
      parent_id: post.id,
      body: "Segundo comentario distinto.",
    });
    expect(second.status).toBe(201);

    const emails = await orchestrator.getEmails();
    expect(emails).toHaveLength(2);
    expect(
      emails.every((item) => item.recipients[0] === "<autor.dup@agrotab.test>"),
    ).toBe(true);
  });
});
