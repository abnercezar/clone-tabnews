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

    test("Nukes user, expires sessions and soft-deletes contents", async () => {
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
