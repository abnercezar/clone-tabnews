import { version as uuidVersion } from "uuid";
import webserver from "infra/webserver.js";
import orchestrator from "tests/orchestrator.js";
import emailConfirmation from "models/email-confirmation.js";
import user from "models/user.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
  await orchestrator.deleteAllEmails();
});

describe("PATCH /api/v1/email-confirmation", () => {
  describe("Anonymous user", () => {
    test("With blank token_id", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/email-confirmation`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ValidationError");
    });

    test("With nonexistent token_id", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/email-confirmation`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token_id: "00000000-0000-4000-8000-000000000000",
          }),
        },
      );

      expect(response.status).toBe(404);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        name: "NotFoundError",
        message:
          "O token de confirmação de email utilizado não foi encontrado no sistema ou expirou.",
        action: "Solicite uma nova alteração de email.",
        status_code: 404,
      });
    });

    test("Confirms email change with a valid token", async () => {
      await orchestrator.deleteAllEmails();

      const createdUser = await orchestrator.createUser({
        email: "fresh.valid.token@email.com",
        activate: true,
      });
      const sessionObject = await orchestrator.createSession(createdUser);

      const updateResponse = await fetch(
        `${webserver.origin}/api/v1/users/${createdUser.username}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: `session_id=${sessionObject.token}`,
          },
          body: JSON.stringify({
            email: "new@email.com",
          }),
        },
      );

      expect(updateResponse.status).toBe(200);

      const userBeforeConfirm = await user.findOneById(createdUser.id);
      expect(userBeforeConfirm.email).toBe("fresh.valid.token@email.com");

      const tokenObject = await emailConfirmation.findOneTokenByUserId(
        createdUser.id,
      );
      expect(tokenObject.email).toBe("new@email.com");
      expect(tokenObject.used_at).toBeNull();

      const confirmationEmail = await orchestrator.getLastEmail();
      expect(confirmationEmail.subject).toBe("Confirme seu novo email");
      expect(confirmationEmail.text).toContain(
        emailConfirmation.getEmailConfirmationPageEndpoint(tokenObject.id),
      );

      const response = await fetch(
        `${webserver.origin}/api/v1/email-confirmation`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token_id: tokenObject.id,
          }),
        },
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody).toEqual({
        id: tokenObject.id,
        used_at: responseBody.used_at,
        expires_at: responseBody.expires_at,
        created_at: responseBody.created_at,
        updated_at: responseBody.updated_at,
      });
      expect(uuidVersion(responseBody.id)).toBe(4);
      expect(responseBody.used_at).not.toBeNull();

      const userAfterConfirm = await user.findOneById(createdUser.id);
      expect(userAfterConfirm.email).toBe("new@email.com");
    });

    test("Rejects an already used token", async () => {
      const createdUser = await orchestrator.createUser({
        email: "already.used.token@email.com",
      });

      const emailConfirmationToken = await emailConfirmation.create(
        createdUser.id,
        "confirmed@email.com",
      );

      const firstTryResponse = await fetch(
        `${webserver.origin}/api/v1/email-confirmation`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token_id: emailConfirmationToken.id,
          }),
        },
      );

      expect(firstTryResponse.status).toBe(200);

      const userInDatabase = await user.findOneById(createdUser.id);
      expect(userInDatabase.email).toBe("confirmed@email.com");

      const secondTryResponse = await fetch(
        `${webserver.origin}/api/v1/email-confirmation`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token_id: emailConfirmationToken.id,
          }),
        },
      );

      expect(secondTryResponse.status).toBe(404);
      const secondTryResponseBody = await secondTryResponse.json();
      expect(secondTryResponseBody.name).toBe("NotFoundError");
    });
  });
});
