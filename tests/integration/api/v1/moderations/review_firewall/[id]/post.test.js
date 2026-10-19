import webserver from "infra/webserver.js";
import event from "models/event.js";
import user from "models/user.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/moderations/review_firewall/[id]", () => {
  test("Requires review:firewall", async () => {
    const activated = await orchestrator.createUser({
      username: "fwnoreview",
      email: "fwnoreview@agrotab.test",
      activate: true,
    });
    const sessionObject = await orchestrator.createSession(activated);

    const response = await fetch(
      `${webserver.origin}/api/v1/moderations/review_firewall/00000000-0000-4000-8000-000000000001`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({ action: "undo" }),
      },
    );

    expect(response.status).toBe(403);
  });

  test("Undo restores session features for blocked users", async () => {
    const blocked = await orchestrator.createUser({
      username: "fwundouser",
      email: "fwundouser@agrotab.test",
    });

    await user.setFeatures(blocked.id, []);

    const firewallEvent = await event.create({
      type: "firewall:block_users",
      originatorIp: "127.0.0.1",
      metadata: {
        from_rule: "create:user",
        users: [blocked.id],
      },
    });

    const moderator = await orchestrator.createUser({
      username: "fwreviewer",
      email: "fwreviewer@agrotab.test",
      activate: true,
    });
    await orchestrator.addFeaturesToUser(moderator, [
      "read:firewall",
      "review:firewall",
    ]);
    const sessionObject = await orchestrator.createSession(moderator);

    const response = await fetch(
      `${webserver.origin}/api/v1/moderations/review_firewall/${firewallEvent.id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({ action: "undo" }),
      },
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.events.map((row) => row.type)).toEqual([
      "firewall:block_users",
      "moderation:unblock_users",
    ]);
    expect(body.affected.users[0].features).toContain("read:activation_token");

    const restored = await user.findOneById(blocked.id);
    expect(restored.features).toContain("read:activation_token");
  });

  test("Confirm adds nuked to blocked users", async () => {
    const blocked = await orchestrator.createUser({
      username: "fwconfirmuser",
      email: "fwconfirmuser@agrotab.test",
    });

    await user.setFeatures(blocked.id, []);

    const firewallEvent = await event.create({
      type: "firewall:block_users",
      originatorIp: "127.0.0.1",
      metadata: {
        from_rule: "create:user",
        users: [blocked.id],
      },
    });

    const moderator = await orchestrator.createUser({
      username: "fwconfirmer",
      email: "fwconfirmer@agrotab.test",
      activate: true,
    });
    await orchestrator.addFeaturesToUser(moderator, [
      "read:firewall",
      "review:firewall",
    ]);
    const sessionObject = await orchestrator.createSession(moderator);

    const response = await fetch(
      `${webserver.origin}/api/v1/moderations/review_firewall/${firewallEvent.id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({ action: "confirm" }),
      },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.events[1].type).toBe("moderation:block_users");

    const confirmed = await user.findOneById(blocked.id);
    expect(confirmed.features).toContain("nuked");
  });
});
