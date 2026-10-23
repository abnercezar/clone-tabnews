import webserver from "infra/webserver.js";
import database from "infra/database.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("`DELETE /api/v1/contents/[username]/[slug]`", () => {
  test("The author removes the content from the feed", async () => {
    const author = await orchestrator.createUser({ username: "autorexclui" });
    const activatedAuthor = await orchestrator.activateUser(author);
    const sessionObject = await orchestrator.createSession(activatedAuthor);

    const createdContent = await orchestrator.createContent({
      owner_id: activatedAuthor.id,
      title: "Conteúdo a excluir",
      body: "Este conteúdo será excluído.",
    });

    const response = await fetch(
      `${webserver.origin}/api/v1/contents/autorexclui/${createdContent.slug}`,
      {
        method: "DELETE",
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
        },
      },
    );

    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody.status).toBe("deleted");

    const readResponse = await fetch(
      `${webserver.origin}/api/v1/contents/autorexclui/${createdContent.slug}`,
    );
    expect(readResponse.status).toBe(404);

    const feedResponse = await fetch(`${webserver.origin}/api/v1/contents`);
    const feed = await feedResponse.json();
    expect(feed.map((item) => item.id)).not.toContain(createdContent.id);

    const events = await database.query({
      text: `
        SELECT
          type,
          originator_user_id
        FROM
          events
        WHERE
          metadata->>'content_id' = $1
          AND type = 'delete:content'
      ;`,
      values: [createdContent.id],
    });
    expect(events.rows).toHaveLength(1);
    expect(events.rows[0].originator_user_id).toBe(activatedAuthor.id);
  });

  test("Another activated user cannot delete it", async () => {
    const author = await orchestrator.createUser({ username: "donodopost" });
    const activatedAuthor = await orchestrator.activateUser(author);
    const createdContent = await orchestrator.createContent({
      owner_id: activatedAuthor.id,
      title: "Conteúdo protegido",
      body: "Só o autor exclui.",
    });

    const otherUser = await orchestrator.createUser({
      username: "outrousuario",
    });
    const activatedOther = await orchestrator.activateUser(otherUser);
    const otherSession = await orchestrator.createSession(activatedOther);

    const response = await fetch(
      `${webserver.origin}/api/v1/contents/donodopost/${createdContent.slug}`,
      {
        method: "DELETE",
        headers: {
          Cookie: `session_id=${otherSession.token}`,
        },
      },
    );

    expect(response.status).toBe(403);
    const responseBody = await response.json();
    expect(responseBody.name).toBe("ForbiddenError");
  });

  test("A user with delete:content:others removes another user's content", async () => {
    const author = await orchestrator.createUser({
      username: "donodoadmindelete",
    });
    const activatedAuthor = await orchestrator.activateUser(author);
    const createdContent = await orchestrator.createContent({
      owner_id: activatedAuthor.id,
      title: "Publicação que o admin exclui",
      body: "Só a moderação apaga isto.",
    });

    const moderator = await orchestrator.createUser({
      username: "adminexclusao",
    });
    const activatedModerator = await orchestrator.activateUser(moderator);
    await orchestrator.addFeaturesToUser(activatedModerator, [
      "delete:content:others",
    ]);
    const moderatorSession =
      await orchestrator.createSession(activatedModerator);

    const response = await fetch(
      `${webserver.origin}/api/v1/contents/donodoadmindelete/${createdContent.slug}`,
      {
        method: "DELETE",
        headers: {
          Cookie: `session_id=${moderatorSession.token}`,
        },
      },
    );

    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody.status).toBe("deleted");
    expect(responseBody.owner_username).toBe("donodoadmindelete");
  });

  test("Anonymous user cannot delete it", async () => {
    const response = await fetch(
      `${webserver.origin}/api/v1/contents/donodopost/conteudo-protegido`,
      { method: "DELETE" },
    );

    expect(response.status).toBe(403);
  });
});
