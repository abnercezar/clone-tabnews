import { version as uuidVersion } from "uuid";
import webserver from "infra/webserver.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("`POST /api/v1/contents`", () => {
  describe("Anonymous user", () => {
    test("Cannot create content", async () => {
      const response = await fetch(`${webserver.origin}/api/v1/contents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Tentativa anônima",
          body: "Não deveria funcionar.",
        }),
      });

      expect(response.status).toBe(403);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ForbiddenError");
      expect(responseBody.status_code).toBe(403);
    });
  });

  describe("Activated user", () => {
    test("Creates a published content", async () => {
      const createdUser = await orchestrator.createUser();
      const activatedUser = await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(activatedUser);

      const response = await fetch(`${webserver.origin}/api/v1/contents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({
          title: "Manejo de pragas no milho",
          body: "Resumo prático sobre MIP no milho.",
        }),
      });

      expect(response.status).toBe(201);
      const responseBody = await response.json();

      expect(responseBody.id).toBeDefined();
      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(responseBody.owner_id).toBe(activatedUser.id);
      expect(responseBody.title).toBe("Manejo de pragas no milho");
      expect(responseBody.body).toBe("Resumo prático sobre MIP no milho.");
      expect(responseBody.slug).toBe("manejo-de-pragas-no-milho");
      expect(responseBody.status).toBe("published");
      expect(responseBody.type).toBe("content");
      expect(typeof responseBody.tabcoins).toBe("number");
      expect(Date.parse(responseBody.published_at)).not.toBeNaN();
      // A resposta do create inclui o username do autor (usado no redirect do front)
      expect(responseBody.owner_username).toBe(activatedUser.username);
      expect(responseBody.parent_id).toBeNull();
      expect(responseBody.first_publication).toBe(true);
      // Nunca deve vazar nada além dos campos esperados
      expect(responseBody.password).toBeUndefined();
    });

    test("Rejects content without body", async () => {
      const createdUser = await orchestrator.createUser();
      const activatedUser = await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(activatedUser);

      const response = await fetch(`${webserver.origin}/api/v1/contents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({
          title: "Título sem corpo",
        }),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ValidationError");
      expect(responseBody.status_code).toBe(400);
    });

    test("Ignores an `owner_id` sent in the body", async () => {
      const author = await orchestrator.createUser();
      const activatedAuthor = await orchestrator.activateUser(author);
      const sessionObject = await orchestrator.createSession(activatedAuthor);

      const otherUser = await orchestrator.createUser();

      const response = await fetch(`${webserver.origin}/api/v1/contents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({
          owner_id: otherUser.id,
          title: "Dono forjado",
          body: "O owner_id do corpo deve ser ignorado.",
        }),
      });

      expect(response.status).toBe(201);
      const responseBody = await response.json();
      // O dono é sempre o usuário autenticado, nunca o id enviado no corpo
      expect(responseBody.owner_id).toBe(activatedAuthor.id);
      expect(responseBody.owner_id).not.toBe(otherUser.id);
    });

    test("Rejects content without title", async () => {
      const createdUser = await orchestrator.createUser();
      const activatedUser = await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(activatedUser);

      const response = await fetch(`${webserver.origin}/api/v1/contents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${sessionObject.token}`,
        },
        body: JSON.stringify({
          body: "Corpo sem título.",
        }),
      });

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ValidationError");
      expect(responseBody.status_code).toBe(400);
    });

    test("Generates distinct slugs for the same title from the same author", async () => {
      const createdUser = await orchestrator.createUser();
      const activatedUser = await orchestrator.activateUser(createdUser);
      const sessionObject = await orchestrator.createSession(activatedUser);

      async function postTitle(title) {
        const response = await fetch(`${webserver.origin}/api/v1/contents`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({ title, body: "Conteúdo." }),
        });
        return response.json();
      }

      const first = await postTitle("Título repetido");
      const second = await postTitle("Título repetido");

      expect(first.slug).toBe("titulo-repetido");
      expect(second.slug).toBe("titulo-repetido-2");
    });
  });
});
