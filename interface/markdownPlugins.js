import breaks from "@bytemd/plugin-breaks";
import gemoji from "@bytemd/plugin-gemoji";
import gfm from "@bytemd/plugin-gfm";
import gfmLocale from "@bytemd/plugin-gfm/locales/pt_BR.json";
import highlightSsr from "@bytemd/plugin-highlight-ssr";
import math from "@bytemd/plugin-math";
import mathLocale from "@bytemd/plugin-math/locales/pt_BR.json";
import mermaid from "@bytemd/plugin-mermaid";
import mermaidLocale from "@bytemd/plugin-mermaid/locales/pt_BR.json";

// Páginas estáticas (FAQ, termos, contato): GFM + imagens, bundle leve.
export const markdownPluginsLite = [gfm({ locale: gfmLocale }), breaks()];

// Editor e posts/comentários (paridade TabNews): GFM inclui imagens `![](url)`.
export const markdownPlugins = [
  gfm({ locale: gfmLocale }),
  highlightSsr(),
  math({ locale: mathLocale }),
  breaks(),
  gemoji(),
  mermaid({ locale: mermaidLocale }),
];
