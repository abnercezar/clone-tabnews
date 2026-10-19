import webserver from "infra/webserver.js";
import orchestrator from "tests/orchestrator.js";
import user from "models/user.js";

const RELEVANT_BODY =
  "texto relevante sobre manejo solo adubo irrigacao colheita plantio";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("`DELETE /api/v1/contents/[username]/[slug]` prestige reverse", () => {
  test("Reverts author TabCoins when deleting published content with prestige", async () => {
    const author = await orchestrator.createUser({
      username: "autorprestige",
      activate: true,
    });
    await orchestrator.createPrestige(author.id);

    const sessionObject = await orchestrator.createSession(author);

    const createResponse = await fetch(`${webserver.origin}/api/v1/contents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${sessionObject.token}`,
      },
      body: JSON.stringify({
        title: "Publicacao com prestigio",
        body: RELEVANT_BODY,
      }),
    });

    expect(createResponse.status).toBe(201);
    const created = await createResponse.json();
    expect(created.tabcoins).toBeGreaterThanOrEqual(1);

    const authorBefore = await user.findOneById(author.id, {
      withBalances: true,
    });
    expect(authorBefore.tabcoins).toBeGreaterThan(0);

    const deleteResponse = await fetch(
      `${webserver.origin}/api/v1/contents/${author.username}/${created.slug}`,
      {
        method: "DELETE",
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      },
    );

    expect(deleteResponse.status).toBe(200);

    const authorAfter = await user.findOneById(author.id, {
      withBalances: true,
    });
    // Após excluir, o crédito de prestige/criação daquele conteúdo some do autor.
    expect(authorAfter.tabcoins).toBeLessThan(authorBefore.tabcoins);
  });

  test("Reverts rating TabCoins earned on deleted content", async () => {
    const author = await orchestrator.createUser({
      username: "autorvotado",
      activate: true,
    });
    const published = await orchestrator.createContent({
      owner_id: author.id,
      title: "Conteudo votado",
      body: RELEVANT_BODY,
    });

    const voter = await orchestrator.createUser({ activate: true });
    await orchestrator.createBalance({
      balanceType: "user:tabcoin",
      recipientId: voter.id,
      amount: 2,
    });
    const voterSession = await orchestrator.createSession(voter);

    const voteResponse = await fetch(
      `${webserver.origin}/api/v1/contents/${author.username}/${published.slug}/tabcoins`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${voterSession.token}`,
        },
        body: JSON.stringify({ transaction_type: "credit" }),
      },
    );
    expect(voteResponse.status).toBe(201);

    const authorAfterVote = await user.findOneById(author.id, {
      withBalances: true,
    });
    expect(authorAfterVote.tabcoins).toBe(1);

    const authorSession = await orchestrator.createSession(author);
    const deleteResponse = await fetch(
      `${webserver.origin}/api/v1/contents/${author.username}/${published.slug}`,
      {
        method: "DELETE",
        headers: {
          Cookie: `session_id=${authorSession.token}`,
        },
      },
    );
    expect(deleteResponse.status).toBe(200);

    const authorAfterDelete = await user.findOneById(author.id, {
      withBalances: true,
    });
    expect(authorAfterDelete.tabcoins).toBe(0);
  });
});
