// Única exceção à regra de não usar dangerouslySetInnerHTML (ver
// tests/unit/security/no-unsafe-html.test.js): dados estruturados precisam
// sair como JSON cru, e o React escaparia as aspas. O conteúdo vem só de
// JSON.stringify e "<" vira <, então um texto com "</script>" não fecha
// a tag nem injeta HTML.
export function serializeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
