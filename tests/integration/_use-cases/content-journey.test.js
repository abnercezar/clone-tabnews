import webserver from "infra/webserver.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("Use case: publish, read, comment and delete", () => {
  let author;
  let authorSession;
  let post;

  test("Anonymous visitor reads an empty feed and cannot publish", async () => {
    const feedResponse = await fetch(`${webserver.origin}/api/v1/contents`);
    expect(feedResponse.status).toBe(200);
    expect(await feedResponse.json()).toEqual([]);

    const publishResponse = await fetch(`${webserver.origin}/api/v1/contents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Tentativa sem conta",
        body: "Não deve gravar.",
      }),
    });
    expect(publishResponse.status).toBe(403);
  });

  test("`/conteudos` redirects to the feed", async () => {
    const response = await fetch(`${webserver.origin}/conteudos`, {
      redirect: "manual",
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/");
  });

  test("Activated author publishes and the post stays in the feed", async () => {
    const createdUser = await orchestrator.createUser({
      username: "jornadaautor",
    });
    author = await orchestrator.activateUser(createdUser);
    authorSession = await orchestrator.createSession(author);

    const response = await fetch(`${webserver.origin}/api/v1/contents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${authorSession.token}`,
      },
      body: JSON.stringify({
        title: "Plantação de café",
        body: "Como conduzir a lavoura no primeiro ano.",
      }),
    });

    expect(response.status).toBe(201);
    post = await response.json();
    expect(post.owner_id).toBe(author.id);
    expect(post.slug).toBe("plantacao-de-cafe");
    expect(post.first_publication).toBe(true);
    expect(post.parent_id).toBeNull();

    const feedResponse = await fetch(`${webserver.origin}/api/v1/contents`, {
      headers: { Cookie: `session_id=${authorSession.token}` },
    });
    expect(feedResponse.status).toBe(200);
    const feed = await feedResponse.json();
    expect(feed.map((item) => item.id)).toContain(post.id);

    const readResponse = await fetch(
      `${webserver.origin}/api/v1/contents/jornadaautor/${post.slug}`,
    );
    expect(readResponse.status).toBe(200);
    const readBody = await readResponse.json();
    expect(readBody.body).toBe("Como conduzir a lavoura no primeiro ano.");
  });

  test("A second post is not treated as the first publication", async () => {
    const response = await fetch(`${webserver.origin}/api/v1/contents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${authorSession.token}`,
      },
      body: JSON.stringify({
        title: "Plantação de café",
        body: "Segundo ciclo da mesma lavoura.",
      }),
    });

    expect(response.status).toBe(201);
    const secondPost = await response.json();
    expect(secondPost.first_publication).toBe(false);
    expect(secondPost.slug).toBe("plantacao-de-cafe-2");
  });

  test("A comment stays on the post and out of the feed", async () => {
    const reader = await orchestrator.createUser({ username: "jornadaleitor" });
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
        body: "Qual o espaçamento entre as linhas?",
      }),
    });

    expect(commentResponse.status).toBe(201);
    const comment = await commentResponse.json();
    expect(comment.parent_id).toBe(post.id);
    expect(comment.first_publication).toBe(false);

    const childrenResponse = await fetch(
      `${webserver.origin}/api/v1/contents/jornadaautor/${post.slug}/children`,
    );
    const children = await childrenResponse.json();
    expect(children.map((item) => item.id)).toEqual([comment.id]);

    const feedResponse = await fetch(`${webserver.origin}/api/v1/contents`);
    const feedIds = (await feedResponse.json()).map((item) => item.id);
    expect(feedIds).not.toContain(comment.id);

    const replyResponse = await fetch(`${webserver.origin}/api/v1/contents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${readerSession.token}`,
      },
      body: JSON.stringify({
        parent_id: comment.id,
        body: "Resposta que não deve entrar.",
      }),
    });
    expect(replyResponse.status).toBe(201);
    const reply = await replyResponse.json();
    expect(reply.parent_id).toBe(comment.id);
    expect(feedIds).not.toContain(reply.id);
    expect(children.map((item) => item.id)).not.toContain(reply.id);

    const deniedDelete = await fetch(
      `${webserver.origin}/api/v1/contents/jornadaautor/${post.slug}`,
      {
        method: "DELETE",
        headers: { Cookie: `session_id=${readerSession.token}` },
      },
    );
    expect(deniedDelete.status).toBe(403);
  });

  test("The author deletes the post and it disappears", async () => {
    const deleteResponse = await fetch(
      `${webserver.origin}/api/v1/contents/jornadaautor/${post.slug}`,
      {
        method: "DELETE",
        headers: { Cookie: `session_id=${authorSession.token}` },
      },
    );

    expect(deleteResponse.status).toBe(200);
    const deleted = await deleteResponse.json();
    expect(deleted.status).toBe("deleted");

    const readResponse = await fetch(
      `${webserver.origin}/api/v1/contents/jornadaautor/${post.slug}`,
    );
    expect(readResponse.status).toBe(404);

    const feedResponse = await fetch(`${webserver.origin}/api/v1/contents`);
    const feedIds = (await feedResponse.json()).map((item) => item.id);
    expect(feedIds).not.toContain(post.id);
  });
});
