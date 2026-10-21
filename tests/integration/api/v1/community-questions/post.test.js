import webserver from "infra/webserver.js";
import authorization from "models/authorization.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

async function createAdminSession() {
  const createdUser = await orchestrator.createUser();
  const activatedUser = await orchestrator.activateUser(createdUser);
  await orchestrator.addFeaturesToUser(activatedUser, [
    "create:community_question",
  ]);
  return orchestrator.createSession(activatedUser);
}

async function postQuestion(body, sessionObject) {
  const headers = { "Content-Type": "application/json" };
  if (sessionObject) {
    headers.Cookie = `session_id=${sessionObject.token}`;
  }
  return fetch(`${webserver.origin}/api/v1/community-questions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

const validPoll = {
  title: "Qual etapa da safra mais te ensinou neste ano?",
  description: "Pense no que você faria diferente.",
  category: "lavoura",
  kind: "poll",
  options: ["Plantio", "Manejo de pragas", "Colheita"],
};

describe("`POST /api/v1/community-questions`", () => {
  describe("Anonymous user", () => {
    test("Cannot create a question", async () => {
      const response = await postQuestion(validPoll);

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ForbiddenError");
    });
  });

  describe("Activated user without admin feature", () => {
    test("Cannot create a question", async () => {
      const createdUser = await orchestrator.createUser();
      const activatedUser = await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(activatedUser);

      const response = await postQuestion(validPoll, sessionObject);

      expect(response.status).toBe(403);
    });
  });

  describe("Admin user", () => {
    test("Creates a poll question with ordered options and logs an event", async () => {
      const sessionObject = await createAdminSession();

      const response = await postQuestion(validPoll, sessionObject);

      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody.title).toBe(validPoll.title);
      expect(responseBody.description).toBe(validPoll.description);
      expect(responseBody.category).toBe("lavoura");
      expect(responseBody.kind).toBe("poll");
      expect(responseBody.results_visibility).toBe("after_vote");
      expect(responseBody.options.map((option) => option.label)).toEqual([
        "Plantio",
        "Manejo de pragas",
        "Colheita",
      ]);
      expect(responseBody.options.map((option) => option.position)).toEqual([
        1, 2, 3,
      ]);
      expect(responseBody.total_votes).toBe(0);
      expect(responseBody.owner_id).toBeUndefined();
      const periodMs =
        Date.parse(responseBody.ends_at) - Date.parse(responseBody.starts_at);
      expect(periodMs).toBe(7 * 24 * 60 * 60 * 1000);

      const lastEvent = await orchestrator.getLastEvent();
      expect(lastEvent.type).toBe("create:community_question");
      expect(lastEvent.metadata.id).toBe(responseBody.id);
    });

    test("Creates an open question without options", async () => {
      const sessionObject = await createAdminSession();

      const response = await postQuestion(
        {
          title: "Como você negociou o preço do bezerro neste ano?",
          category: "pecuaria",
          kind: "open",
        },
        sessionObject,
      );

      expect(response.status).toBe(201);
      const responseBody = await response.json();
      expect(responseBody.kind).toBe("open");
      expect(responseBody.options).toEqual([]);
      expect(responseBody.description).toBeNull();
    });

    test.each([
      ["without title", { ...validPoll, title: "" }],
      ["with unknown category", { ...validPoll, category: "soja" }],
      ["with unknown kind", { ...validPoll, kind: "quiz" }],
      ["poll with a single option", { ...validPoll, options: ["Plantio"] }],
      [
        "poll with seven options",
        { ...validPoll, options: ["1", "2", "3", "4", "5", "6", "7"] },
      ],
      [
        "poll with repeated options",
        { ...validPoll, options: ["Plantio", "plantio "] },
      ],
      [
        "poll with an empty option",
        { ...validPoll, options: ["Plantio", " "] },
      ],
      [
        "open question with options",
        { ...validPoll, kind: "open", options: ["Sim", "Não"] },
      ],
      [
        "with invalid results visibility",
        { ...validPoll, results_visibility: "never" },
      ],
      [
        "with past end date",
        { ...validPoll, ends_at: "2000-01-01T00:00:00.000Z" },
      ],
      [
        "with description over 1000 characters",
        { ...validPoll, description: "a".repeat(1001) },
      ],
    ])("Rejects a question %s", async (_, body) => {
      const sessionObject = await createAdminSession();

      const response = await postQuestion(body, sessionObject);

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ValidationError");
    });
  });

  test("Admin feature list grants question creation", () => {
    expect(authorization.adminFeatures).toContain("create:community_question");
    expect(authorization.defaultActivatedFeatures).not.toContain(
      "create:community_question",
    );
  });
});
