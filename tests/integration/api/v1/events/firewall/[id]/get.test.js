import webserver from "infra/webserver.js";
import event from "models/event.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("GET /api/v1/events/firewall/[id]", () => {
  test("Anonymous user cannot read firewall events", async () => {
    const response = await fetch(
      `${webserver.origin}/api/v1/events/firewall/00000000-0000-4000-8000-000000000001`,
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.name).toBe("ForbiddenError");
  });

  test("User with read:firewall sees affected users and events", async () => {
    const blocked = await orchestrator.createUser({
      username: "fwblocked",
      email: "fwblocked@agrotab.test",
    });

    const firewallEvent = await event.create({
      type: "firewall:block_users",
      originatorIp: "127.0.0.1",
      metadata: {
        from_rule: "create:user",
        users: [blocked.id],
      },
    });

    const moderator = await orchestrator.createUser({
      username: "fwreader",
      email: "fwreader@agrotab.test",
      activate: true,
    });
    await orchestrator.addFeaturesToUser(moderator, ["read:firewall"]);
    const sessionObject = await orchestrator.createSession(moderator);

    const response = await fetch(
      `${webserver.origin}/api/v1/events/firewall/${firewallEvent.id}`,
      {
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      },
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.affected.users).toHaveLength(1);
    expect(body.affected.users[0].id).toBe(blocked.id);
    expect(body.affected.users[0].email).toBeUndefined();
    expect(body.events).toHaveLength(1);
    expect(body.events[0].id).toBe(firewallEvent.id);
    expect(body.events[0].originator_ip).toBeUndefined();
    expect(body.events[0].type).toBe("firewall:block_users");
  });
});
