import webserver from "infra/webserver.js";
import database from "infra/database.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("`/api/v1/sponsorships`", () => {
  test("Anonymous visitor reads an empty list and cannot publish", async () => {
    const listResponse = await fetch(`${webserver.origin}/api/v1/sponsorships`);
    expect(listResponse.status).toBe(200);
    expect(await listResponse.json()).toEqual([]);

    const response = await fetch(`${webserver.origin}/api/v1/sponsorships`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Boletim da soja",
        url: "https://www.embrapa.br",
      }),
    });

    expect(response.status).toBe(403);
  });

  test("Activated user publishes a link and it becomes the latest sponsorship", async () => {
    const user = await orchestrator.createUser({ username: "patrocinador" });
    const activatedUser = await orchestrator.activateUser(user);
    const sessionObject = await orchestrator.createSession(activatedUser);

    const response = await fetch(`${webserver.origin}/api/v1/sponsorships`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${sessionObject.token}`,
      },
      body: JSON.stringify({
        title: "Boletim da soja",
        url: "https://www.embrapa.br/soja",
      }),
    });

    expect(response.status).toBe(201);
    const sponsorship = await response.json();
    expect(sponsorship.owner_username).toBe("patrocinador");
    expect(sponsorship.title).toBe("Boletim da soja");
    expect(sponsorship.url).toBe("https://www.embrapa.br/soja");
    expect(sponsorship.status).toBe("published");

    const listResponse = await fetch(`${webserver.origin}/api/v1/sponsorships`);
    const list = await listResponse.json();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(sponsorship.id);

    const events = await database.query({
      text: `
        SELECT
          type
        FROM
          events
        WHERE
          metadata->>'sponsorship_id' = $1
      ;`,
      values: [sponsorship.id],
    });
    expect(events.rows.map((row) => row.type)).toEqual(["create:sponsorship"]);
  });

  test("Rejects a link that is not http", async () => {
    const user = await orchestrator.createUser({ username: "patrocinador2" });
    const activatedUser = await orchestrator.activateUser(user);
    const sessionObject = await orchestrator.createSession(activatedUser);

    const response = await fetch(`${webserver.origin}/api/v1/sponsorships`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${sessionObject.token}`,
      },
      body: JSON.stringify({
        title: "Link inválido",
        url: "javascript:alert(1)",
      }),
    });

    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.name).toBe("ValidationError");
  });

  test("Only the owner can remove a sponsorship", async () => {
    const owner = await orchestrator.createUser({ username: "donopatro" });
    const activatedOwner = await orchestrator.activateUser(owner);
    const ownerSession = await orchestrator.createSession(activatedOwner);

    const created = await fetch(`${webserver.origin}/api/v1/sponsorships`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${ownerSession.token}`,
      },
      body: JSON.stringify({
        title: "Clima na lavoura",
        url: "https://www.embrapa.br/clima",
      }),
    });
    const sponsorship = await created.json();

    const other = await orchestrator.createUser({ username: "outropatro" });
    const activatedOther = await orchestrator.activateUser(other);
    const otherSession = await orchestrator.createSession(activatedOther);

    const denied = await fetch(
      `${webserver.origin}/api/v1/sponsorships/${sponsorship.id}`,
      {
        method: "DELETE",
        headers: { Cookie: `session_id=${otherSession.token}` },
      },
    );
    expect(denied.status).toBe(403);

    const removed = await fetch(
      `${webserver.origin}/api/v1/sponsorships/${sponsorship.id}`,
      {
        method: "DELETE",
        headers: { Cookie: `session_id=${ownerSession.token}` },
      },
    );
    expect(removed.status).toBe(200);

    const list = await fetch(`${webserver.origin}/api/v1/sponsorships`);
    const ids = (await list.json()).map((item) => item.id);
    expect(ids).not.toContain(sponsorship.id);

    const events = await database.query({
      text: `
        SELECT
          type
        FROM
          events
        WHERE
          metadata->>'sponsorship_id' = $1
        ORDER BY
          created_at ASC
      ;`,
      values: [sponsorship.id],
    });
    expect(events.rows.map((row) => row.type)).toEqual([
      "create:sponsorship",
      "delete:sponsorship",
    ]);
  });

  test("Shows only the most recent published sponsorship", async () => {
    const user = await orchestrator.createUser({ username: "patrocinador3" });
    const activatedUser = await orchestrator.activateUser(user);
    const sessionObject = await orchestrator.createSession(activatedUser);

    async function publish(title) {
      const response = await fetch(`${webserver.origin}/api/v1/sponsorships`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({
          title,
          url: "https://www.embrapa.br/soja",
        }),
      });
      expect(response.status).toBe(201);
      return response.json();
    }

    const older = await publish("Boletim antigo");
    const newer = await publish("Boletim novo");

    const listResponse = await fetch(`${webserver.origin}/api/v1/sponsorships`);
    const list = await listResponse.json();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(newer.id);
    expect(list[0].id).not.toBe(older.id);
  });

  test("Rejects a blank title and a missing sponsorship", async () => {
    const user = await orchestrator.createUser({ username: "patrocinador4" });
    const activatedUser = await orchestrator.activateUser(user);
    const sessionObject = await orchestrator.createSession(activatedUser);

    const blank = await fetch(`${webserver.origin}/api/v1/sponsorships`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${sessionObject.token}`,
      },
      body: JSON.stringify({
        title: "   ",
        url: "https://www.embrapa.br",
      }),
    });
    expect(blank.status).toBe(400);

    const httpLink = await fetch(`${webserver.origin}/api/v1/sponsorships`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${sessionObject.token}`,
      },
      body: JSON.stringify({
        title: "Boletim sem TLS",
        url: "http://exemplo.com/boletim",
      }),
    });
    expect(httpLink.status).toBe(201);

    const anonymousDelete = await fetch(
      `${webserver.origin}/api/v1/sponsorships/${(await httpLink.json()).id}`,
      { method: "DELETE" },
    );
    expect(anonymousDelete.status).toBe(403);

    const missing = await fetch(
      `${webserver.origin}/api/v1/sponsorships/3ee5a2a0-6c3b-4f2b-9b9a-0f1a2b3c4d5e`,
      {
        method: "DELETE",
        headers: { Cookie: `session_id=${sessionObject.token}` },
      },
    );
    expect(missing.status).toBe(404);

    const malformed = await fetch(
      `${webserver.origin}/api/v1/sponsorships/nao-e-uuid`,
      {
        method: "DELETE",
        headers: { Cookie: `session_id=${sessionObject.token}` },
      },
    );
    expect(malformed.status).toBe(400);
  });
});
