import webserver from "infra/webserver.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

async function patchUser(username, sessionToken, body) {
  return fetch(`${webserver.origin}/api/v1/users/${username}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: `session_id=${sessionToken}`,
    },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/v1/users/[username] (perfil com credencial)", () => {
  test("Saves occupation, crops, state and e-mail preference", async () => {
    const createdUser = await orchestrator.createUser({
      username: "agronomaGo",
      activate: true,
    });
    const session = await orchestrator.createSession(createdUser);

    const response = await patchUser("agronomaGo", session.token, {
      occupation: "agronomo",
      crops: ["soja", "milho", "soja"],
      state: "go",
      notify_replies: false,
    });
    expect(response.status).toBe(200);

    const responseBody = await response.json();
    expect(responseBody).toMatchObject({
      occupation: "agronomo",
      crops: ["soja", "milho"],
      state: "GO",
      founder: false,
      notify_replies: false,
    });

    const publicResponse = await fetch(
      `${webserver.origin}/api/v1/users/agronomaGo`,
    );
    const publicBody = await publicResponse.json();
    expect(publicBody).toMatchObject({
      occupation: "agronomo",
      crops: ["soja", "milho"],
      state: "GO",
      founder: false,
    });
    expect(publicBody.notify_replies).toBeUndefined();
    expect(publicBody.email).toBeUndefined();
  });

  test("Credential shows next to the author name in contents", async () => {
    const author = await orchestrator.createUser({
      username: "tecnicaPr",
      activate: true,
    });
    const session = await orchestrator.createSession(author);
    await patchUser("tecnicaPr", session.token, {
      occupation: "tecnico-agricola",
      state: "PR",
    });
    const post = await orchestrator.createContent({
      owner_id: author.id,
      title: "Ferrugem no trigo",
    });

    const response = await fetch(
      `${webserver.origin}/api/v1/contents/tecnicaPr/${post.slug}`,
    );
    expect(await response.json()).toMatchObject({
      owner_occupation: "tecnico-agricola",
      owner_state: "PR",
      owner_founder: false,
    });
  });

  test("Clearing occupation and state with null", async () => {
    const createdUser = await orchestrator.createUser({
      username: "limpaPerfil",
      activate: true,
    });
    const session = await orchestrator.createSession(createdUser);
    await patchUser("limpaPerfil", session.token, {
      occupation: "produtor",
      state: "MT",
    });

    const response = await patchUser("limpaPerfil", session.token, {
      occupation: null,
      state: "",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      occupation: null,
      state: null,
    });
  });

  test.each([
    [{ occupation: "astronauta" }, "A ocupação informada não é válida."],
    [{ state: "XX" }, "O estado informado não é válido."],
    [
      { crops: ["soja", "pragas-e-doencas"] },
      "Cultura desconhecida: pragas-e-doencas.",
    ],
    [{ crops: "soja" }, '"crops" deve ser uma lista de culturas.'],
    [
      { notify_replies: "sim" },
      '"notify_replies" deve ser verdadeiro ou falso.',
    ],
  ])("Invalid value %j returns 400", async (body, message) => {
    const createdUser = await orchestrator.createUser({ activate: true });
    const session = await orchestrator.createSession(createdUser);

    const response = await patchUser(createdUser.username, session.token, body);
    expect(response.status).toBe(400);
    expect((await response.json()).message).toBe(message);
  });

  test("User cannot give themselves the founder badge", async () => {
    const createdUser = await orchestrator.createUser({
      username: "querSelo",
      activate: true,
    });
    const session = await orchestrator.createSession(createdUser);

    const response = await patchUser("querSelo", session.token, {
      founder: true,
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      name: "ForbiddenError",
      message: "Só a equipe do AgroTab pode marcar membros fundadores.",
      action: 'Remova o campo "founder" e tente novamente.',
      status_code: 403,
    });
  });

  test("Admin marks another user as founder", async () => {
    const admin = await orchestrator.createUser({
      username: "adminSelo",
      activate: true,
    });
    await orchestrator.addFeaturesToUser(admin, ["update:user:others"]);
    const adminSession = await orchestrator.createSession(admin);
    await orchestrator.createUser({ username: "fundador", activate: true });

    const response = await patchUser("fundador", adminSession.token, {
      founder: true,
    });
    expect(response.status).toBe(200);

    const publicResponse = await fetch(
      `${webserver.origin}/api/v1/users/fundador`,
    );
    expect((await publicResponse.json()).founder).toBe(true);
  });
});
