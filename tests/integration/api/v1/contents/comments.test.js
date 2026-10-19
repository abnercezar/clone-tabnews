import webserver from "infra/webserver.js";
import database from "infra/database.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("Comments", () => {
  test("Creates a comment, keeps it out of the feed and lists it under the post", async () => {
    const author = await orchestrator.createUser({
      username: "autorcomentario",
    });
    const activatedAuthor = await orchestrator.activateUser(author);
    const authorSession = await orchestrator.createSession(activatedAuthor);

    const postResponse = await fetch(`${webserver.origin}/api/v1/contents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${authorSession.token}`,
      },
      body: JSON.stringify({
        title: "Plantio de soja",
        body: "Como planejar a safra.",
      }),
    });
    const post = await postResponse.json();

    const reader = await orchestrator.createUser({
      username: "leitorcomentario",
    });
    const activatedReader = await orchestrator.activateUser(reader);
    const readerSession = await orchestrator.createSession(activatedReader);

    const commentResponse = await fetch(`${webserver.origin}/api/v1/contents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${readerSession.token}`,
      },
      body: JSON.stringify({
        parent_id: post.id,
        body: "Qual a janela de plantio na sua região?",
      }),
    });

    expect(commentResponse.status).toBe(201);
    const comment = await commentResponse.json();
    expect(comment.parent_id).toBe(post.id);
    expect(comment.owner_id).toBe(activatedReader.id);
    expect(comment.first_publication).toBe(false);
    expect(comment.title).toBe("Qual a janela de plantio na sua região?");

    const feedResponse = await fetch(`${webserver.origin}/api/v1/contents`);
    const feed = await feedResponse.json();
    expect(feed.map((item) => item.id)).toEqual([post.id]);

    const childrenResponse = await fetch(
      `${webserver.origin}/api/v1/contents/autorcomentario/${post.slug}/children`,
    );
    expect(childrenResponse.status).toBe(200);
    const children = await childrenResponse.json();
    expect(children).toHaveLength(1);
    expect(children[0].id).toBe(comment.id);
    expect(children[0].owner_username).toBe("leitorcomentario");

    const events = await database.query({
      text: `
        SELECT
          type
        FROM
          events
        WHERE
          metadata->>'content_id' = $1
      ;`,
      values: [comment.id],
    });
    expect(events.rows.map((row) => row.type)).toEqual([
      "create:content:text_child",
    ]);
  });

  test("Replies to a comment and rejects a reply to that reply", async () => {
    const author = await orchestrator.createUser({ username: "autorresposta" });
    const activatedAuthor = await orchestrator.activateUser(author);
    const sessionObject = await orchestrator.createSession(activatedAuthor);

    const post = await orchestrator.createContent({
      owner_id: activatedAuthor.id,
      title: "Adubação",
      body: "Como adubar o milho.",
    });

    const commentResponse = await fetch(`${webserver.origin}/api/v1/contents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${sessionObject.token}`,
      },
      body: JSON.stringify({
        parent_id: post.id,
        body: "Primeiro comentário.",
      }),
    });
    const comment = await commentResponse.json();

    const replyResponse = await fetch(`${webserver.origin}/api/v1/contents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${sessionObject.token}`,
      },
      body: JSON.stringify({
        parent_id: comment.id,
        body: "Resposta ao comentário.",
      }),
    });

    expect(replyResponse.status).toBe(201);
    const reply = await replyResponse.json();
    expect(reply.parent_id).toBe(comment.id);

    const feedResponse = await fetch(`${webserver.origin}/api/v1/contents`);
    const feedIds = (await feedResponse.json()).map((item) => item.id);
    expect(feedIds).not.toContain(reply.id);

    const postChildren = await fetch(
      `${webserver.origin}/api/v1/contents/autorresposta/${post.slug}/children`,
    );
    const postChildrenIds = (await postChildren.json()).map((item) => item.id);
    expect(postChildrenIds).toEqual([comment.id]);

    const replyChildren = await fetch(
      `${webserver.origin}/api/v1/contents/${comment.owner_username}/${comment.slug}/children`,
    );
    const replyChildrenIds = (await replyChildren.json()).map(
      (item) => item.id,
    );
    expect(replyChildrenIds).toEqual([reply.id]);

    const nestedResponse = await fetch(`${webserver.origin}/api/v1/contents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${sessionObject.token}`,
      },
      body: JSON.stringify({
        parent_id: reply.id,
        body: "Resposta da resposta.",
      }),
    });
    expect(nestedResponse.status).toBe(400);
    const nestedBody = await nestedResponse.json();
    expect(nestedBody.name).toBe("ValidationError");
  });

  test("Returns 404 when the parent publication does not exist", async () => {
    const response = await fetch(
      `${webserver.origin}/api/v1/contents/autorinexistente/publicacao-inexistente/children`,
    );

    expect(response.status).toBe(404);
    const responseBody = await response.json();
    expect(responseBody.name).toBe("NotFoundError");
  });
});
