import webserver from "infra/webserver.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/analytics/*", () => {
  test("Returns daily series for users, contents, replies and votes", async () => {
    const author = await orchestrator.createUser({ activate: true });
    await orchestrator.createContent({
      owner_id: author.id,
      title: "Publicacao analytics",
      body: "Corpo da publicacao para serie diaria.",
    });

    const endpoints = [
      "/api/v1/analytics/users-created",
      "/api/v1/analytics/root-content-published",
      "/api/v1/analytics/child-content-published",
      "/api/v1/analytics/votes-taken",
    ];

    for (const path of endpoints) {
      const response = await fetch(`${webserver.origin}${path}`);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(50);
      expect(body[0]).toHaveProperty("date");
    }
  });
});
