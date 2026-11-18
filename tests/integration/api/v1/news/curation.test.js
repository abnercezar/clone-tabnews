import webserver from "infra/webserver.js";
import database from "infra/database.js";
import news from "models/news.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

let adminSessionPromise;

function createAdminSession() {
  adminSessionPromise ??= (async () => {
    const admin = await orchestrator.createUser({ username: "curadora" });
    const activatedAdmin = await orchestrator.activateUser(admin);
    await orchestrator.addFeaturesToUser(activatedAdmin, ["review:news"]);
    return orchestrator.createSession(activatedAdmin);
  })();
  return adminSessionPromise;
}

function candidate(overrides = {}) {
  return {
    source_name: "Portal Exemplo",
    url: `https://exemplo.com.br/${Math.random().toString(36).slice(2)}`,
    title: "Conab eleva estimativa da safra de soja",
    description: "A estimativa de produção de soja subiu e o preço reagiu.",
    published_at: new Date(),
    ...overrides,
  };
}

// Sem ANTHROPIC_API_KEY a curadoria roda no modo sem IA, que é determinístico.
async function queueWithoutAi(items) {
  const savedKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const { curated, mode } = await news.curate(items);
    expect(mode).toBe("sem_ia");
    return await news.enqueue(curated);
  } finally {
    if (savedKey !== undefined) process.env.ANTHROPIC_API_KEY = savedKey;
  }
}

describe("Curadoria de notícias", () => {
  test("Cron route refuses calls without the secret", async () => {
    const response = await fetch(`${webserver.origin}/api/v1/news/curation`);
    expect(response.status).toBe(403);

    const wrong = await fetch(`${webserver.origin}/api/v1/news/curation`, {
      headers: { Authorization: "Bearer segredo-errado" },
    });
    expect(wrong.status).toBe(403);
  });

  test("Anonymous and regular users cannot run, list nor review", async () => {
    const anonymousRun = await fetch(
      `${webserver.origin}/api/v1/news/curation`,
      { method: "POST" },
    );
    expect(anonymousRun.status).toBe(403);

    const reader = await orchestrator.createUser({ activate: true });
    const readerSession = await orchestrator.createSession(reader);
    const headers = { Cookie: `session_id=${readerSession.token}` };

    const list = await fetch(`${webserver.origin}/api/v1/news`, { headers });
    expect(list.status).toBe(403);

    const [queued] = await queueWithoutAi([candidate()]);
    const review = await fetch(`${webserver.origin}/api/v1/news/${queued.id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish" }),
    });
    expect(review.status).toBe(403);
  });

  test("Curation without AI guesses tags and skips repeated links", async () => {
    const item = candidate({
      title: "Ferrugem asiática atinge lavouras de soja no MT",
      description: "Produtores relatam focos da doença.",
    });

    const created = await queueWithoutAi([item]);
    expect(created).toHaveLength(1);
    expect(created[0].status).toBe("pending");
    expect(created[0].ai_curated).toBe(false);
    expect(created[0].tags).toEqual(
      expect.arrayContaining(["soja", "pragas-e-doencas"]),
    );

    const again = await news.collect({ feeds: [] });
    expect(again.candidates).toEqual([]);

    const duplicated = await queueWithoutAi([item]);
    expect(duplicated).toHaveLength(0);
  });

  test("Admin lists pending news and publishes with edits", async () => {
    const adminSession = await createAdminSession();
    const headers = {
      Cookie: `session_id=${adminSession.token}`,
      "Content-Type": "application/json",
    };
    const [queued] = await queueWithoutAi([candidate()]);

    const list = await fetch(`${webserver.origin}/api/v1/news`, { headers });
    expect(list.status).toBe(200);
    const listBody = await list.json();
    expect(listBody.map((item) => item.id)).toContain(queued.id);
    expect(listBody[0]).not.toHaveProperty("reviewed_by");

    const publish = await fetch(
      `${webserver.origin}/api/v1/news/${queued.id}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          action: "publish",
          title: "Safra de soja deve crescer, diz Conab",
          summary: "Resumo revisado pela moderação.",
          discussion_question: "Como está a sua lavoura?",
          tags: ["soja", "mercado"],
        }),
      },
    );
    expect(publish.status).toBe(200);
    const published = await publish.json();
    expect(published.status).toBe("published");
    expect(published.title).toBe("Safra de soja deve crescer, diz Conab");
    expect(published.content.owner_username).toBe("curadora");

    const page = await fetch(
      `${webserver.origin}/api/v1/contents/${published.content.owner_username}/${published.content.slug}`,
    );
    expect(page.status).toBe(200);
    const contentBody = await page.json();
    expect(contentBody.title).toBe("Safra de soja deve crescer, diz Conab");
    expect(contentBody.body).toContain("Resumo revisado pela moderação.");
    expect(contentBody.body).toContain(
      "**Para debater:** Como está a sua lavoura?",
    );
    expect(contentBody.body).toContain(
      `Fonte: [Portal Exemplo](${queued.source_url})`,
    );

    const twice = await fetch(`${webserver.origin}/api/v1/news/${queued.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ action: "publish" }),
    });
    expect(twice.status).toBe(400);
  });

  test("Admin rejects news and invalid actions are refused", async () => {
    const adminSession = await createAdminSession();
    const headers = {
      Cookie: `session_id=${adminSession.token}`,
      "Content-Type": "application/json",
    };
    const [queued] = await queueWithoutAi([candidate()]);

    const invalid = await fetch(
      `${webserver.origin}/api/v1/news/${queued.id}`,
      { method: "PATCH", headers, body: JSON.stringify({ action: "apagar" }) },
    );
    expect(invalid.status).toBe(400);

    const reject = await fetch(`${webserver.origin}/api/v1/news/${queued.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ action: "reject" }),
    });
    expect(reject.status).toBe(200);
    expect((await reject.json()).status).toBe("rejected");

    const stored = await database.query({
      text: "SELECT content_id FROM news_items WHERE id = $1",
      values: [queued.id],
    });
    expect(stored.rows[0].content_id).toBeNull();

    const missing = await fetch(
      `${webserver.origin}/api/v1/news/00000000-0000-4000-8000-000000000000`,
      { method: "PATCH", headers, body: JSON.stringify({ action: "reject" }) },
    );
    expect(missing.status).toBe(404);
  });
});
