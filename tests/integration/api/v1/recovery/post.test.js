import webserver from "infra/webserver.js";
import recovery from "models/recovery.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

beforeEach(async () => {
  await orchestrator.deleteAllEmails();
});

describe("`POST /api/v1/recovery`", () => {
  describe("Anonymous user", () => {
    test("With valid email of an existing user", async () => {
      const createdUser = await orchestrator.createUser({
        email: "recuperar@agrotab.local",
      });

      const response = await fetch(`${webserver.origin}/api/v1/recovery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: createdUser.email,
        }),
      });

      expect(response.status).toBe(201);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        used_at: null,
        expires_at: expect.any(String),
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
      expect(responseBody).not.toHaveProperty("id");
      expect(responseBody).not.toHaveProperty("user_id");

      const lastEmail = await orchestrator.getLastEmail();
      expect(lastEmail.recipients[0]).toBe(`<${createdUser.email}>`);
      expect(lastEmail.subject).toBe("Recuperação de senha");
      expect(lastEmail.text).toContain("/cadastro/recuperar/");
      expect(orchestrator.extractUUID(lastEmail.text)).toBeTruthy();
    });

    test("With email that does not exist (anti-enumeration)", async () => {
      const response = await fetch(`${webserver.origin}/api/v1/recovery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "naoexiste@agrotab.local",
        }),
      });

      expect(response.status).toBe(201);

      const responseBody = await response.json();

      expect(responseBody).toEqual({
        used_at: null,
        expires_at: expect.any(String),
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
      expect(responseBody).not.toHaveProperty("id");

      const lastEmail = await orchestrator.getLastEmail();
      expect(lastEmail).toBeNull();
    });

    test("With invalid email", async () => {
      const response = await fetch(`${webserver.origin}/api/v1/recovery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "email-invalido",
        }),
      });

      expect(response.status).toBe(400);

      const responseBody = await response.json();

      expect(responseBody.name).toBe("ValidationError");
    });

    test("With two valid tokens already created (rate limit per user)", async () => {
      const createdUser = await orchestrator.createUser({
        email: "limite@agrotab.local",
      });

      await recovery.create(createdUser.id);
      await recovery.create(createdUser.id);
      await orchestrator.deleteAllEmails();

      const response = await fetch(`${webserver.origin}/api/v1/recovery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: createdUser.email,
        }),
      });

      expect(response.status).toBe(201);

      const lastEmail = await orchestrator.getLastEmail();
      expect(lastEmail).toBeNull();
    });
  });
});
