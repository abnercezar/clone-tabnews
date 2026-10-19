import webserver from "infra/webserver.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("`GET /api/v1/contents`", () => {
  describe("Anonymous user", () => {
    test("Returns an empty list when there is no content", async () => {
      const response = await fetch(`${webserver.origin}/api/v1/contents`);

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(Array.isArray(responseBody)).toBe(true);
      expect(responseBody.length).toBe(0);
    });

    test("Returns the published feed with the author username", async () => {
      const author = await orchestrator.createUser({ username: "autorfeed" });
      await orchestrator.activateUser(author);

      await orchestrator.createContent({
        owner_id: author.id,
        title: "Primeiro post",
        body: "Conteúdo do primeiro post.",
      });
      await orchestrator.createContent({
        owner_id: author.id,
        title: "Segundo post",
        body: "Conteúdo do segundo post.",
      });

      const response = await fetch(`${webserver.origin}/api/v1/contents`);

      expect(response.status).toBe(200);
      const responseBody = await response.json();

      expect(responseBody.length).toBe(2);
      // Mais recente primeiro
      expect(responseBody[0].title).toBe("Segundo post");
      expect(responseBody[1].title).toBe("Primeiro post");
      expect(responseBody[0].owner_username).toBe("autorfeed");
      expect(responseBody[0].status).toBe("published");
    });
  });

  describe("Activated user", () => {
    test("Reads the feed while logged in", async () => {
      const reader = await orchestrator.createUser({ username: "leitorfeed" });
      const activatedReader = await orchestrator.activateUser(reader);
      const readerSession = await orchestrator.createSession(activatedReader);

      const response = await fetch(`${webserver.origin}/api/v1/contents`, {
        headers: {
          Cookie: `session_id=${readerSession.token}`,
        },
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.length).toBe(2);
    });
  });

  describe("Pagination", () => {
    test("Returns one page and the total count", async () => {
      const firstPage = await fetch(
        `${webserver.origin}/api/v1/contents?page=1&per_page=1`,
      );

      expect(firstPage.status).toBe(200);
      const firstPageBody = await firstPage.json();
      expect(firstPageBody).toHaveLength(1);
      expect(firstPage.headers.get("X-Total-Count")).toBe("2");
      expect(firstPage.headers.get("X-Page")).toBe("1");
      expect(firstPage.headers.get("X-Per-Page")).toBe("1");

      const secondPage = await fetch(
        `${webserver.origin}/api/v1/contents?page=2&per_page=1`,
      );
      const secondPageBody = await secondPage.json();
      expect(secondPageBody).toHaveLength(1);
      expect(secondPageBody[0].id).not.toBe(firstPageBody[0].id);
    });

    test("Filters the feed by author username", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/contents?username=autorfeed`,
      );

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.length).toBe(2);
      expect(
        responseBody.every((item) => item.owner_username === "autorfeed"),
      ).toBe(true);
      expect(response.headers.get("X-Total-Count")).toBe("2");

      const emptyResponse = await fetch(
        `${webserver.origin}/api/v1/contents?username=leitorfeed`,
      );
      expect(await emptyResponse.json()).toEqual([]);
    });

    test("Rejects an invalid author username", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/contents?username=ab`,
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ValidationError");
    });

    test("Rejects an invalid page", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/contents?page=0`,
      );

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.name).toBe("ValidationError");
    });
  });

  describe("Typed filters", () => {
    test("Lists recent comments with with_children=true", async () => {
      const author = await orchestrator.createUser({
        username: "autorcomentarios",
      });
      await orchestrator.activateUser(author);

      const root = await orchestrator.createContent({
        owner_id: author.id,
        title: "Post com comentário",
        body: "Corpo do post para receber comentário.",
      });

      await orchestrator.createContent({
        owner_id: author.id,
        parent_id: root.id,
        body: "Comentário recente sobre o manejo.",
      });

      const roots = await fetch(`${webserver.origin}/api/v1/contents`);
      const rootsBody = await roots.json();
      expect(rootsBody.every((item) => item.parent_id === null)).toBe(true);

      const comments = await fetch(
        `${webserver.origin}/api/v1/contents?with_children=true&strategy=new`,
      );
      expect(comments.status).toBe(200);
      const commentsBody = await comments.json();
      expect(commentsBody.length).toBeGreaterThanOrEqual(1);
      expect(commentsBody.every((item) => item.parent_id !== null)).toBe(true);
      expect(
        commentsBody.some((item) => item.body.includes("Comentário recente")),
      ).toBe(true);
    });

    test("Filters sponsored ads with type=ad", async () => {
      const author = await orchestrator.createUser({
        username: "autorclassificados",
        activate: true,
      });

      await orchestrator.createBalance({
        balanceType: "user:tabcash",
        recipientId: author.id,
        amount: 200,
      });

      await orchestrator.createContent({
        owner_id: author.id,
        title: "Anúncio de insumos",
        body: "Texto longo o bastante para passar nas validações do conteúdo patrocinado agro.",
        type: "ad",
      });

      const ads = await fetch(
        `${webserver.origin}/api/v1/contents?type=ad&strategy=new`,
      );
      expect(ads.status).toBe(200);
      const adsBody = await ads.json();
      expect(adsBody.length).toBeGreaterThanOrEqual(1);
      expect(adsBody.every((item) => item.type === "ad")).toBe(true);
      expect(adsBody.every((item) => item.parent_id === null)).toBe(true);
    });
  });
});
