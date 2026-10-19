import webserver from "infra/webserver.js";

const INVALID_XML_CHARS =
  /[^\t\n\r\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu;

function escapeXml(text) {
  return String(text || "")
    .replace(INVALID_XML_CHARS, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripMarkdown(text, { maxLength = 190 } = {}) {
  const plain = String(text || "")
    .replace(/[#*_`>~\[\]()!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxLength) {
    return plain;
  }

  return `${plain.slice(0, maxLength).trimEnd()}…`;
}

function generateRss2(contentList) {
  const origin = webserver.origin;
  const feedURL = `${origin}/recentes/rss`;
  const updated =
    contentList.length > 0
      ? new Date(contentList[0].updated_at || contentList[0].published_at)
      : new Date();

  const items = contentList
    .map((contentObject) => {
      const contentUrl = `${origin}/${contentObject.owner_username}/${contentObject.slug}`;
      const title = escapeXml(contentObject.title);
      const description = escapeXml(
        stripMarkdown(contentObject.body, { maxLength: 190 }),
      );
      const author = escapeXml(contentObject.owner_username);
      const pubDate = new Date(contentObject.published_at).toUTCString();

      return `    <item>
      <title>${title}</title>
      <link>${contentUrl}</link>
      <guid>${contentUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${description}</description>
      <author>${author}</author>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <title>AgroTab</title>
    <link>${feedURL}</link>
    <description>Conteúdos para quem vive e trabalha o agronegócio brasileiro</description>
    <language>pt</language>
    <lastBuildDate>${updated.toUTCString()}</lastBuildDate>
    <docs>https://validator.w3.org/feed/docs/rss2.html</docs>
${items ? `${items}\n` : ""}  </channel>
</rss>`;
}

const rss = {
  generateRss2,
};

export default rss;
