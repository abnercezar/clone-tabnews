import webserver from "infra/webserver.js";
import database from "infra/database.js";
import { TooManyRequestsError } from "infra/errors.js";
import event from "models/event.js";
import firewall from "models/firewall";
import user from "models/user.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
  await orchestrator.deleteAllEmails();
});

describe("POST /api/v1/users [FIREWALL]", () => {
  describe("Anonymous user", () => {
    test("Blocks the third create:user from the same IP within 5s", async () => {
      process.env.FIREWALL_ENABLED = "true";
      const clientIp = "203.0.113.10";

      const user1 = await orchestrator.createUser({
        username: "fwuser1",
        email: "fwuser1@agrotab.test",
      });
      const user2 = await orchestrator.createUser({
        username: "fwuser2",
        email: "fwuser2@agrotab.test",
      });

      await event.create({
        type: "create:user",
        originatorUserId: user1.id,
        originatorIp: clientIp,
        metadata: { id: user1.id },
      });
      await event.create({
        type: "create:user",
        originatorUserId: user2.id,
        originatorIp: clientIp,
        metadata: { id: user2.id },
      });

      const middleware = firewall.canRequest("create:user");
      const request = {
        context: {
          clientIp,
          user: { features: ["create:user"] },
        },
      };

      await expect(
        middleware(request, {}, () => undefined),
      ).rejects.toBeInstanceOf(TooManyRequestsError);

      const user1After = await user.findOneById(user1.id);
      const user2After = await user.findOneById(user2.id);

      expect(user1After.features).not.toContain("create:session");
      expect(user1After.features).not.toContain("read:activation_token");
      expect(user2After.features).toEqual([]);

      const lastEvent = await orchestrator.getLastEvent();
      expect(lastEvent.type).toBe("firewall:block_users");
      expect(lastEvent.metadata.from_rule).toBe("create:user");
      expect(lastEvent.metadata.users).toEqual(
        expect.arrayContaining([user1.id, user2.id]),
      );

      const emails = await orchestrator.getEmails();
      expect(emails.length).toBeGreaterThanOrEqual(2);

      process.env.FIREWALL_ENABLED = "false";
    });

    test("Still creates users via HTTP when Next has firewall disabled", async () => {
      const response = await fetch(`${webserver.origin}/api/v1/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "fwhttpok",
          email: "fwhttpok@agrotab.test",
          password: "senha1234",
        }),
      });

      expect(response.status).toBe(201);

      const events = await database.query({
        text: `
          SELECT type, metadata->>'id' AS user_id
          FROM events
          WHERE type = 'create:user'
          ORDER BY created_at DESC
          LIMIT 1
        ;`,
      });

      expect(events.rows[0].type).toBe("create:user");
    });
  });
});
