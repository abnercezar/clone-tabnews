import webserver from "infra/webserver";

const DESCRIPTION =
  "Comunidade do agronegócio brasileiro. Conhecimento do agro merece circular.";

// Organização e site, só com dados que o AgroTab realmente publica.
export function siteJsonLd() {
  const origin = webserver.canonicalOrigin;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: "AgroTab",
        url: `${origin}/`,
        logo: {
          "@type": "ImageObject",
          url: `${origin}/logo-agrotab.png`,
        },
        description: DESCRIPTION,
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: "AgroTab",
        url: `${origin}/`,
        inLanguage: "pt-BR",
        description: DESCRIPTION,
        publisher: { "@id": `${origin}/#organization` },
      },
    ],
  };
}
