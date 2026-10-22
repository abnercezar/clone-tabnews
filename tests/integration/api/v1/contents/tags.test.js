import webserver from "infra/webserver.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

async function createActivatedSession(userOverrides = {}) {
  const createdUser = await orchestrator.createUser({
    activate: true,
    ...userOverrides,
  });
  const session = await orchestrator.createSession(createdUser);
  return { user: createdUser, session };
}

function request(method, path, sessionToken, body) {
  return fetch(`${webserver.origin}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(sessionToken ? { Cookie: `session_id=${sessionToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("Content tags", () => {
  test("POST with tags saves and returns them in catalog order", async () => {
    const { session } = await createActivatedSession({ username: "comTags" });

    const response = await request("POST", "/api/v1/contents", session.token, {
      title: "Como controlar percevejo na soja após o R5?",
      body: "Apareceu muito percevejo depois do enchimento de grão.",
      tags: ["pragas-e-doencas", "soja"],
    });
    expect(response.status).toBe(201);

    const responseBody = await response.json();
    expect(responseBody.tags).toEqual([
      { slug: "soja", label: "Soja" },
      { slug: "pragas-e-doencas", label: "Pragas e doenças" },
    ]);

    const getResponse = await fetch(
      `${webserver.origin}/api/v1/contents/comTags/${responseBody.slug}`,
    );
    const getBody = await getResponse.json();
    expect(getBody.tags).toEqual(responseBody.tags);
  });

  test("POST without tags keeps working (old clients)", async () => {
    const { session } = await createActivatedSession({ username: "semTags" });

    const response = await request("POST", "/api/v1/contents", session.token, {
      title: "Publicação sem tags",
      body: "Texto da publicação.",
    });
    expect(response.status).toBe(201);
    expect((await response.json()).tags).toEqual([]);
  });

  test("POST with unknown tag returns 400", async () => {
    const { session } = await createActivatedSession({ username: "tagRuim" });

    const response = await request("POST", "/api/v1/contents", session.token, {
      title: "Tag inexistente",
      body: "Texto.",
      tags: ["soja", "abacaxi-roxo"],
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      name: "ValidationError",
      message: "Tag desconhecida: abacaxi-roxo.",
      action: "Escolha uma das tags disponíveis no AgroTab.",
      status_code: 400,
    });
  });

  test("POST with more than 3 tags returns 400", async () => {
    const { session } = await createActivatedSession({ username: "tagDemais" });

    const response = await request("POST", "/api/v1/contents", session.token, {
      title: "Muitas tags",
      body: "Texto.",
      tags: ["soja", "milho", "cafe", "trigo"],
    });
    expect(response.status).toBe(400);
    expect((await response.json()).message).toBe("Escolha no máximo 3 tags.");
  });

  test("Comment ignores tags", async () => {
    const { user: author } = await createActivatedSession({
      username: "autorTagPai",
    });
    const post = await orchestrator.createContent({
      owner_id: author.id,
      title: "Post com comentário",
      tags: ["milho"],
    });
    const { session } = await createActivatedSession({
      username: "comentaTag",
    });

    const response = await request("POST", "/api/v1/contents", session.token, {
      parent_id: post.id,
      body: "Comentário com tag enviada por engano.",
      tags: ["soja"],
    });
    expect(response.status).toBe(201);
    expect((await response.json()).tags).toEqual([]);
  });

  test("GET ?tag= filters the feed", async () => {
    const { user } = await createActivatedSession({ username: "filtroTag" });
    await orchestrator.createContent({
      owner_id: user.id,
      title: "Café arábica no sul de Minas",
      tags: ["cafe", "sudeste"],
    });
    await orchestrator.createContent({
      owner_id: user.id,
      title: "Ordenha mecânica",
      tags: ["pecuaria-de-leite"],
    });

    const response = await fetch(
      `${webserver.origin}/api/v1/contents?tag=cafe&username=filtroTag`,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("X-Total-Count")).toBe("1");
    const responseBody = await response.json();
    expect(responseBody.map((item) => item.title)).toEqual([
      "Café arábica no sul de Minas",
    ]);
  });

  test("PATCH replaces tags; omitting them keeps the current ones", async () => {
    const { user, session } = await createActivatedSession({
      username: "editaTag",
    });
    const post = await orchestrator.createContent({
      owner_id: user.id,
      title: "Trigo no Paraná",
      tags: ["trigo"],
    });
    const path = `/api/v1/contents/editaTag/${post.slug}`;

    const keepResponse = await request("PATCH", path, session.token, {
      title: "Trigo no Paraná",
      body: "Texto novo, mesmas tags.",
    });
    expect(keepResponse.status).toBe(200);
    expect((await keepResponse.json()).tags).toEqual([
      { slug: "trigo", label: "Trigo" },
    ]);

    const replaceResponse = await request("PATCH", path, session.token, {
      title: "Trigo no Paraná",
      body: "Texto novo, tags novas.",
      tags: ["trigo", "sul"],
    });
    expect(replaceResponse.status).toBe(200);
    expect((await replaceResponse.json()).tags).toEqual([
      { slug: "trigo", label: "Trigo" },
      { slug: "sul", label: "Sul" },
    ]);
  });
});

describe("Tag page", () => {
  test("GET /tag/soja renders the tag page", async () => {
    const response = await fetch(`${webserver.origin}/tag/soja`);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("<title>Soja · AgroTab</title>");
  });

  test("GET /tag/inexistente returns 404", async () => {
    const response = await fetch(`${webserver.origin}/tag/inexistente`);
    expect(response.status).toBe(404);
  });
});
