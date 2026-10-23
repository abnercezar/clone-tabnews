import webserver from "infra/webserver.js";
import database from "infra/database.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("`PATCH /api/v1/contents/[username]/[slug]`", () => {
  test("The author updates the title and the body", async () => {
    const author = await orchestrator.createUser({ username: "autoredita" });
    const activatedAuthor = await orchestrator.activateUser(author);
    const sessionObject = await orchestrator.createSession(activatedAuthor);

    const createdContent = await orchestrator.createContent({
      owner_id: activatedAuthor.id,
      title: "Título original da lavoura",
      body: "Texto original sobre o manejo.",
    });

    const response = await fetch(
      `${webserver.origin}/api/v1/contents/autoredita/${createdContent.slug}`,
      {
        method: "PATCH",
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Título revisado da lavoura",
          body: "Texto revisado com o que funcionou no talhão.",
        }),
      },
    );

    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody.title).toBe("Título revisado da lavoura");
    expect(responseBody.body).toBe(
      "Texto revisado com o que funcionou no talhão.",
    );
    expect(responseBody.slug).toBe("titulo-revisado-da-lavoura");
    expect(responseBody.status).toBe("published");

    const oldAddress = await fetch(
      `${webserver.origin}/api/v1/contents/autoredita/${createdContent.slug}`,
    );
    expect(oldAddress.status).toBe(404);

    const newAddress = await fetch(
      `${webserver.origin}/api/v1/contents/autoredita/${responseBody.slug}`,
    );
    expect(newAddress.status).toBe(200);

    const events = await database.query({
      text: `
        SELECT
          type,
          originator_user_id
        FROM
          events
        WHERE
          metadata->>'content_id' = $1
          AND type = 'update:content'
      ;`,
      values: [createdContent.id],
    });
    expect(events.rows).toHaveLength(1);
    expect(events.rows[0].originator_user_id).toBe(activatedAuthor.id);
  });

  test("Keeping the title preserves the address", async () => {
    const author = await orchestrator.createUser({ username: "autormantem" });
    const activatedAuthor = await orchestrator.activateUser(author);
    const sessionObject = await orchestrator.createSession(activatedAuthor);

    const createdContent = await orchestrator.createContent({
      owner_id: activatedAuthor.id,
      title: "Mesmo título",
      body: "Corpo antigo.",
    });

    const response = await fetch(
      `${webserver.origin}/api/v1/contents/autormantem/${createdContent.slug}`,
      {
        method: "PATCH",
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Mesmo título",
          body: "Corpo novo, endereço igual.",
        }),
      },
    );

    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody.slug).toBe(createdContent.slug);
    expect(responseBody.body).toBe("Corpo novo, endereço igual.");
  });

  test("The author updates a comment from its first line", async () => {
    const author = await orchestrator.createUser({
      username: "autorcomentario",
    });
    const activatedAuthor = await orchestrator.activateUser(author);
    const sessionObject = await orchestrator.createSession(activatedAuthor);

    const root = await orchestrator.createContent({
      owner_id: activatedAuthor.id,
      title: "Publicação com comentário",
      body: "Corpo da publicação.",
    });
    const comment = await orchestrator.createContent({
      owner_id: activatedAuthor.id,
      parent_id: root.id,
      body: "Comentário original sobre a seca.",
    });

    const response = await fetch(
      `${webserver.origin}/api/v1/contents/autorcomentario/${comment.slug}`,
      {
        method: "PATCH",
        headers: {
          Cookie: `session_id=${sessionObject.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: "Comentário revisado sobre a chuva.",
        }),
      },
    );

    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody.parent_id).toBe(root.id);
    expect(responseBody.title).toBe("Comentário revisado sobre a chuva.");
    expect(responseBody.body).toBe("Comentário revisado sobre a chuva.");
  });

  test("Another activated user cannot edit it", async () => {
    const author = await orchestrator.createUser({ username: "donodoedit" });
    const activatedAuthor = await orchestrator.activateUser(author);
    const createdContent = await orchestrator.createContent({
      owner_id: activatedAuthor.id,
      title: "Conteúdo protegido da edição",
      body: "Só o autor edita.",
    });

    const otherUser = await orchestrator.createUser({
      username: "outroeditor",
    });
    const activatedOther = await orchestrator.activateUser(otherUser);
    const otherSession = await orchestrator.createSession(activatedOther);

    const response = await fetch(
      `${webserver.origin}/api/v1/contents/donodoedit/${createdContent.slug}`,
      {
        method: "PATCH",
        headers: {
          Cookie: `session_id=${otherSession.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Tentativa de alteração",
          body: "Não deveria gravar.",
        }),
      },
    );

    expect(response.status).toBe(403);
    const responseBody = await response.json();
    expect(responseBody.name).toBe("ForbiddenError");
  });

  test("A user with update:content:others edits another user's content", async () => {
    const author = await orchestrator.createUser({
      username: "donodoadminedit",
    });
    const activatedAuthor = await orchestrator.activateUser(author);
    const createdContent = await orchestrator.createContent({
      owner_id: activatedAuthor.id,
      title: "Publicação que o admin revisa",
      body: "Texto original do autor.",
    });

    const moderator = await orchestrator.createUser({
      username: "admineditor",
    });
    const activatedModerator = await orchestrator.activateUser(moderator);
    await orchestrator.addFeaturesToUser(activatedModerator, [
      "update:content:others",
    ]);
    const moderatorSession =
      await orchestrator.createSession(activatedModerator);

    const response = await fetch(
      `${webserver.origin}/api/v1/contents/donodoadminedit/${createdContent.slug}`,
      {
        method: "PATCH",
        headers: {
          Cookie: `session_id=${moderatorSession.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Publicação revisada pelo admin",
          body: "Texto ajustado pela moderação.",
        }),
      },
    );

    expect(response.status).toBe(200);
    const responseBody = await response.json();
    expect(responseBody.title).toBe("Publicação revisada pelo admin");
    expect(responseBody.owner_username).toBe("donodoadminedit");
  });

  test("Anonymous user cannot edit it", async () => {
    const response = await fetch(
      `${webserver.origin}/api/v1/contents/donodoedit/conteudo-protegido-da-edicao`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Anônimo",
          body: "Sem sessão.",
        }),
      },
    );

    expect(response.status).toBe(403);
  });
});
