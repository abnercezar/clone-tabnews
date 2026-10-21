import webserver from "infra/webserver.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

beforeEach(async () => {
  await orchestrator.deleteAllCommunityQuestions();
});

const HOUR = 60 * 60 * 1000;

async function getActive(sessionObject) {
  return fetch(`${webserver.origin}/api/v1/community-questions/active`, {
    headers: sessionObject
      ? { Cookie: `session_id=${sessionObject.token}` }
      : {},
  });
}

async function createVoter() {
  const createdUser = await orchestrator.createUser();
  const activatedUser = await orchestrator.activateUser(createdUser);
  const sessionObject = await orchestrator.createSession(activatedUser);
  return { user: activatedUser, session: sessionObject };
}

async function vote(question, optionIndex, sessionObject) {
  return fetch(
    `${webserver.origin}/api/v1/community-questions/${question.id}/votes`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${sessionObject.token}`,
      },
      body: JSON.stringify({ option_id: question.options[optionIndex].id }),
    },
  );
}

describe("`GET /api/v1/community-questions/active`", () => {
  test("Without any question returns 404 for the empty state", async () => {
    const response = await getActive();

    expect(response.status).toBe(404);
    const responseBody = await response.json();
    expect(responseBody.name).toBe("NotFoundError");
    expect(responseBody.message).toBe(
      "Não há uma Pergunta da Comunidade aberta no momento.",
    );
  });

  test("Ignores ended and not yet started questions", async () => {
    await orchestrator.createCommunityQuestion({
      title: "Pergunta já encerrada sobre a safra",
      startsAt: new Date(Date.now() - 48 * HOUR),
      endsAt: new Date(Date.now() - HOUR),
    });
    await orchestrator.createCommunityQuestion({
      title: "Pergunta agendada para a próxima semana",
      startsAt: new Date(Date.now() + 24 * HOUR),
    });

    const response = await getActive();

    expect(response.status).toBe(404);
  });

  test("Returns the most recently started open question", async () => {
    await orchestrator.createCommunityQuestion({
      title: "Pergunta mais antiga sobre clima",
      startsAt: new Date(Date.now() - 2 * HOUR),
    });
    const newest = await orchestrator.createCommunityQuestion({
      title: "Pergunta mais nova sobre crédito rural",
      category: "credito-rural",
      kind: "open",
    });

    const response = await getActive();

    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody.id).toBe(newest.id);
    expect(responseBody.kind).toBe("open");
    expect(responseBody.category).toBe("credito-rural");
    expect(responseBody.options).toEqual([]);
    expect(responseBody.contributions_by_category).toEqual({});
    expect(responseBody.categories).toContainEqual({
      slug: "credito-rural",
      label: "Crédito rural",
    });
  });

  describe("Results visibility (after_vote)", () => {
    test("Anonymous sees options and total, but not votes per option", async () => {
      const question = await orchestrator.createCommunityQuestion();
      const voter = await createVoter();
      await vote(question, 0, voter.session);

      const response = await getActive();
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.total_votes).toBe(1);
      expect(responseBody.results_visible).toBe(false);
      expect(responseBody.viewer_option_id).toBeNull();
      for (const option of responseBody.options) {
        expect(option.votes).toBeUndefined();
      }
    });

    test("User who has not voted does not see votes per option", async () => {
      const question = await orchestrator.createCommunityQuestion();
      const voter = await createVoter();
      const viewer = await createVoter();
      await vote(question, 1, voter.session);

      const response = await getActive(viewer.session);
      const responseBody = await response.json();

      expect(responseBody.results_visible).toBe(false);
      expect(responseBody.viewer_option_id).toBeNull();
      expect(responseBody.options[1].votes).toBeUndefined();
    });

    test("User who voted sees results and only their own vote", async () => {
      const question = await orchestrator.createCommunityQuestion();
      const first = await createVoter();
      const second = await createVoter();
      const third = await createVoter();
      await vote(question, 0, first.session);
      await vote(question, 0, second.session);
      await vote(question, 2, third.session);

      const response = await getActive(third.session);
      const responseBody = await response.json();

      expect(responseBody.results_visible).toBe(true);
      expect(responseBody.viewer_option_id).toBe(question.options[2].id);
      expect(responseBody.total_votes).toBe(3);
      expect(responseBody.options.map((option) => option.votes)).toEqual([
        2, 0, 1,
      ]);
      // Nunca expõe quem votou em quê.
      expect(JSON.stringify(responseBody)).not.toContain(first.user.id);
      expect(JSON.stringify(responseBody)).not.toContain(second.user.id);
    });
  });

  test("With `always` visibility anyone sees the results", async () => {
    const question = await orchestrator.createCommunityQuestion({
      resultsVisibility: "always",
    });
    const voter = await createVoter();
    await vote(question, 1, voter.session);

    const response = await getActive();
    const responseBody = await response.json();

    expect(responseBody.results_visible).toBe(true);
    expect(responseBody.options.map((option) => option.votes)).toEqual([
      0, 1, 0,
    ]);
  });
});
