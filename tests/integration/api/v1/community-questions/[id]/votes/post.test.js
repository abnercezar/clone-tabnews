import webserver from "infra/webserver.js";
import database from "infra/database.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

const HOUR = 60 * 60 * 1000;

async function createVoter() {
  const createdUser = await orchestrator.createUser();
  const activatedUser = await orchestrator.activateUser(createdUser);
  const sessionObject = await orchestrator.createSession(activatedUser);
  return { user: activatedUser, session: sessionObject };
}

async function postVote(questionId, optionId, sessionObject) {
  const headers = { "Content-Type": "application/json" };
  if (sessionObject) {
    headers.Cookie = `session_id=${sessionObject.token}`;
  }
  return fetch(
    `${webserver.origin}/api/v1/community-questions/${questionId}/votes`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ option_id: optionId }),
    },
  );
}

async function countVotes(questionId) {
  const results = await database.query({
    text: "SELECT COUNT(*)::int AS count FROM community_question_votes WHERE question_id = $1;",
    values: [questionId],
  });
  return results.rows[0].count;
}

describe("`POST /api/v1/community-questions/[id]/votes`", () => {
  test("Anonymous user cannot vote", async () => {
    const question = await orchestrator.createCommunityQuestion();

    const response = await postVote(question.id, question.options[0].id);

    expect(response.status).toBe(403);
    expect(await countVotes(question.id)).toBe(0);
  });

  test("Inactive user (no vote feature) cannot vote", async () => {
    const question = await orchestrator.createCommunityQuestion();
    const createdUser = await orchestrator.createUser();
    await orchestrator.addFeaturesToUser(createdUser, ["create:session"]);
    const sessionObject = await orchestrator.createSession(createdUser);

    const response = await postVote(
      question.id,
      question.options[0].id,
      sessionObject,
    );

    expect(response.status).toBe(403);
  });

  test("Activated user votes and receives the results with their choice", async () => {
    const question = await orchestrator.createCommunityQuestion();
    const voter = await createVoter();

    const response = await postVote(
      question.id,
      question.options[1].id,
      voter.session,
    );

    expect(response.status).toBe(201);
    const responseBody = await response.json();
    expect(responseBody.viewer_option_id).toBe(question.options[1].id);
    expect(responseBody.results_visible).toBe(true);
    expect(responseBody.total_votes).toBe(1);
    expect(responseBody.options.map((option) => option.votes)).toEqual([
      0, 1, 0,
    ]);

    const lastEvent = await orchestrator.getLastEvent();
    expect(lastEvent.type).toBe("create:community_question_vote");
    expect(lastEvent.originator_user_id).toBe(voter.user.id);
    expect(lastEvent.metadata).toEqual({
      question_id: question.id,
      option_id: question.options[1].id,
    });
  });

  test("Second vote from the same user is rejected and the first one is kept", async () => {
    const question = await orchestrator.createCommunityQuestion();
    const voter = await createVoter();
    await postVote(question.id, question.options[0].id, voter.session);

    const response = await postVote(
      question.id,
      question.options[2].id,
      voter.session,
    );

    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.message).toBe("Você já votou nesta pergunta.");
    expect(await countVotes(question.id)).toBe(1);
  });

  test("Simultaneous votes from the same user count only once", async () => {
    const question = await orchestrator.createCommunityQuestion();
    const voter = await createVoter();

    const responses = await Promise.all(
      [0, 1, 2, 0].map((index) =>
        postVote(question.id, question.options[index].id, voter.session),
      ),
    );
    const statuses = responses.map((response) => response.status).sort();

    expect(statuses).toEqual([201, 400, 400, 400]);
    expect(await countVotes(question.id)).toBe(1);
  });

  test("Rejects an option from another question", async () => {
    const question = await orchestrator.createCommunityQuestion();
    const otherQuestion = await orchestrator.createCommunityQuestion({
      title: "Outra pergunta sobre manejo de pastagem",
    });
    const voter = await createVoter();

    const response = await postVote(
      question.id,
      otherQuestion.options[0].id,
      voter.session,
    );

    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.message).toBe(
      "A alternativa escolhida não pertence a esta pergunta.",
    );
  });

  test("Rejects a missing option", async () => {
    const question = await orchestrator.createCommunityQuestion();
    const voter = await createVoter();

    const response = await postVote(question.id, undefined, voter.session);

    expect(response.status).toBe(400);
  });

  test("Rejects a vote on an open question", async () => {
    const question = await orchestrator.createCommunityQuestion({
      kind: "open",
      title: "Conte uma decisão de gestão que mudou sua fazenda",
    });
    const voter = await createVoter();

    const response = await postVote(
      question.id,
      "8a9f0c35-2d5d-4f25-9d0f-6d6d3b1d2a11",
      voter.session,
    );

    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.message).toBe("Esta pergunta não tem enquete.");
  });

  test("Rejects a vote on an ended question", async () => {
    const question = await orchestrator.createCommunityQuestion({
      startsAt: new Date(Date.now() - 48 * HOUR),
      endsAt: new Date(Date.now() - HOUR),
    });
    const voter = await createVoter();

    const response = await postVote(
      question.id,
      question.options[0].id,
      voter.session,
    );

    expect(response.status).toBe(404);
    expect(await countVotes(question.id)).toBe(0);
  });

  test("Returns 404 for a non-existent question and 400 for a malformed id", async () => {
    const voter = await createVoter();

    const notFound = await postVote(
      "8a9f0c35-2d5d-4f25-9d0f-6d6d3b1d2a11",
      "8a9f0c35-2d5d-4f25-9d0f-6d6d3b1d2a12",
      voter.session,
    );
    expect(notFound.status).toBe(404);

    const malformed = await postVote("abc", "def", voter.session);
    expect(malformed.status).toBe(400);
  });
});
