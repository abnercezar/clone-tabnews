// Leitura de feeds RSS 2.0 e Atom sem dependência externa. Os portais do
// agro publicam feeds simples (WordPress, Plone, Liferay); este parser cobre
// título, link, data e descrição, que é tudo o que a curadoria usa.

// Fontes padrão. Dá para trocar a lista inteira pela variável NEWS_FEEDS
// (JSON: [{"name": "...", "url": "..."}]). Feed fora do ar é ignorado na
// execução e aparece no relatório da coleta.
export const DEFAULT_FEEDS = [
  { name: "Canal Rural", url: "https://www.canalrural.com.br/feed/" },
  { name: "AgFeed", url: "https://agfeed.com.br/feed/" },
  {
    name: "Notícias Agrícolas",
    url: "https://www.noticiasagricolas.com.br/rss/",
  },
  { name: "Globo Rural", url: "https://globorural.globo.com/rss/globorural/" },
  { name: "O Presente Rural", url: "https://opresenterural.com.br/feed/" },
  {
    name: "Portal do Agronegócio",
    url: "https://www.portaldoagronegocio.com.br/feed",
  },
  {
    name: "Ministério da Agricultura",
    url: "https://www.gov.br/agricultura/pt-br/assuntos/noticias/RSS",
  },
  {
    name: "Conab",
    url: "https://www.gov.br/conab/pt-br/assuntos/noticias/RSS",
  },
];

const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

function decodeEntities(text) {
  return String(text || "").replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (match, entity) => {
      if (entity[0] === "#") {
        const codePoint =
          entity[1].toLowerCase() === "x"
            ? parseInt(entity.slice(2), 16)
            : parseInt(entity.slice(1), 10);
        try {
          return String.fromCodePoint(codePoint);
        } catch {
          return "";
        }
      }
      return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
    },
  );
}

function unwrapCdata(text) {
  return String(text || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

// Texto puro: tira CDATA, tags HTML e entidades, e colapsa espaços.
export function toPlainText(text) {
  const withoutCdata = unwrapCdata(text);
  // Algumas fontes escapam o HTML dentro da descrição (&lt;p&gt;), então
  // decodifica, remove tags e decodifica de novo o que sobrou.
  const decoded = decodeEntities(withoutCdata);
  return decodeEntities(decoded.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function readTag(block, tagNames) {
  for (const tagName of tagNames) {
    const pattern = new RegExp(
      `<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)</${tagName}>`,
      "i",
    );
    const match = block.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return "";
}

function readAtomLink(block) {
  const links = block.match(/<link\b[^>]*>/gi) || [];
  for (const link of links) {
    const rel = link.match(/\brel=["']([^"']+)["']/i);
    const href = link.match(/\bhref=["']([^"']+)["']/i);
    if (href && (!rel || rel[1] === "alternate")) {
      return href[1];
    }
  }
  return "";
}

function parseDate(value) {
  const plain = toPlainText(value);
  if (!plain) return null;
  const date = new Date(plain);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Remove parâmetros de rastreio e a âncora, para reconhecer a mesma
// notícia vinda com links diferentes.
export function normalizeUrl(url) {
  let parsed;
  try {
    parsed = new URL(String(url || "").trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  parsed.hash = "";
  for (const key of [...parsed.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid|mc_|ref$)/i.test(key)) {
      parsed.searchParams.delete(key);
    }
  }
  parsed.protocol = "https:";
  parsed.hostname = parsed.hostname.toLowerCase();

  let normalized = parsed.toString();
  if (normalized.endsWith("/") && parsed.pathname !== "/") {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

// Chave usada para juntar a mesma notícia publicada por portais diferentes
// com títulos quase iguais.
export function titleKey(title) {
  return toPlainText(title)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseFeed(xml, sourceName) {
  const text = String(xml || "");
  const isAtom = /<feed[\s>]/i.test(text) && !/<rss[\s>]/i.test(text);
  const blocks = isAtom
    ? text.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || []
    : text.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];

  const items = [];

  for (const block of blocks) {
    const title = toPlainText(readTag(block, ["title"]));
    const rawLink = isAtom
      ? readAtomLink(block)
      : toPlainText(readTag(block, ["link"])) ||
        toPlainText(readTag(block, ["guid"]));
    const url = normalizeUrl(rawLink);

    if (!title || !url) {
      continue;
    }

    const description = toPlainText(
      readTag(block, ["description", "summary", "content:encoded", "content"]),
    );
    const publishedAt = parseDate(
      readTag(block, ["pubDate", "published", "updated", "dc:date"]),
    );

    items.push({
      source_name: sourceName,
      url,
      title: title.slice(0, 512),
      description: description.slice(0, 1200),
      published_at: publishedAt,
    });
  }

  return items;
}

// Fica com as notícias recentes, sem repetir link nem título.
export function selectRecent(items, { since, now = new Date() } = {}) {
  const seenUrls = new Set();
  const seenTitles = new Set();
  const recent = [];

  const sorted = [...items].sort(
    (a, b) =>
      (b.published_at?.getTime() ?? 0) - (a.published_at?.getTime() ?? 0),
  );

  for (const item of sorted) {
    if (item.published_at && since && item.published_at < since) continue;
    if (item.published_at && item.published_at > now) {
      item.published_at = now;
    }

    const key = titleKey(item.title);
    if (seenUrls.has(item.url) || seenTitles.has(key)) continue;

    seenUrls.add(item.url);
    seenTitles.add(key);
    recent.push(item);
  }

  return recent;
}

export function feedsFromEnvironment(value = process.env.NEWS_FEEDS) {
  if (!value) {
    return DEFAULT_FEEDS;
  }

  try {
    const parsed = JSON.parse(value);
    const feeds = (Array.isArray(parsed) ? parsed : []).filter(
      (feed) =>
        feed &&
        typeof feed.name === "string" &&
        feed.name.trim() &&
        normalizeUrl(feed.url),
    );
    return feeds.length > 0 ? feeds : DEFAULT_FEEDS;
  } catch {
    return DEFAULT_FEEDS;
  }
}

const newsFeed = {
  DEFAULT_FEEDS,
  parseFeed,
  normalizeUrl,
  titleKey,
  toPlainText,
  selectRecent,
  feedsFromEnvironment,
};

export default newsFeed;
