import orchestrator from "tests/orchestrator.js";
import webserver from "infra/webserver.js";
import database from "infra/database.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("DELETE /api/v1/users/[username]", () => {
  describe("Anonymous user", () => {
    test("Cannot nuke another user", async () => {
      const targetUser = await orchestrator.createUser();

      const response = await fetch(
        `${webserver.origin}/api/v1/users/${targetUser.username}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ban_type: "nuke" }),
        },
      );

      expect(response.status).toBe(403);
    });
  });

  describe("Default user", () => {
    test("Cannot nuke another user", async () => {
      const actor = await orchestrator.createUser({ activate: true });
      const sessionObject = await orchestrator.createSession(actor);
      const targetUser = await orchestrator.createUser();

      const response = await fetch(
        `${webserver.origin}/api/v1/users/${targetUser.username}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({ ban_type: "nuke" }),
        },
      );

      expect(response.status).toBe(403);
    });
  });

  describe('User with "ban:user" feature', () => {
    test("Requires ban_type", async () => {
      const moderator = await orchestrator.createUser({ activate: true });
      await orchestrator.addFeaturesToUser(moderator, ["ban:user"]);
      const sessionObject = await orchestrator.createSession(moderator);
      const targetUser = await orchestrator.createUser();

      const response = await fetch(
        `${webserver.origin}/api/v1/users/${targetUser.username}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({}),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ValidationError");
    });

    test("Nukes user, expires sessions, soft-deletes contents and undoes ratings", async () => {
      const moderator = await orchestrator.createUser({
        username: "modnuke",
        activate: true,
      });
      await orchestrator.addFeaturesToUser(moderator, ["ban:user"]);
      const sessionObject = await orchestrator.createSession(moderator);

      const targetUser = await orchestrator.createUser({
        username: "alvonuke",
        activate: true,
      });
      const targetSession = await orchestrator.createSession(targetUser);
      const publishedContent = await orchestrator.createContent({
        owner_id: targetUser.id,
        title: "Conteúdo a ser removido",
        body: "Corpo do conteúdo banido.",
      });

      const contentAuthor = await orchestrator.createUser({
        username: "autorvotado",
        activate: true,
      });
      const ratedContent = await orchestrator.createContent({
        owner_id: contentAuthor.id,
        title: "Conteúdo votado pelo nuked",
        body: "Conteudo relevante sobre manejo integrado de pragas no milho safrinha brasileiro.",
      });

      // Originator distinto do userId para o grant inicial não ser
      // desfeito pelo undoAllRatingOperations (originator_id = userId).
      await orchestrator.createBalance({
        balanceType: "user:tabcoin",
        recipientId: targetUser.id,
        amount: 10,
        originatorId: moderator.id,
      });

      const voteSession = await orchestrator.createSession(targetUser);
      const voteResponse = await fetch(
        `${webserver.origin}/api/v1/contents/${contentAuthor.username}/${ratedContent.slug}/tabcoins`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${voteSession.token}`,
          },
          body: JSON.stringify({ transaction_type: "credit" }),
        },
      );
      expect(voteResponse.status).toBe(201);

      const balancesBeforeNuke = await database.query({
        text: `
          SELECT
            get_user_current_tabcoins($1) AS author_tabcoins,
            get_content_current_tabcoins($2) AS content_tabcoins,
            get_user_current_tabcoins($3) AS voter_tabcoins,
            get_user_current_tabcash($3) AS voter_tabcash
        ;`,
        values: [contentAuthor.id, ratedContent.id, targetUser.id],
      });
      // Prestígio inicial de autor sem histórico = 0; conteúdo recebe +1;
      // o voto adiciona +1 ao autor e ao conteúdo.
      expect(Number(balancesBeforeNuke.rows[0].author_tabcoins)).toBe(1);
      expect(Number(balancesBeforeNuke.rows[0].content_tabcoins)).toBe(2);
      expect(Number(balancesBeforeNuke.rows[0].voter_tabcoins)).toBe(8);
      expect(Number(balancesBeforeNuke.rows[0].voter_tabcash)).toBe(1);

      const response = await fetch(
        `${webserver.origin}/api/v1/users/${targetUser.username}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({ ban_type: "nuke" }),
        },
      );

      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody.username).toBe(targetUser.username);
      expect(responseBody.features).toEqual(["nuked"]);
      expect(responseBody).not.toHaveProperty("email");
      expect(responseBody).not.toHaveProperty("password");

      const sessions = await database.query({
        text: `
          SELECT
            *
          FROM
            sessions
          WHERE
            id = $1
        ;`,
        values: [targetSession.id],
      });
      expect(new Date(sessions.rows[0].expires_at) < new Date()).toBe(true);

      const contents = await database.query({
        text: `
          SELECT
            status
          FROM
            contents
          WHERE
            id = $1
        ;`,
        values: [publishedContent.id],
      });
      expect(contents.rows[0].status).toBe("deleted");

      const balancesAfterNuke = await database.query({
        text: `
          SELECT
            get_user_current_tabcoins($1) AS author_tabcoins,
            get_content_current_tabcoins($2) AS content_tabcoins,
            get_user_current_tabcoins($3) AS voter_tabcoins,
            get_user_current_tabcash($3) AS voter_tabcash
        ;`,
        values: [contentAuthor.id, ratedContent.id, targetUser.id],
      });
      // Undo do voto remove o +1 do rating; o +1 inicial do conteúdo permanece.
      expect(Number(balancesAfterNuke.rows[0].author_tabcoins)).toBe(0);
      expect(Number(balancesAfterNuke.rows[0].content_tabcoins)).toBe(1);
      expect(Number(balancesAfterNuke.rows[0].voter_tabcoins)).toBe(10);
      expect(Number(balancesAfterNuke.rows[0].voter_tabcash)).toBe(0);

      const events = await database.query({
        text: `
          SELECT
            type,
            metadata
          FROM
            events
          WHERE
            type = 'ban:user'
          ORDER BY
            created_at DESC
          LIMIT
            1
        ;`,
      });
      expect(events.rows[0].metadata.ban_type).toBe("nuke");
      expect(events.rows[0].metadata.user_id).toBe(targetUser.id);
    });

    test("Rejects nuking an already nuked user", async () => {
      const moderator = await orchestrator.createUser({ activate: true });
      await orchestrator.addFeaturesToUser(moderator, ["ban:user"]);
      const sessionObject = await orchestrator.createSession(moderator);

      const targetUser = await orchestrator.createUser({ activate: true });

      await fetch(`${webserver.origin}/api/v1/users/${targetUser.username}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({ ban_type: "nuke" }),
      });

      const response = await fetch(
        `${webserver.origin}/api/v1/users/${targetUser.username}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({ ban_type: "nuke" }),
        },
      );

      expect(response.status).toBe(422);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("UnprocessableEntityError");
    });
  });
});
