import webserver from "infra/webserver.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
});

describe("GET /api/v1/sessions/google", () => {
  // No ambiente de teste as credenciais do Google não estão configuradas.
  test("Without credentials, login with Google is unavailable", async () => {
    const response = await fetch(`${webserver.origin}/api/v1/sessions/google`, {
      redirect: "manual",
    });
    expect(response.status).toBe(404);
    expect((await response.json()).message).toBe(
      "O login com Google não está disponível.",
    );
  });

  test("Callback with forged state goes back to login", async () => {
    const response = await fetch(
      `${webserver.origin}/api/v1/sessions/google/callback?code=abc&state=forjado`,
      { redirect: "manual" },
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/login?erro=google");
    expect(response.headers.get("set-cookie")).not.toContain("session_id");
  });
});
