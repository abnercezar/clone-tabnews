import webserver from "infra/webserver.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("SEO e compartilhamento", () => {
  test("robots.txt aponta o sitemap e protege a API", async () => {
    const response = await fetch(`${webserver.origin}/robots.txt`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");

    const body = await response.text();
    expect(body).toContain("Disallow: /api/");
    expect(body).toContain("Allow: /api/og");
    expect(body).toContain(`Sitemap: ${webserver.origin}/sitemap.xml`);
  });

  test("sitemap.xml lista publicações e tags com conteúdo", async () => {
    const author = await orchestrator.createUser({
      username: "autorSitemap",
      activate: true,
    });
    const post = await orchestrator.createContent({
      owner_id: author.id,
      title: "Colheita do milho safrinha",
      tags: ["milho"],
    });
    await orchestrator.createContent({
      owner_id: author.id,
      parent_id: post.id,
      body: "Comentário não entra no sitemap.",
    });

    const response = await fetch(`${webserver.origin}/sitemap.xml`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/xml");

    const body = await response.text();
    expect(body).toContain(
      `<loc>${webserver.origin}/autorSitemap/${post.slug}</loc>`,
    );
    expect(body).toContain(`<loc>${webserver.origin}/tag/milho</loc>`);
    expect(body).not.toContain(`<loc>${webserver.origin}/tag/trigo</loc>`);
    expect(body).not.toContain("comentario-nao-entra");
  });

  test("Página do post tem og:image, cartão grande e JSON-LD", async () => {
    const author = await orchestrator.createUser({
      username: "autorPrevia",
      activate: true,
    });
    const post = await orchestrator.createContent({
      owner_id: author.id,
      title: "Como controlar percevejo na soja após o R5?",
      body: "Texto da pergunta.",
      tags: ["soja"],
    });

    const response = await fetch(
      `${webserver.origin}/autorPrevia/${post.slug}`,
    );
    expect(response.status).toBe(200);

    const html = await response.text();
    expect(html).toContain(
      `<meta property="og:image" content="${webserver.origin}/api/og?username=autorPrevia&amp;slug=${post.slug}`,
    );
    expect(html).toContain(
      '<meta name="twitter:card" content="summary_large_image"/>',
    );
    expect(html).toContain('"@type":"DiscussionForumPosting"');
    expect(html).toContain(
      '"headline":"Como controlar percevejo na soja após o R5?"',
    );
    expect(html).toContain("https://wa.me/?text=");
  });

  test("/api/og gera a imagem de prévia", async () => {
    const response = await fetch(`${webserver.origin}/api/og`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
  });

  test("Home tem o novo título e a imagem padrão", async () => {
    const response = await fetch(`${webserver.origin}/`);
    const html = await response.text();
    expect(html).toContain("Pergunte a quem já passou por isso no campo.");
    expect(html).toContain("Ver discussões");
    expect(html).toContain(
      `<meta property="og:image" content="${webserver.origin}/api/og"/>`,
    );
    expect(html).not.toContain("Clique na cena para largar de novo");
  });
});
