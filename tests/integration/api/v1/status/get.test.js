import webserver from "infra/webserver.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("`GET /api/v1/status`", () => {
  describe("Anonymous user", () => {
    test("Retrieves public health status (database + webserver)", async () => {
      const response = await fetch(`${webserver.origin}/api/v1/status`);
      expect(response.status).toBe(200);
      const responseBody = await response.json();

      const parsedUpdatedAt = new Date(responseBody.updated_at).toISOString();
      expect(responseBody.updated_at).toEqual(parsedUpdatedAt);

      expect(responseBody.dependencies.database.status).toBe("healthy");
      expect(
        responseBody.dependencies.database.max_connections,
      ).toBeGreaterThan(0);
      expect(
        responseBody.dependencies.database.opened_connections,
      ).toBeGreaterThanOrEqual(1);
      expect(responseBody.dependencies.database.version).toMatch(/^16/);
      expect(
        responseBody.dependencies.database.latency.first_query,
      ).toBeGreaterThanOrEqual(0);
      expect(
        responseBody.dependencies.database.latency.second_query,
      ).toBeGreaterThanOrEqual(0);
      expect(
        responseBody.dependencies.database.latency.third_query,
      ).toBeGreaterThanOrEqual(0);

      expect(responseBody.dependencies.webserver.status).toBe("healthy");
      expect(responseBody.dependencies.webserver.provider).toBeTruthy();
      expect(responseBody.dependencies.webserver.version).toMatch(/^v/);
      expect(responseBody).not.toHaveProperty("database");
    });
  });

  describe("Default user", () => {
    test("Retrieves the same public health payload", async () => {
      const createdUser = await orchestrator.createUser();
      const activatedUser = await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(activatedUser);

      const response = await fetch(`${webserver.origin}/api/v1/status`, {
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.dependencies.database.status).toBe("healthy");
      expect(responseBody.dependencies.database.version).toMatch(/^16/);
      expect(responseBody.dependencies.webserver.status).toBe("healthy");
      expect(responseBody).not.toHaveProperty("database");
    });
  });

  describe("Privileged user", () => {
    test("With `read:status:all` also receives legacy `database` mirror", async () => {
      const privilegedUser = await orchestrator.createUser();
      const activatedPrivilegedUser =
        await orchestrator.activateUser(privilegedUser);
      await orchestrator.addFeaturesToUser(privilegedUser, ["read:status:all"]);
      const privilegedUserSession = await orchestrator.createSession(
        activatedPrivilegedUser,
      );

      const response = await fetch(`${webserver.origin}/api/v1/status`, {
        headers: {
          Cookie: `session_id=${privilegedUserSession.token}`,
        },
      });

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(responseBody.dependencies.database.version).toMatch(/^16/);
      expect(responseBody.database.version).toMatch(/^16/);
      expect(responseBody.database.max_connections).toBeGreaterThan(0);
      expect(responseBody.database.opened_connections).toBeGreaterThanOrEqual(
        1,
      );
    });
  });
});
