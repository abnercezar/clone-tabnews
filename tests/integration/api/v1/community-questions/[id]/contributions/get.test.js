import webserver from "infra/webserver.js";
import database from "infra/database.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

const HOUR = 60 * 60 * 1000;

async function createAuthor() {
  const createdUser = await orchestrator.createUser();
  const activatedUser = await orchestrator.activateUser(createdUser);
  const sessionObject = await orchestrator.createSession(activatedUser);
  return { user: activatedUser, session: sessionObject };
}

async function postContribution(body, sessionObject) {
  const headers = { "Content-Type": "application/json" };
  if (sessionObject) {
    headers.Cookie = `session_id=${sessionObject.token}`;
  }
  return fetch(`${webserver.origin}/api/v1/contents`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function getContributions(questionId, query = "") {
  return fetch(
    `${webserver.origin}/api/v1/community-questions/${questionId}/contributions${query}`,
  );
}

async function countLinks() {
  const results = await database.query(
    "SELECT COUNT(*)::int AS count FROM community_question_contents;",
  );
  return results.rows[0].count;
}

describe("Contributions to the community question", () => {
  describe("`POST /api/v1/contents` with `community_question_id`", () => {
    test("Creates a real publication linked to the question", async () => {
      const question = await orchestrator.createCommunityQuestion({
        kind: "open",
      });
      const author = await createAuthor();

      const response = await postContribution(
        {
          title: "Antecipar a dessecação salvou meu plantio",
          body: "Na última safra dessequei 20 dias antes e o stand ficou uniforme.",
          community_question_id: question.id,
          community_question_category: "manejo",
        },
        author.session,
      );

      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody.status).toBe("published");
      expect(responseBody.parent_id).toBeNull();
      expect(responseBody.community_question_id).toBe(question.id);
      expect(responseBody.community_question_category).toBe("manejo");

      // É uma publicação comum: aparece no feed e na própria página.
      const feedResponse = await fetch(
        `${webserver.origin}/api/v1/contents?strategy=new`,
      );
      const feed = await feedResponse.json();
      expect(feed.map((item) => item.id)).toContain(responseBody.id);

      const pageResponse = await fetch(
        `${webserver.origin}/api/v1/contents/${author.user.username}/${responseBody.slug}`,
      );
      expect(pageResponse.status).toBe(200);

      const lastEvent = await orchestrator.getLastEvent();
      expect(lastEvent.type).toBe("create:content:text_root");
      expect(lastEvent.metadata.community_question_id).toBe(question.id);
    });

    test("Without `community_question_id` keeps the previous response shape", async () => {
      const author = await createAuthor();

      const response = await postContribution(
        {
          title: "Publicação comum de pecuária",
          body: "Conteúdo sem pergunta.",
        },
        author.session,
      );

      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody.community_question_id).toBeUndefined();
      expect(responseBody.community_question_category).toBeUndefined();
    });

    test("Anonymous user cannot contribute", async () => {
      const question = await orchestrator.createCommunityQuestion();
      const linksBefore = await countLinks();

      const response = await postContribution({
        title: "Tentativa anônima",
        body: "Não deveria funcionar.",
        community_question_id: question.id,
        community_question_category: "lavoura",
      });

      expect(response.status).toBe(403);
      expect(await countLinks()).toBe(linksBefore);
    });

    test.each([
      ["an invalid category", { community_question_category: "soja" }],
      ["no category", { community_question_category: undefined }],
      ["a parent_id (comment)", { parent_id: "use-parent" }],
      ["an ad type", { type: "ad" }],
      ["a malformed question id", { community_question_id: "abc" }],
    ])("Rejects a contribution with %s and saves nothing", async (_, extra) => {
      const question = await orchestrator.createCommunityQuestion();
      const author = await createAuthor();
      const parent = await orchestrator.createContent({
        owner_id: author.user.id,
        title: "Publicação para comentar",
      });
      const contentsBefore = await database.query({
        text: "SELECT COUNT(*)::int AS count FROM contents WHERE owner_id = $1;",
        values: [author.user.id],
      });

      const body = {
        title: "Contribuição inválida",
        body: "Texto do relato.",
        community_question_id: question.id,
        community_question_category: "lavoura",
        ...extra,
      };
      if (body.parent_id === "use-parent") {
        body.parent_id = parent.id;
      }

      const response = await postContribution(body, author.session);

      expect(response.status).toBe(400);
      const contentsAfter = await database.query({
        text: "SELECT COUNT(*)::int AS count FROM contents WHERE owner_id = $1;",
        values: [author.user.id],
      });
      expect(contentsAfter.rows[0].count).toBe(contentsBefore.rows[0].count);
    });

    test("Rejects a contribution to an ended question and saves nothing", async () => {
      const question = await orchestrator.createCommunityQuestion({
        startsAt: new Date(Date.now() - 48 * HOUR),
        endsAt: new Date(Date.now() - HOUR),
      });
      const author = await createAuthor();
      const linksBefore = await countLinks();

      const response = await postContribution(
        {
          title: "Relato atrasado",
          body: "Texto do relato.",
          community_question_id: question.id,
          community_question_category: "lavoura",
        },
        author.session,
      );

      expect(response.status).toBe(404);
      expect(await countLinks()).toBe(linksBefore);
    });
  });

  describe("`GET /api/v1/community-questions/[id]/contributions`", () => {
    test("Lists only published contributions of the question, newest first, with category filter", async () => {
      const question = await orchestrator.createCommunityQuestion();
      const otherQuestion = await orchestrator.createCommunityQuestion({
        title: "Outra pergunta sobre gestão da fazenda",
      });
      const author = await createAuthor();

      async function contribute(targetQuestion, title, category) {
        const response = await postContribution(
          {
            title,
            body: `Relato: ${title}`,
            community_question_id: targetQuestion.id,
            community_question_category: category,
          },
          author.session,
        );
        return response.json();
      }

      const first = await contribute(question, "Relato de clima", "clima");
      const second = await contribute(question, "Relato de custos", "custos");
      const deleted = await contribute(question, "Relato excluído", "clima");
      await contribute(otherQuestion, "Relato de outra pergunta", "gestao");

      await fetch(
        `${webserver.origin}/api/v1/contents/${author.user.username}/${deleted.slug}`,
        {
          method: "DELETE",
          headers: { Cookie: `session_id=${author.session.token}` },
        },
      );

      const response = await getContributions(question.id);
      expect(response.status).toBe(200);
      expect(response.headers.get("X-Total-Count")).toBe("2");
      const responseBody = await response.json();
      expect(responseBody.map((item) => item.id)).toEqual([
        second.id,
        first.id,
      ]);
      expect(responseBody[0]).toMatchObject({
        title: "Relato de custos",
        owner_username: author.user.username,
        community_question_category: "custos",
        children_count: 0,
      });
      expect(responseBody[0].password).toBeUndefined();
      expect(responseBody[0].email).toBeUndefined();

      const filtered = await getContributions(question.id, "?category=clima");
      const filteredBody = await filtered.json();
      expect(filteredBody.map((item) => item.id)).toEqual([first.id]);

      const activeResponse = await fetch(
        `${webserver.origin}/api/v1/community-questions/active`,
      );
      const activeBody = await activeResponse.json();
      expect(activeBody.id).toBe(otherQuestion.id);

      // Contagem por categoria ignora conteúdo excluído.
      const detail = await database.query({
        text: "SELECT category, COUNT(*)::int AS total FROM community_question_contents cqc JOIN contents c ON c.id = cqc.content_id WHERE cqc.question_id = $1 AND c.status = 'published' GROUP BY category ORDER BY category;",
        values: [question.id],
      });
      expect(detail.rows).toEqual([
        { category: "clima", total: 1 },
        { category: "custos", total: 1 },
      ]);
    });

    test("Counts comments of each contribution", async () => {
      const question = await orchestrator.createCommunityQuestion();
      const author = await createAuthor();
      const reader = await createAuthor();

      const created = await (
        await postContribution(
          {
            title: "Relato com comentário",
            body: "Texto do relato.",
            community_question_id: question.id,
            community_question_category: "lavoura",
          },
          author.session,
        )
      ).json();

      await postContribution(
        { parent_id: created.id, body: "Aconteceu igual aqui no Paraná." },
        reader.session,
      );

      const response = await getContributions(question.id);
      const responseBody = await response.json();
      expect(responseBody[0].children_count).toBe(1);
    });

    test("Returns an empty list for a question without contributions", async () => {
      const question = await orchestrator.createCommunityQuestion();

      const response = await getContributions(question.id);

      expect(response.status).toBe(200);
      expect(response.headers.get("X-Total-Count")).toBe("0");
      expect(await response.json()).toEqual([]);
    });

    test.each([
      ["an invalid category", "?category=soja", 400],
      ["an invalid page", "?page=0", 400],
    ])("Rejects %s", async (_, query, status) => {
      const question = await orchestrator.createCommunityQuestion();

      const response = await getContributions(question.id, query);

      expect(response.status).toBe(status);
    });

    test("Returns 404 for a non-existent question", async () => {
      const response = await getContributions(
        "8a9f0c35-2d5d-4f25-9d0f-6d6d3b1d2a11",
      );

      expect(response.status).toBe(404);
    });
  });
});
