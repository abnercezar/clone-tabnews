import webserver from "infra/webserver.js";
import database from "infra/database.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

beforeEach(async () => {
  await orchestrator.deleteAllEmails();
});

async function subscribe(emailAddress, headers = {}) {
  return fetch(`${webserver.origin}/api/v1/newsletter/subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ email: emailAddress }),
  });
}

async function findSubscription(emailAddress) {
  const results = await database.query({
    text: `SELECT * FROM newsletter_subscriptions WHERE LOWER(email) = LOWER($1);`,
    values: [emailAddress],
  });
  return results.rows[0];
}

async function confirm(token) {
  return fetch(`${webserver.origin}/api/v1/newsletter/subscriptions/${token}`, {
    method: "PATCH",
  });
}

async function leave(token) {
  return fetch(`${webserver.origin}/api/v1/newsletter/subscriptions/${token}`, {
    method: "DELETE",
  });
}

describe("Newsletter subscriptions", () => {
  describe("`POST /api/v1/newsletter/subscriptions`", () => {
    test("Anonymous visitor subscribes and receives a confirmation e-mail", async () => {
      const response = await subscribe("  Produtora.Soja@Exemplo.com ");

      expect(response.status).toBe(202);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        message:
          "Se o endereço puder receber a newsletter, enviamos um link de confirmação.",
      });

      const subscription = await findSubscription("produtora.soja@exemplo.com");
      expect(subscription.email).toBe("produtora.soja@exemplo.com");
      expect(subscription.confirmed_at).toBeNull();

      const lastEmail = await orchestrator.getLastEmail();
      expect(lastEmail.recipients[0]).toBe("<produtora.soja@exemplo.com>");
      expect(lastEmail.subject).toBe(
        "Confirme sua inscrição na newsletter do AgroTab",
      );
      expect(lastEmail.text).toContain(
        `${webserver.origin}/newsletter/confirmar/${subscription.token}`,
      );
    });

    test("Asking again within ten minutes does not resend nor reveal anything", async () => {
      await subscribe("repetido@exemplo.com");
      await orchestrator.deleteAllEmails();

      const response = await subscribe("REPETIDO@exemplo.com");

      expect(response.status).toBe(202);
      expect(await orchestrator.getEmails()).toHaveLength(0);

      const results = await database.query({
        text: `SELECT COUNT(*)::int AS count FROM newsletter_subscriptions WHERE LOWER(email) = 'repetido@exemplo.com';`,
      });
      expect(results.rows[0].count).toBe(1);
    });

    test("A confirmed subscriber asking again gets the same answer and no e-mail", async () => {
      await subscribe("confirmado@exemplo.com");
      const pending = await findSubscription("confirmado@exemplo.com");
      await confirm(pending.token);
      await orchestrator.deleteAllEmails();

      const response = await subscribe("confirmado@exemplo.com");

      expect(response.status).toBe(202);
      expect(await orchestrator.getEmails()).toHaveLength(0);
      const after = await findSubscription("confirmado@exemplo.com");
      expect(after.token).toBe(pending.token);
      expect(after.confirmed_at).not.toBeNull();
    });

    test("Rejects an invalid e-mail", async () => {
      const response = await subscribe("nao-e-email");

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ValidationError");
    });

    test("Activated user can subscribe too", async () => {
      const reader = await orchestrator.createUser({
        username: "leitornews",
        email: "leitornews@exemplo.com",
      });
      const activatedReader = await orchestrator.activateUser(reader);
      const readerSession = await orchestrator.createSession(activatedReader);

      const response = await subscribe("leitornews@exemplo.com", {
        Cookie: `session_id=${readerSession.token}`,
      });

      expect(response.status).toBe(202);
      expect(await findSubscription("leitornews@exemplo.com")).toBeDefined();
    });
  });

  describe("`PATCH` and `DELETE /api/v1/newsletter/subscriptions/[token]`", () => {
    test("Confirms with the e-mail link without exposing e-mail or token", async () => {
      await subscribe("confirmar@exemplo.com");
      const pending = await findSubscription("confirmar@exemplo.com");

      const response = await confirm(pending.token);

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.status).toBe("confirmed");
      expect(responseBody.email).toBeUndefined();
      expect(responseBody.token).toBeUndefined();

      const again = await confirm(pending.token);
      expect(again.status).toBe(200);
    });

    test("An expired confirmation link no longer works", async () => {
      await subscribe("expirou@exemplo.com");
      const pending = await findSubscription("expirou@exemplo.com");
      await database.query({
        text: `UPDATE newsletter_subscriptions SET confirmation_sent_at = timezone('utc', now()) - interval '8 days' WHERE id = $1;`,
        values: [pending.id],
      });

      const response = await confirm(pending.token);

      expect(response.status).toBe(404);
      expect((await response.json()).name).toBe("NotFoundError");
    });

    test("Leaves the list, cannot be confirmed with the same link and can come back", async () => {
      await subscribe("sair@exemplo.com");
      const pending = await findSubscription("sair@exemplo.com");
      await confirm(pending.token);

      const response = await leave(pending.token);

      expect(response.status).toBe(200);
      expect((await response.json()).status).toBe("unsubscribed");
      expect((await confirm(pending.token)).status).toBe(404);

      await database.query({
        text: `UPDATE newsletter_subscriptions SET confirmation_sent_at = timezone('utc', now()) - interval '11 minutes' WHERE id = $1;`,
        values: [pending.id],
      });
      await orchestrator.deleteAllEmails();

      await subscribe("sair@exemplo.com");
      const back = await findSubscription("sair@exemplo.com");
      expect(back.unsubscribed_at).toBeNull();
      expect(back.confirmed_at).toBeNull();
      expect(back.token).not.toBe(pending.token);
      expect(await orchestrator.getEmails()).toHaveLength(1);
    });

    test("Unknown or malformed tokens", async () => {
      const unknown = await leave("6f9f2a9e-0c1b-4a55-9c43-111111111111");
      expect(unknown.status).toBe(404);

      const malformed = await confirm("nao-e-uuid");
      expect(malformed.status).toBe(400);
    });
  });
});
