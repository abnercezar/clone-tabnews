import webserver from "infra/webserver.js";
import database from "infra/database.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

async function createConfirmedSubscriber(emailAddress) {
  const results = await database.query({
    text: `
      INSERT INTO newsletter_subscriptions (email, confirmed_at)
      VALUES ($1, timezone('utc', now()))
      RETURNING *
    ;`,
    values: [emailAddress],
  });
  return results.rows[0];
}

let adminSessionPromise;

function createAdminSession() {
  adminSessionPromise ??= (async () => {
    const admin = await orchestrator.createUser({ username: "adminnews" });
    const activatedAdmin = await orchestrator.activateUser(admin);
    await orchestrator.addFeaturesToUser(activatedAdmin, ["send:newsletter"]);
    return orchestrator.createSession(activatedAdmin);
  })();
  return adminSessionPromise;
}

describe("`/api/v1/newsletter/editions`", () => {
  test("Anonymous and regular users cannot preview nor send", async () => {
    const anonymous = await fetch(
      `${webserver.origin}/api/v1/newsletter/editions`,
      { method: "POST" },
    );
    expect(anonymous.status).toBe(403);

    const reader = await orchestrator.createUser({ username: "leitorcomum" });
    const activatedReader = await orchestrator.activateUser(reader);
    const readerSession = await orchestrator.createSession(activatedReader);

    const regular = await fetch(
      `${webserver.origin}/api/v1/newsletter/editions`,
      { headers: { Cookie: `session_id=${readerSession.token}` } },
    );
    expect(regular.status).toBe(403);
  });

  test("Admin cannot send without publications of the week", async () => {
    const adminSession = await createAdminSession();
    await createConfirmedSubscriber("semconteudo@exemplo.com");

    const response = await fetch(
      `${webserver.origin}/api/v1/newsletter/editions`,
      {
        method: "POST",
        headers: { Cookie: `session_id=${adminSession.token}` },
      },
    );

    expect(response.status).toBe(400);
    expect((await response.json()).name).toBe("ValidationError");
  });

  test("Admin previews and sends only to confirmed, active subscribers", async () => {
    const adminSession = await createAdminSession();
    const author = await orchestrator.createUser({
      username: "autornews",
      activate: true,
    });

    const recent = await orchestrator.createContent({
      owner_id: author.id,
      title: "Como recuperei o pasto degradado",
      body: "Relato de campo <b>com</b> calagem e rotação de piquetes.",
    });
    const old = await orchestrator.createContent({
      owner_id: author.id,
      title: "Publicação de mais de uma semana",
      body: "Não deve entrar na edição.",
    });
    await database.query({
      text: `UPDATE contents SET published_at = timezone('utc', now()) - interval '10 days' WHERE id = $1;`,
      values: [old.id],
    });

    const subscriber = await createConfirmedSubscriber("assinante@exemplo.com");
    await database.query({
      text: `INSERT INTO newsletter_subscriptions (email) VALUES ('pendente@exemplo.com');`,
    });
    await database.query({
      text: `INSERT INTO newsletter_subscriptions (email, confirmed_at, unsubscribed_at) VALUES ('saiu@exemplo.com', timezone('utc', now()), timezone('utc', now()));`,
    });

    const previewResponse = await fetch(
      `${webserver.origin}/api/v1/newsletter/editions`,
      { headers: { Cookie: `session_id=${adminSession.token}` } },
    );
    expect(previewResponse.status).toBe(200);
    const preview = await previewResponse.json();
    expect(preview.recipients).toBe(2);
    expect(preview.contents.map((item) => item.id)).toEqual([recent.id]);

    await orchestrator.deleteAllEmails();

    const sendResponse = await fetch(
      `${webserver.origin}/api/v1/newsletter/editions`,
      {
        method: "POST",
        headers: { Cookie: `session_id=${adminSession.token}` },
      },
    );

    expect(sendResponse.status).toBe(201);
    const sent = await sendResponse.json();
    expect(sent.recipients).toBe(2);
    expect(sent.sent).toBe(2);
    expect(sent.failed).toBe(0);

    const emails = await orchestrator.getEmails();
    const recipients = emails.map((item) => item.recipients[0]).sort();
    expect(recipients).toEqual([
      "<assinante@exemplo.com>",
      "<semconteudo@exemplo.com>",
    ]);

    const subscriberEmail = emails.find(
      (item) => item.recipients[0] === "<assinante@exemplo.com>",
    );
    const fullText = await fetch(
      `http://${process.env.EMAIL_HTTP_HOST}:${process.env.EMAIL_HTTP_PORT}/messages/${subscriberEmail.id}.plain`,
    ).then((response) => response.text());
    const fullHtml = await fetch(
      `http://${process.env.EMAIL_HTTP_HOST}:${process.env.EMAIL_HTTP_PORT}/messages/${subscriberEmail.id}.html`,
    ).then((response) => response.text());

    expect(fullText).toContain("Como recuperei o pasto degradado");
    expect(fullText).toContain(`${webserver.origin}/autornews/${recent.slug}`);
    expect(fullText).toContain(
      `${webserver.origin}/newsletter/sair/${subscriber.token}`,
    );
    expect(fullText).not.toContain("Publicação de mais de uma semana");
    expect(fullHtml).not.toContain("<b>com</b>");

    const lastEvent = await orchestrator.getLastEvent();
    expect(lastEvent.type).toBe("send:newsletter");
    expect(lastEvent.metadata.content_ids).toEqual([recent.id]);

    const again = await fetch(
      `${webserver.origin}/api/v1/newsletter/editions`,
      {
        method: "POST",
        headers: { Cookie: `session_id=${adminSession.token}` },
      },
    );
    expect(again.status).toBe(400);
  });
});
