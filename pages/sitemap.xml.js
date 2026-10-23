import webserver from "infra/webserver";
import contentModel from "models/content.js";
import tagModel from "models/tag.js";

const STATIC_PATHS = [
  "/",
  "/recentes/todos/1",
  "/sobre",
  "/faq",
  "/termos-de-uso",
  "/contato",
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function urlEntry(path, lastModified) {
  const lastmod = lastModified
    ? `<lastmod>${new Date(lastModified).toISOString()}</lastmod>`
    : "";
  return `<url><loc>${escapeXml(`${webserver.canonicalOrigin}${path}`)}</loc>${lastmod}</url>`;
}

// Uma consulta que falha (tabela ainda não migrada em produção, por exemplo)
// não pode derrubar o sitemap inteiro: as URLs que deram certo continuam.
async function loadOrEmpty(label, load) {
  try {
    return await load();
  } catch (error) {
    console.error(
      `sitemap: falha ao listar ${label}:`,
      error?.cause?.message || error?.message || error,
    );
    return [];
  }
}

// Gerado a cada pedido (com cache no CDN): publicações e tags novas
// aparecem para o Google sem precisar de deploy.
export async function getServerSideProps({ res }) {
  const [contents, tags] = await Promise.all([
    loadOrEmpty("publicações", () => contentModel.findAllForSitemap()),
    loadOrEmpty("tags", () => tagModel.findAllWithPublishedCount()),
  ]);

  const entries = [
    ...STATIC_PATHS.map((path) => urlEntry(path)),
    // Tag sem publicação seria página vazia: fica de fora até ter conteúdo.
    ...tags
      .filter((tag) => tag.published_count > 0)
      .map((tag) => urlEntry(`/tag/${tag.slug}`, tag.last_published_at)),
    ...contents.map((content) =>
      urlEntry(
        `/${encodeURIComponent(content.owner_username)}/${encodeURIComponent(content.slug)}`,
        content.updated_at || content.published_at,
      ),
    ),
  ];

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=3600, stale-while-revalidate=86400",
  );
  res.write(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join("")}</urlset>`,
  );
  res.end();

  return { props: {} };
}

export default function Sitemap() {
  return null;
}
