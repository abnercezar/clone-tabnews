import webserver from "infra/webserver.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("Security P0 (authz / IDOR / economia / Markdown)", () => {
  describe("Authz / IDOR", () => {
    test("GET /users/[username] never returns email or password", async () => {
      const createdUser = await orchestrator.createUser({
        username: "perfilPublico",
        email: "perfilpublico@gmail.com",
        password: "senhaSecreta1",
      });

      const response = await fetch(
        `${webserver.origin}/api/v1/users/${createdUser.username}`,
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.email).toBeUndefined();
      expect(body.password).toBeUndefined();
      expect(body.username).toBe("perfilPublico");
    });

    test("GET /api/v1/user returns email and balances but never password", async () => {
      const createdUser = await orchestrator.createUser({
        username: "euMesmo",
        email: "eumesmo@gmail.com",
        password: "senhaSecreta1",
        activate: true,
      });
      const session = await orchestrator.createSession(createdUser);

      await orchestrator.createBalance({
        balanceType: "user:tabcoin",
        recipientId: createdUser.id,
        amount: 3,
      });

      const response = await fetch(`${webserver.origin}/api/v1/user`, {
        headers: { Cookie: `session_id=${session.token}` },
      });

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.email).toBe("eumesmo@gmail.com");
      expect(body.tabcoins).toBe(3);
      expect(body.password).toBeUndefined();
    });

    test("Anonymous cannot DELETE another user's content", async () => {
      const author = await orchestrator.createUser({ activate: true });
      const published = await orchestrator.createContent({
        owner_id: author.id,
        title: "Publicacao alheia",
        body: "Corpo da publicacao alheia para teste de IDOR.",
      });

      const response = await fetch(
        `${webserver.origin}/api/v1/contents/${author.username}/${published.slug}`,
        { method: "DELETE" },
      );

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.name).toBe("ForbiddenError");
    });

    test("Activated user cannot DELETE another user's content", async () => {
      const author = await orchestrator.createUser({ activate: true });
      const published = await orchestrator.createContent({
        owner_id: author.id,
        title: "Publicacao do autor",
        body: "Corpo protegido contra exclusao por terceiros.",
      });

      const intruder = await orchestrator.createUser({ activate: true });
      const session = await orchestrator.createSession(intruder);

      const response = await fetch(
        `${webserver.origin}/api/v1/contents/${author.username}/${published.slug}`,
        {
          method: "DELETE",
          headers: { Cookie: `session_id=${session.token}` },
        },
      );

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.name).toBe("ForbiddenError");
    });
  });

  describe("Economia", () => {
    test("Stored content with HTML payload does not escape filterOutput fields", async () => {
      const author = await orchestrator.createUser({ activate: true });
      const xssBody =
        '<script>alert("xss")</script><img src=x onerror=alert(1)>';
      const published = await orchestrator.createContent({
        owner_id: author.id,
        title: "Payload HTML",
        body: xssBody,
      });

      const response = await fetch(
        `${webserver.origin}/api/v1/contents/${author.username}/${published.slug}`,
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.body).toBe(xssBody);
      expect(body.password).toBeUndefined();
      expect(Object.keys(body).sort()).toEqual(
        [
          "body",
          "created_at",
          "id",
          "owner_id",
          "owner_username",
          "owner_occupation",
          "owner_state",
          "owner_founder",
          "parent_id",
          "published_at",
          "slug",
          "status",
          "tags",
          "tabcoins",
          "tabcoins_credit",
          "tabcoins_debit",
          "title",
          "type",
          "updated_at",
        ].sort(),
      );
    });
  });
});
