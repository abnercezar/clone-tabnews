import webserver from "infra/webserver.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("Markdown images in content body", () => {
  test("Preserves image markdown on create, read and comment children", async () => {
    const author = await orchestrator.createUser({
      username: "autorimagem",
    });
    const activatedAuthor = await orchestrator.activateUser(author);
    const authorSession = await orchestrator.createSession(activatedAuthor);

    const imageMarkdown =
      "Foto da lavoura:\n\n![Lavoura de milho](https://example.com/milho.jpg)";

    const postResponse = await fetch(`${webserver.origin}/api/v1/contents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${authorSession.token}`,
      },
      body: JSON.stringify({
        title: "Registro fotográfico da safra",
        body: imageMarkdown,
      }),
    });

    expect(postResponse.status).toBe(201);
    const post = await postResponse.json();
    expect(post.body).toBe(imageMarkdown);

    const getResponse = await fetch(
      `${webserver.origin}/api/v1/contents/${post.owner_username}/${post.slug}`,
    );
    expect(getResponse.status).toBe(200);
    const getBody = await getResponse.json();
    expect(getBody.body).toBe(imageMarkdown);

    const commentMarkdown =
      "Comparando com a safra passada:\n\n![Safra anterior](https://example.com/safra-anterior.png)";

    const commentResponse = await fetch(`${webserver.origin}/api/v1/contents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `session_id=${authorSession.token}`,
      },
      body: JSON.stringify({
        parent_id: post.id,
        body: commentMarkdown,
      }),
    });

    expect(commentResponse.status).toBe(201);
    const comment = await commentResponse.json();
    expect(comment.body).toBe(commentMarkdown);

    const childrenResponse = await fetch(
      `${webserver.origin}/api/v1/contents/${post.owner_username}/${post.slug}/children`,
    );
    expect(childrenResponse.status).toBe(200);
    const children = await childrenResponse.json();
    expect(children).toHaveLength(1);
    expect(children[0].id).toBe(comment.id);
    expect(children[0].body).toBe(commentMarkdown);
  });
});
