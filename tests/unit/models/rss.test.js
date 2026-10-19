import rss from "models/rss.js";
import webserver from "infra/webserver.js";

describe("`models/rss.js`", () => {
  test("generateRss2 builds an empty feed", () => {
    const feed = rss.generateRss2([]);

    expect(feed).toContain('<rss version="2.0">');
    expect(feed).toContain("<title>AgroTab</title>");
    expect(feed).toContain(`<link>${webserver.origin}/recentes/rss</link>`);
    expect(feed).not.toContain("<item>");
  });

  test("generateRss2 includes published items with content URLs", () => {
    const feed = rss.generateRss2([
      {
        title: "Manejo de solo",
        body: "Práticas de conservação no cerrado.",
        owner_username: "produtor",
        slug: "manejo-de-solo",
        published_at: "2026-01-15T12:00:00.000Z",
        updated_at: "2026-01-15T12:00:00.000Z",
      },
    ]);

    expect(feed).toContain("<title>Manejo de solo</title>");
    expect(feed).toContain(
      `<link>${webserver.origin}/produtor/manejo-de-solo</link>`,
    );
    expect(feed).toContain(
      "<description>Práticas de conservação no cerrado.</description>",
    );
  });
});
