import newsFeed from "models/news-feed.js";

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Portal Exemplo</title>
    <item>
      <title><![CDATA[Conab eleva estimativa da safra de soja]]></title>
      <link>https://exemplo.com.br/soja-safra/?utm_source=rss&amp;utm_medium=feed</link>
      <pubDate>Tue, 17 Nov 2026 23:53:18 +0000</pubDate>
      <description><![CDATA[<p>A estimativa subiu para 180 milhões de toneladas &amp; o milho também.</p>]]></description>
    </item>
    <item>
      <title>Preço do boi gordo sobe em SP</title>
      <link>https://exemplo.com.br/boi-gordo#comentarios</link>
      <pubDate>Mon, 16 Nov 2026 10:00:00 +0000</pubDate>
      <description>&lt;p&gt;Arroba fecha em alta.&lt;/p&gt;</description>
    </item>
    <item>
      <title></title>
      <link>https://exemplo.com.br/sem-titulo</link>
    </item>
  </channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Feed Atom</title>
  <entry>
    <title>Ferrugem asiática preocupa no MT</title>
    <link rel="alternate" href="https://atom.exemplo.com/ferrugem"/>
    <updated>2026-11-18T08:00:00Z</updated>
    <summary>Produtores relatam focos.</summary>
  </entry>
</feed>`;

describe("models/news-feed", () => {
  test("parseFeed reads RSS 2.0 items, cleans HTML and tracking params", () => {
    const items = newsFeed.parseFeed(RSS, "Portal Exemplo");

    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({
      source_name: "Portal Exemplo",
      url: "https://exemplo.com.br/soja-safra",
      title: "Conab eleva estimativa da safra de soja",
      description:
        "A estimativa subiu para 180 milhões de toneladas & o milho também.",
      published_at: new Date("2026-11-17T23:53:18Z"),
    });
    expect(items[1].url).toBe("https://exemplo.com.br/boi-gordo");
    expect(items[1].description).toBe("Arroba fecha em alta.");
  });

  test("parseFeed reads Atom entries", () => {
    const items = newsFeed.parseFeed(ATOM, "Atom");

    expect(items).toEqual([
      {
        source_name: "Atom",
        url: "https://atom.exemplo.com/ferrugem",
        title: "Ferrugem asiática preocupa no MT",
        description: "Produtores relatam focos.",
        published_at: new Date("2026-11-18T08:00:00Z"),
      },
    ]);
  });

  test("parseFeed returns nothing for invalid content", () => {
    expect(newsFeed.parseFeed("<html>erro</html>", "X")).toEqual([]);
    expect(newsFeed.parseFeed(undefined, "X")).toEqual([]);
  });

  test("normalizeUrl rejects non-http links", () => {
    expect(newsFeed.normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(newsFeed.normalizeUrl("nao e link")).toBeNull();
    expect(newsFeed.normalizeUrl("http://Exemplo.com/a/?fbclid=1&id=2")).toBe(
      "https://exemplo.com/a/?id=2",
    );
  });

  test("selectRecent drops old items, repeated links and repeated titles", () => {
    const now = new Date("2026-11-18T12:00:00Z");
    const since = new Date("2026-11-17T00:00:00Z");
    const items = [
      {
        url: "https://a.com/1",
        title: "Soja sobe na B3",
        published_at: new Date("2026-11-18T10:00:00Z"),
      },
      {
        url: "https://b.com/outra",
        title: "Soja sobe na B3!",
        published_at: new Date("2026-11-18T09:00:00Z"),
      },
      {
        url: "https://a.com/1",
        title: "Outro título",
        published_at: new Date("2026-11-18T08:00:00Z"),
      },
      {
        url: "https://a.com/velha",
        title: "Notícia velha",
        published_at: new Date("2026-11-10T08:00:00Z"),
      },
      { url: "https://a.com/sem-data", title: "Sem data", published_at: null },
    ];

    const recent = newsFeed.selectRecent(items, { since, now });

    expect(recent.map((item) => item.url)).toEqual([
      "https://a.com/1",
      "https://a.com/sem-data",
    ]);
  });

  test("feedsFromEnvironment falls back to the default list", () => {
    expect(newsFeed.feedsFromEnvironment(undefined)).toBe(
      newsFeed.DEFAULT_FEEDS,
    );
    expect(newsFeed.feedsFromEnvironment("{inválido")).toBe(
      newsFeed.DEFAULT_FEEDS,
    );
    expect(
      newsFeed.feedsFromEnvironment(
        JSON.stringify([
          { name: "Meu feed", url: "https://meu.feed/rss" },
          { name: "Sem link", url: "x" },
        ]),
      ),
    ).toEqual([{ name: "Meu feed", url: "https://meu.feed/rss" }]);
  });
});
