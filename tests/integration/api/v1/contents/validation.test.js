import webserver from "infra/webserver.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("Server-side content validation", () => {
  let sessionToken;

  beforeAll(async () => {
    const createdUser = await orchestrator.createUser({
      username: "validacaoautor",
    });
    const activatedUser = await orchestrator.activateUser(createdUser);
    const sessionObject = await orchestrator.createSession(activatedUser);
    sessionToken = sessionObject.token;
  });

  test("Rejects a title made only of spaces", async () => {
    const response = await postContent({ title: "   ", body: "Corpo válido." });

    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.name).toBe("ValidationError");
  });

  test("Rejects a title above 256 characters", async () => {
    const response = await postContent({
      title: "a".repeat(257),
      body: "Corpo válido.",
    });

    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.name).toBe("ValidationError");
  });

  test("Rejects a body made only of spaces", async () => {
    const response = await postContent({ title: "Título válido", body: "   " });

    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.name).toBe("ValidationError");
  });

  test("Rejects a body above 20000 characters", async () => {
    const response = await postContent({
      title: "Título válido",
      body: "a".repeat(20001),
    });

    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.name).toBe("ValidationError");
  });

  test("Rejects a comment whose parent does not exist", async () => {
    const response = await postContent({
      parent_id: "3ee5a2a0-6c3b-4f2b-9b9a-0f1a2b3c4d5e",
      body: "Comentário órfão.",
    });

    expect(response.status).toBe(404);
    const responseBody = await response.json();
    expect(responseBody.name).toBe("NotFoundError");
  });

  test("Rejects a comment with a malformed parent id", async () => {
    const response = await postContent({
      parent_id: "nao-e-uuid",
      body: "Comentário inválido.",
    });

    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.name).toBe("ValidationError");
  });

  test("Rejects an invalid page size", async () => {
    const response = await fetch(
      `${webserver.origin}/api/v1/contents?per_page=101`,
    );

    expect(response.status).toBe(400);
    const responseBody = await response.json();
    expect(responseBody.name).toBe("ValidationError");
  });

  async function postContent(body) {
    return fetch(`${webserver.origin}/api/v1/contents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${sessionToken}`,
      },
      body: JSON.stringify(body),
    });
  }
});
