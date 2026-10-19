import { TooManyRequestsError } from "infra/errors.js";
import content from "models/content.js";
import event from "models/event.js";
import firewall from "models/firewall";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("POST /api/v1/contents [FIREWALL]", () => {
  test("Blocks the third root content from the same IP within 5s", async () => {
    process.env.FIREWALL_ENABLED = "true";
    const clientIp = "203.0.113.20";

    const author = await orchestrator.createUser({
      username: "fwauthor",
      email: "fwauthor@agrotab.test",
      activate: true,
    });

    const content1 = await orchestrator.createContent({
      owner_id: author.id,
      title: "Publicação firewall 1",
      body: "Corpo longo o bastante para gerar tabcoins iniciais na publicação agro.",
    });
    const content2 = await orchestrator.createContent({
      owner_id: author.id,
      title: "Publicação firewall 2",
      body: "Outro corpo longo o bastante para gerar tabcoins iniciais na publicação.",
    });

    await event.create({
      type: "create:content:text_root",
      originatorUserId: author.id,
      originatorIp: clientIp,
      metadata: { id: content1.id, content_id: content1.id },
    });
    await event.create({
      type: "create:content:text_root",
      originatorUserId: author.id,
      originatorIp: clientIp,
      metadata: { id: content2.id, content_id: content2.id },
    });

    const middleware = firewall.canRequest("create:content:text_root");
    const request = {
      context: {
        clientIp,
        user: author,
      },
    };

    await expect(
      middleware(request, {}, () => undefined),
    ).rejects.toBeInstanceOf(TooManyRequestsError);

    const blocked1 = await content.findAllByIds([content1.id]);
    const blocked2 = await content.findAllByIds([content2.id]);

    expect(blocked1[0].status).toBe("firewall");
    expect(blocked2[0].status).toBe("firewall");

    const lastEvent = await orchestrator.getLastEvent();
    expect(lastEvent.type).toBe("firewall:block_contents:text_root");
    expect(lastEvent.metadata.contents).toEqual(
      expect.arrayContaining([content1.id, content2.id]),
    );

    process.env.FIREWALL_ENABLED = "false";
  });
});
