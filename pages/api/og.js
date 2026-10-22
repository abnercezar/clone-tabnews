import { ImageResponse } from "next/og";
import { credentialText } from "models/profile.js";

// Imagem de prévia (1200×630) para WhatsApp, redes sociais e buscadores.
// Roda no Edge: não acessa o banco, lê a publicação pela API pública — assim
// o texto da imagem é sempre o publicado, nunca algo vindo da URL.
export const config = {
  runtime: "edge",
};

const WIDTH = 1200;
const HEIGHT = 630;
const GREEN = "#1f6f3f";
const TITLE_MAX_LENGTH = 110;

export default async function handler(request) {
  const url = new URL(request.url);
  const username = url.searchParams.get("username");
  const slug = url.searchParams.get("slug");

  let content = null;
  if (username && slug) {
    content = await fetchContent(url.origin, username, slug);
  }

  const image = content ? <ContentImage content={content} /> : <DefaultImage />;

  return new ImageResponse(image, {
    width: WIDTH,
    height: HEIGHT,
    headers: {
      // A URL leva a data de edição (?v=), então pode ficar no CDN.
      "Cache-Control": content
        ? "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
        : "public, max-age=86400, s-maxage=604800",
    },
  });
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

function Logo({ size = 56 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={GREEN}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="3" />
      <path d="M12 18v-6" />
      <path d="M12 12c0-3 2-5 5-5 0 3-2 5-5 5Z" />
      <path d="M12 14c0-2.5-1.7-4-4-4 0 2.5 1.7 4 4 4Z" />
    </svg>
  );
}

function Frame({ children }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: "linear-gradient(135deg, #f6fbf3 0%, #e4f2dc 100%)",
        borderBottom: `16px solid ${GREEN}`,
        color: "#1b2a1f",
        fontFamily: "sans-serif",
      }}
    >
      {children}
    </div>
  );
}

function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <Logo />
      <span style={{ fontSize: 40, fontWeight: 700, color: GREEN }}>
        AgroTab
      </span>
    </div>
  );
}

function ContentImage({ content }) {
  const tags = Array.isArray(content.tags) ? content.tags.slice(0, 2) : [];
  const author = content.owner_username;
  const credential = credentialText({
    occupation: content.owner_occupation,
    state: content.owner_state,
  });

  return (
    <Frame>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {tags.length > 0 && (
          <div style={{ display: "flex", gap: 12 }}>
            {tags.map((tag) => (
              <span
                key={tag.slug}
                style={{
                  padding: "8px 20px",
                  borderRadius: 999,
                  background: GREEN,
                  color: "#ffffff",
                  fontSize: 28,
                  fontWeight: 600,
                }}
              >
                {tag.label}
              </span>
            ))}
          </div>
        )}
        <div
          style={{
            display: "flex",
            fontSize: content.title.length > 70 ? 56 : 68,
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
          }}
        >
          {truncate(content.title, TITLE_MAX_LENGTH)}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 32, fontWeight: 600 }}>{author}</span>
          {credential && (
            <span style={{ fontSize: 26, color: "#4b5d50" }}>{credential}</span>
          )}
        </div>
        <Brand />
      </div>
    </Frame>
  );
}

function DefaultImage() {
  return (
    <Frame>
      <Brand />
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          Pergunte a quem já passou por isso no campo.
        </div>
        <div style={{ display: "flex", fontSize: 34, color: "#4b5d50" }}>
          Produtores, agrônomos e técnicos respondendo dúvidas reais da lavoura
          e da criação.
        </div>
      </div>
      <span style={{ fontSize: 28, color: GREEN, fontWeight: 600 }}>
        agrotab.com.br
      </span>
    </Frame>
  );
}
