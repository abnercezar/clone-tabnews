import webserver from "infra/webserver.js";
import orchestrator from "tests/orchestrator.js";

const RELEVANT_BODY =
  "Conteudo relevante sobre manejo integrado de pragas no milho safrinha brasileiro.";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/contents/[username]/[slug]/tabcoins", () => {
  describe("Anonymous user", () => {
    test("Cannot vote", async () => {
      const author = await orchestrator.createUser({ activate: true });
      const published = await orchestrator.createContent({
        owner_id: author.id,
        title: "Conteudo do autor",
        body: RELEVANT_BODY,
      });

      const response = await fetch(
        `${webserver.origin}/api/v1/contents/${author.username}/${published.slug}/tabcoins`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transaction_type: "credit" }),
        },
      );

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ForbiddenError");
    });
  });

  describe("Activated user", () => {
    test("Rejects invalid transaction_type", async () => {
      const author = await orchestrator.createUser({ activate: true });
      const published = await orchestrator.createContent({
        owner_id: author.id,
        title: "Conteudo",
        body: RELEVANT_BODY,
      });

      const voter = await orchestrator.createUser({ activate: true });
      const session = await orchestrator.createSession(voter);

      const response = await fetch(
        `${webserver.origin}/api/v1/contents/${author.username}/${published.slug}/tabcoins`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ transaction_type: "invalid" }),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ValidationError");
    });

    test("Cannot vote on own content", async () => {
      const author = await orchestrator.createUser({ activate: true });
      const published = await orchestrator.createContent({
        owner_id: author.id,
        title: "Meu conteudo",
        body: RELEVANT_BODY,
      });
      const session = await orchestrator.createSession(author);

      await orchestrator.createBalance({
        balanceType: "user:tabcoin",
        recipientId: author.id,
        amount: 10,
      });

      const response = await fetch(
        `${webserver.origin}/api/v1/contents/${author.username}/${published.slug}/tabcoins`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ transaction_type: "credit" }),
        },
      );

      expect(response.status).toBe(422);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("UnprocessableEntityError");
    });

    test("Rejects vote without enough TabCoins", async () => {
      const author = await orchestrator.createUser({ activate: true });
      const published = await orchestrator.createContent({
        owner_id: author.id,
        title: "Conteudo",
        body: "Corpo curto.",
      });

      const voter = await orchestrator.createUser({ activate: true });
      const session = await orchestrator.createSession(voter);

      const response = await fetch(
        `${webserver.origin}/api/v1/contents/${author.username}/${published.slug}/tabcoins`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ transaction_type: "credit" }),
        },
      );

      expect(response.status).toBe(422);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("UnprocessableEntityError");
      expect(responseBody.action).toMatch(/2 TabCoins/);
    });

    test("Credits content and converts 2 TabCoins into 1 TabCash", async () => {
      const author = await orchestrator.createUser({ activate: true });
      const published = await orchestrator.createContent({
        owner_id: author.id,
        title: "Raiz",
        body: RELEVANT_BODY,
      });

      const voter = await orchestrator.createUser({ activate: true });
      const session = await orchestrator.createSession(voter);

      await orchestrator.createBalance({
        balanceType: "user:tabcoin",
        recipientId: voter.id,
        amount: 2,
      });

      const response = await fetch(
        `${webserver.origin}/api/v1/contents/${author.username}/${published.slug}/tabcoins`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ transaction_type: "credit" }),
        },
      );

      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        tabcoins: 2,
        tabcoins_credit: 1,
        tabcoins_debit: 0,
      });

      const userResponse = await fetch(`${webserver.origin}/api/v1/user`, {
        headers: { Cookie: `session_id=${session.token}` },
      });
      expect(userResponse.status).toBe(200);
      const userBody = await userResponse.json();
      expect(userBody.tabcoins).toBe(0);
      expect(userBody.tabcash).toBe(1);
    });

    test("Debits content with transaction_type debit", async () => {
      const author = await orchestrator.createUser({ activate: true });
      const published = await orchestrator.createContent({
        owner_id: author.id,
        title: "Raiz",
        body: RELEVANT_BODY,
      });

      const voter = await orchestrator.createUser({ activate: true });
      const session = await orchestrator.createSession(voter);

      await orchestrator.createBalance({
        balanceType: "user:tabcoin",
        recipientId: voter.id,
        amount: 2,
      });

      const response = await fetch(
        `${webserver.origin}/api/v1/contents/${author.username}/${published.slug}/tabcoins`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ transaction_type: "debit" }),
        },
      );

      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        tabcoins: 0,
        tabcoins_credit: 0,
        tabcoins_debit: -1,
      });
    });

    test("Blocks more than 3 votes on the same content within 72 hours", async () => {
      const author = await orchestrator.createUser({ activate: true });
      const published = await orchestrator.createContent({
        owner_id: author.id,
        title: "Raiz",
        body: "Corpo curto.",
      });

      const voter = await orchestrator.createUser({ activate: true });
      const session = await orchestrator.createSession(voter);

      await orchestrator.createBalance({
        balanceType: "user:tabcoin",
        recipientId: voter.id,
        amount: 8,
      });

      for (let round = 0; round < 3; round++) {
        const response = await fetch(
          `${webserver.origin}/api/v1/contents/${author.username}/${published.slug}/tabcoins`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Cookie: `session_id=${session.token}`,
            },
            body: JSON.stringify({ transaction_type: "credit" }),
          },
        );
        expect(response.status).toBe(201);
      }

      const blocked = await fetch(
        `${webserver.origin}/api/v1/contents/${author.username}/${published.slug}/tabcoins`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${session.token}`,
          },
          body: JSON.stringify({ transaction_type: "credit" }),
        },
      );

      expect(blocked.status).toBe(400);
      const blockedBody = await blocked.json();
      expect(blockedBody.name).toBe("ValidationError");
      expect(blockedBody.message).toMatch(/muitas vezes/);
    });

    test("Creates sponsored content spending 100 TabCash", async () => {
      const author = await orchestrator.createUser({ activate: true });
      const session = await orchestrator.createSession(author);

      await orchestrator.createBalance({
        balanceType: "user:tabcash",
        recipientId: author.id,
        amount: 100,
      });

      const response = await fetch(`${webserver.origin}/api/v1/contents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${session.token}`,
        },
        body: JSON.stringify({
          title: "Patrocinio no feed",
          body: RELEVANT_BODY,
          type: "ad",
        }),
      });

      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody.type).toBe("ad");
      expect(responseBody.tabcoins).toBe(1);

      const userResponse = await fetch(`${webserver.origin}/api/v1/user`, {
        headers: { Cookie: `session_id=${session.token}` },
      });
      const userBody = await userResponse.json();
      expect(userBody.tabcash).toBe(0);
    });
  });
});
