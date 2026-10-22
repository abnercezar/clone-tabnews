import webserver from "infra/webserver.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70]);

describe("POST /api/v1/uploads", () => {
  test("Anonymous user cannot upload photos", async () => {
    const response = await fetch(`${webserver.origin}/api/v1/uploads`, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: JPEG_BYTES,
    });
    expect(response.status).toBe(403);
  });

  // No ambiente de teste o armazenamento (STORAGE_*) não está configurado.
  test("Without storage configured, explains that photos are unavailable", async () => {
    const createdUser = await orchestrator.createUser({ activate: true });
    const session = await orchestrator.createSession(createdUser);

    const response = await fetch(`${webserver.origin}/api/v1/uploads`, {
      method: "POST",
      headers: {
        "Content-Type": "image/jpeg",
        Cookie: `session_id=${session.token}`,
      },
      body: JPEG_BYTES,
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      name: "UnprocessableEntityError",
      message: "O envio de fotos ainda não está disponível.",
      action:
        "Por enquanto, cole o endereço de uma imagem que já está na internet.",
      status_code: 422,
    });
  });
});
