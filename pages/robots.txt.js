import webserver from "infra/webserver";

// Em prévias da Vercel nada é indexado: só o domínio de produção.
export async function getServerSideProps({ res }) {
  const isPreview = process.env.VERCEL_ENV === "preview";
  const body = isPreview
    ? ["User-agent: *", "Disallow: /"].join("\n")
    : [
        "User-agent: *",
        "Allow: /",
        "Allow: /api/og",
        "Disallow: /api/",
        "Disallow: /moderacao",
        "Disallow: /perfil",
        "Disallow: /cadastro/ativar/",
        "Disallow: /cadastro/recuperar/",
        "",
        `Sitemap: ${webserver.canonicalOrigin}/sitemap.xml`,
      ].join("\n");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=86400");
  res.write(`${body}\n`);
  res.end();

  return { props: {} };
}

export default function Robots() {
  return null;
}
