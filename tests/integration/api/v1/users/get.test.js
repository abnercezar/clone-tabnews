import orchestrator from "tests/orchestrator.js";
import webserver from "infra/webserver.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/users", () => {
  describe("Anonymous user", () => {
    test("Cannot list users", async () => {
      const response = await fetch(`${webserver.origin}/api/v1/users`);

      expect(response.status).toBe(403);

      const responseBody = await response.json();
      expect(responseBody.name).toBe("ForbiddenError");
    });
  });

  describe("Default user", () => {
    test("Cannot list users", async () => {
      const createdUser = await orchestrator.createUser({ activate: true });
      const sessionObject = await orchestrator.createSession(createdUser);

      const response = await fetch(`${webserver.origin}/api/v1/users`, {
        headers: {
          cookie: `session_id=${sessionObject.token}`,
        },
      });

      expect(response.status).toBe(403);
    });
  });

  describe('User with "read:user:list" feature', () => {
    test("Lists users with pagination headers", async () => {
      const moderator = await orchestrator.createUser({
        username: "modlist",
        activate: true,
      });
      await orchestrator.addFeaturesToUser(moderator, ["read:user:list"]);
      const sessionObject = await orchestrator.createSession(moderator);

      await orchestrator.createUser({ username: "listado1" });
      await orchestrator.createUser({ username: "listado2" });

      const response = await fetch(
        `${webserver.origin}/api/v1/users?page=1&per_page=2`,
        {
          headers: {
            cookie: `session_id=${sessionObject.token}`,
          },
        },
      );

      expect(response.status).toBe(200);

      const responseBody = await response.json();
      expect(responseBody).toHaveLength(2);
      expect(typeof responseBody[0].id).toBe("string");
      expect(typeof responseBody[0].username).toBe("string");
      expect(Array.isArray(responseBody[0].features)).toBe(true);
      expect(typeof responseBody[0].tabcoins).toBe("number");
      expect(typeof responseBody[0].tabcash).toBe("number");
      expect(typeof responseBody[0].created_at).toBe("string");
      expect(typeof responseBody[0].updated_at).toBe("string");
      expect(responseBody[0]).not.toHaveProperty("email");
      expect(responseBody[0]).not.toHaveProperty("password");

      expect(
        Number(response.headers.get("X-Total-Count")),
      ).toBeGreaterThanOrEqual(3);
      expect(response.headers.get("X-Page")).toBe("1");
      expect(response.headers.get("X-Per-Page")).toBe("2");
    });
  });
});
