import { version as uuidVersion } from "uuid";
import webserver from "infra/webserver.js";
import recovery from "models/recovery.js";
import session from "models/session.js";
import user from "models/user.js";
import password from "models/password.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("`PATCH /api/v1/recovery`", () => {
  describe("Anonymous user", () => {
    test("With valid token and new password", async () => {
      const createdUser = await orchestrator.createUser({
        email: "novasenha@agrotab.local",
        password: "senhaantiga",
        activate: true,
      });

      const existingSession = await orchestrator.createSession(createdUser);
      const recoveryToken = await recovery.create(createdUser.id);

      const response = await fetch(`${webserver.origin}/api/v1/recovery`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token_id: recoveryToken.id,
          password: "senhanova123",
        }),
      });

      expect(response.status).toBe(200);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        used_at: expect.any(String),
        expires_at: expect.any(String),
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
      expect(responseBody).not.toHaveProperty("id");
      expect(responseBody).not.toHaveProperty("user_id");
      expect(uuidVersion(recoveryToken.id)).toBe(4);

      const updatedUser = await user.findOneById(createdUser.id);
      expect(await password.compare("senhanova123", updatedUser.password)).toBe(
        true,
      );
      expect(await password.compare("senhaantiga", updatedUser.password)).toBe(
        false,
      );

      await expect(
        session.findOneValidByToken(existingSession.token),
      ).rejects.toThrow("Usuário não possui sessão ativa.");
    });

    test("With nonexistent token", async () => {
      const response = await fetch(`${webserver.origin}/api/v1/recovery`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token_id: "b9e3e7cd-6f3e-4a9c-b8a4-6ccf5a2fd9cc",
          password: "senhanova123",
        }),
      });

      expect(response.status).toBe(404);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "NotFoundError",
        message:
          "O token de recuperação informado não foi encontrado ou é inválido.",
        action: "Solicite uma nova recuperação de senha.",
        status_code: 404,
      });
    });

    test("With expired token", async () => {
      jest.useFakeTimers({
        now: new Date(Date.now() - recovery.EXPIRATION_IN_MILLISECONDS),
      });

      const createdUser = await orchestrator.createUser();
      const expiredToken = await recovery.create(createdUser.id);

      jest.useRealTimers();

      const response = await fetch(`${webserver.origin}/api/v1/recovery`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token_id: expiredToken.id,
          password: "senhanova123",
        }),
      });

      expect(response.status).toBe(404);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        name: "NotFoundError",
        message:
          "O token de recuperação informado não foi encontrado no sistema ou expirou.",
        action: "Solicite uma nova recuperação de senha.",
        status_code: 404,
      });
    });

    test("With already used token", async () => {
      const createdUser = await orchestrator.createUser({
        password: "senhaantiga",
        activate: true,
      });
      const recoveryToken = await recovery.create(createdUser.id);

      const firstResponse = await fetch(`${webserver.origin}/api/v1/recovery`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token_id: recoveryToken.id,
          password: "senhanova123",
        }),
      });

      expect(firstResponse.status).toBe(200);

      const secondResponse = await fetch(
        `${webserver.origin}/api/v1/recovery`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token_id: recoveryToken.id,
            password: "outrasenha123",
          }),
        },
      );

      expect(secondResponse.status).toBe(404);
    });

    test("With invalid password", async () => {
      const createdUser = await orchestrator.createUser();
      const recoveryToken = await recovery.create(createdUser.id);

      const response = await fetch(`${webserver.origin}/api/v1/recovery`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token_id: recoveryToken.id,
          password: "curta",
        }),
      });

      expect(response.status).toBe(400);

      const responseBody = await response.json();
      expect(responseBody.name).toBe("ValidationError");
    });

    test("Invalidates sibling valid tokens after reset", async () => {
      const createdUser = await orchestrator.createUser({
        password: "senhaantiga",
        activate: true,
      });
      const firstToken = await recovery.create(createdUser.id);
      const secondToken = await recovery.create(createdUser.id);

      const firstResponse = await fetch(`${webserver.origin}/api/v1/recovery`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token_id: firstToken.id,
          password: "senhanova123",
        }),
      });

      expect(firstResponse.status).toBe(200);

      const siblingResponse = await fetch(
        `${webserver.origin}/api/v1/recovery`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token_id: secondToken.id,
            password: "outrasenha123",
          }),
        },
      );

      expect(siblingResponse.status).toBe(404);
    });
  });

  describe("Authenticated user", () => {
    test("With valid session cookie can request recovery", async () => {
      const createdUser = await orchestrator.createUser({
        email: "logado.recupera@agrotab.local",
        activate: true,
      });
      const userSession = await orchestrator.createSession(createdUser);

      const response = await fetch(`${webserver.origin}/api/v1/recovery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `session_id=${userSession.token}`,
        },
        body: JSON.stringify({
          email: createdUser.email,
        }),
      });

      expect(response.status).toBe(201);

      const responseBody = await response.json();
      expect(responseBody).toMatchObject({
        used_at: null,
      });
    });
  });
});
