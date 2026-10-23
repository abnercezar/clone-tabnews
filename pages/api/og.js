import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import webserver from "infra/webserver.js";

// Imagem de prévia (1200×630) para WhatsApp, redes sociais e buscadores.
// O cartão junta a cena do trator com a logo. O texto da publicação vem da
// API pública, nunca de parâmetros da URL.
const WIDTH = 1200;
const HEIGHT = 630;
const GREEN = "#1f6f3f";
const TITLE_MAX_LENGTH = 90;
const PHOTO_HEIGHT = 400;

let cachedAssets;

function serverOrigin(request) {
  // Em desenvolvimento o Next pode não estar na porta 3000. A prévia precisa
  // ler a publicação neste mesmo processo. Em produção segue o domínio público.
  if (process.env.NODE_ENV === "production") {
    return webserver.origin;
  }

  const host = request.headers.host;
  if (typeof host === "string" && /^[a-z0-9.:-]+$/i.test(host)) {
    return `http://${host}`;
  }

  return webserver.origin;
}

export default async function handler(request, response) {
  const origin = serverOrigin(request);
  const url = new URL(request.url, origin);
  const username = url.searchParams.get("username");
  const slug = url.searchParams.get("slug");

  let content = null;
  if (username && slug) {
    content = await fetchContent(origin, username, slug);
  }

  const assets = await loadAssets();
  const image = content ? (
    <ContentImage assets={assets} content={content} />
  ) : (
    <DefaultImage assets={assets} />
  );

  const imageResponse = new ImageResponse(image, {
    width: WIDTH,
    height: HEIGHT,
  });
  const buffer = Buffer.from(await imageResponse.arrayBuffer());

  response.setHeader("Content-Type", "image/png");
  response.setHeader(
    "Cache-Control",
    content
      ? "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
      : "public, max-age=86400, s-maxage=604800",
  );
  response.status(200).send(buffer);
}

async function loadAssets() {
  if (!cachedAssets) {
    const [tractor, logo] = await Promise.all([
      readFile(path.join(process.cwd(), "public", "cena-trator.jpg")),
      readFile(path.join(process.cwd(), "public", "logo-agrotab.png")),
    ]);
    cachedAssets = {
      tractor: `data:image/jpeg;base64,${tractor.toString("base64")}`,
      // O arquivo se chama .png, mas os bytes são JPEG. Satori só desenha
      // a logo se o tipo bater com o conteúdo.
      logo: `data:image/jpeg;base64,${logo.toString("base64")}`,
    };
  }
  return cachedAssets;
}

async function fetchContent(origin, username, slug) {
  try {
    const response = await fetch(
      `${origin}/api/v1/contents/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`,
    );
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

function truncate(text, maxLength) {
  const value = String(text || "").trim();
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function Scene({ assets, children }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
      }}
    >
      <img
        src={assets.tractor}
        width={WIDTH}
        height={PHOTO_HEIGHT}
        style={{ objectFit: "cover", objectPosition: "center" }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexGrow: 1,
          gap: 28,
          padding: "16px 36px",
        }}
      >
        <img
          src={assets.logo}
          width={168}
          height={168}
          style={{ objectFit: "contain" }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: 900,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function ContentImage({ assets, content }) {
  return (
    <Scene assets={assets}>
      <div
        style={{
          display: "flex",
          fontSize: 22,
          fontWeight: 700,
          color: GREEN,
        }}
      >
        AgroTab
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 8,
          fontSize: 36,
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: "-0.02em",
          color: "#1b2a1f",
        }}
      >
        {truncate(content.title, TITLE_MAX_LENGTH)}
      </div>
    </Scene>
  );
}

function DefaultImage({ assets }) {
  return (
    <Scene assets={assets}>
      <div
        style={{
          display: "flex",
          fontSize: 22,
          fontWeight: 700,
          color: GREEN,
        }}
      >
        AgroTab
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 8,
          fontSize: 36,
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: "-0.02em",
          color: "#1b2a1f",
        }}
      >
        Conhecimento do agro merece circular
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 10,
          fontSize: 24,
          color: GREEN,
          fontWeight: 600,
        }}
      >
        agrotab.com.br
      </div>
    </Scene>
  );
}
