import webserver from "infra/webserver.js";
import orchestrator from "tests/orchestrator.js";

const ANGICO_TITLE = "Florada de angico e manejo das caixas";
const ANGICO_BODY =
  "Florada forte no sertão: dividi colônias populosas e reforcei a alimentação proteica no manejo das caixas.";
const SOJA_TITLE = "Preço da soja na safra";
const SOJA_BODY =
  "O preço da soja na safra atual segue firme no mercado interno brasileiro.";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("Use case: home, search and vote", () => {
  let author;
  let authorSession;
  let angico;
  let scoreAfterPublish;

  test("Visitor opens the home and the feed is empty", async () => {
    const homeResponse = await fetch(`${webserver.origin}/`, {
      cache: "no-store",
    });

    expect(homeResponse.status).toBe(200);
    const html = await homeResponse.text();
    expect(html).toContain('id="publicacoes"');
    expect(html).toContain("Publicações relevantes");
    expect(html).not.toContain(ANGICO_TITLE);

    const feedResponse = await fetch(`${webserver.origin}/api/v1/contents`);
    expect(feedResponse.status).toBe(200);
    expect(await feedResponse.json()).toEqual([]);
  });

  test("Visitor cannot publish", async () => {
    const response = await fetch(`${webserver.origin}/api/v1/contents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: ANGICO_TITLE,
        body: ANGICO_BODY,
      }),
    });

    expect(response.status).toBe(403);
  });

  test("Author publishes and the home renders the post", async () => {
    const createdUser = await orchestrator.createUser({
      username: "apicultorjornada",
    });
    author = await orchestrator.activateUser(createdUser);
    authorSession = await orchestrator.createSession(author);

    const publishResponse = await fetch(`${webserver.origin}/api/v1/contents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${authorSession.token}`,
      },
      body: JSON.stringify({
        title: ANGICO_TITLE,
        body: ANGICO_BODY,
      }),
    });

    expect(publishResponse.status).toBe(201);
    angico = await publishResponse.json();
    expect(angico.slug).toBe("florada-de-angico-e-manejo-das-caixas");
    expect(angico.owner_username).toBe("apicultorjornada");
    scoreAfterPublish = angico.tabcoins;

    const sojaResponse = await fetch(`${webserver.origin}/api/v1/contents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${authorSession.token}`,
      },
      body: JSON.stringify({
        title: SOJA_TITLE,
        body: SOJA_BODY,
      }),
    });
    expect(sojaResponse.status).toBe(201);

    const homeResponse = await fetch(`${webserver.origin}/`, {
      cache: "no-store",
    });
    expect(homeResponse.status).toBe(200);
    const html = await homeResponse.text();
    expect(html).toContain(ANGICO_TITLE);
    expect(html).toContain(SOJA_TITLE);
  });

  test("Search returns the matching publication and ignores a percent sign", async () => {
    const angicoResponse = await fetch(
      `${webserver.origin}/api/v1/contents?q=${encodeURIComponent("angico")}&strategy=new`,
    );
    expect(angicoResponse.status).toBe(200);
    const angicoFeed = await angicoResponse.json();
    expect(angicoFeed.map((item) => item.title)).toEqual([ANGICO_TITLE]);
    expect(angicoResponse.headers.get("X-Total-Count")).toBe("1");

    const sojaResponse = await fetch(
      `${webserver.origin}/api/v1/contents?q=${encodeURIComponent("soja")}&strategy=new`,
    );
    expect(sojaResponse.status).toBe(200);
    const sojaFeed = await sojaResponse.json();
    expect(sojaFeed.map((item) => item.title)).toEqual([SOJA_TITLE]);

    const blankResponse = await fetch(
      `${webserver.origin}/api/v1/contents?q=${encodeURIComponent("   ")}`,
    );
    expect(blankResponse.status).toBe(200);
    expect(blankResponse.headers.get("X-Total-Count")).toBe("2");

    const wildcardResponse = await fetch(
      `${webserver.origin}/api/v1/contents?q=${encodeURIComponent("%")}`,
    );
    expect(wildcardResponse.status).toBe(200);
    expect(await wildcardResponse.json()).toEqual([]);
  });

  test("The author cannot vote on the post", async () => {
    const response = await fetch(
      `${webserver.origin}/api/v1/contents/${author.username}/${angico.slug}/tabcoins`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${authorSession.token}`,
        },
        body: JSON.stringify({ transaction_type: "credit" }),
      },
    );

    expect(response.status).toBe(422);
    const responseBody = await response.json();
    expect(responseBody.name).toBe("UnprocessableEntityError");
    expect(responseBody.message).toBe(
      "Você não pode realizar esta operação em conteúdos de sua própria autoria.",
    );
  });

  test("A neighbor credits the post and the feed shows the new score", async () => {
    const neighbor = await orchestrator.activateUser(
      await orchestrator.createUser({ username: "vizinhojornada" }),
    );
    const neighborSession = await orchestrator.createSession(neighbor);
    await orchestrator.createBalance({
      balanceType: "user:tabcoin",
      recipientId: neighbor.id,
      amount: 2,
    });

    const voteResponse = await fetch(
      `${webserver.origin}/api/v1/contents/${author.username}/${angico.slug}/tabcoins`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${neighborSession.token}`,
        },
        body: JSON.stringify({ transaction_type: "credit" }),
      },
    );

    expect(voteResponse.status).toBe(201);
    const voteBody = await voteResponse.json();
    expect(voteBody.tabcoins).toBe(scoreAfterPublish + 1);

    const feedResponse = await fetch(
      `${webserver.origin}/api/v1/contents?strategy=relevant`,
    );
    const feed = await feedResponse.json();
    const listed = feed.find((item) => item.id === angico.id);
    expect(listed.tabcoins).toBe(scoreAfterPublish + 1);
    expect(listed.owner_username).toBe("apicultorjornada");

    const readerResponse = await fetch(`${webserver.origin}/api/v1/user`, {
      headers: { Cookie: `session_id=${neighborSession.token}` },
    });
    const reader = await readerResponse.json();
    expect(reader.tabcoins).toBe(0);
    expect(reader.tabcash).toBe(1);

    const anonymousVote = await fetch(
      `${webserver.origin}/api/v1/contents/${author.username}/${angico.slug}/tabcoins`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_type: "credit" }),
      },
    );
    expect(anonymousVote.status).toBe(403);
  });

  test("Another neighbor debits and the post keeps the lower score", async () => {
    const critic = await orchestrator.activateUser(
      await orchestrator.createUser({ username: "criticojornada" }),
    );
    const criticSession = await orchestrator.createSession(critic);
    await orchestrator.createBalance({
      balanceType: "user:tabcoin",
      recipientId: critic.id,
      amount: 2,
    });

    const voteResponse = await fetch(
      `${webserver.origin}/api/v1/contents/${author.username}/${angico.slug}/tabcoins`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${criticSession.token}`,
        },
        body: JSON.stringify({ transaction_type: "debit" }),
      },
    );

    expect(voteResponse.status).toBe(201);
    const voteBody = await voteResponse.json();
    expect(voteBody.tabcoins).toBe(scoreAfterPublish);

    const readResponse = await fetch(
      `${webserver.origin}/api/v1/contents/${author.username}/${angico.slug}`,
    );
    expect(readResponse.status).toBe(200);
    const readBody = await readResponse.json();
    expect(readBody.title).toBe(ANGICO_TITLE);
    expect(readBody.tabcoins).toBe(scoreAfterPublish);
    expect(readBody.body).toBe(ANGICO_BODY);
  });
});
