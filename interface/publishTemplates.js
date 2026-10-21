// Roteiros para quem não sabe por onde começar; o texto entre colchetes é guia.
export const PUBLISH_TEMPLATES = [
  {
    id: "pergunta",
    label: "Pergunta técnica",
    description: "Um problema na lavoura ou na criação",
    body: [
      "**Cultura/criação:** [ex.: soja, café, gado de corte]",
      "**Região:** [município/UF ou bioma]",
      "",
      "## O problema",
      "[Descreva o que está acontecendo e desde quando.]",
      "",
      "## O que já tentei",
      "[Produtos, doses, manejos e resultados.]",
      "",
      "## Minha dúvida",
      "[O que você quer saber da comunidade?]",
    ].join("\n"),
  },
  {
    id: "relato",
    label: "Relato de campo",
    description: "Algo que você testou e deu resultado",
    body: [
      "**Cultura/criação:** [ex.: milho safrinha, leite]",
      "**Região:** [município/UF ou bioma]",
      "**Área/rebanho:** [ex.: 120 ha, 80 vacas]",
      "",
      "## Contexto",
      "[Qual era a situação antes?]",
      "",
      "## O que foi feito",
      "[Manejo, tecnologia ou prática adotada, com datas.]",
      "",
      "## Resultado",
      "[O que mudou — números, se tiver.]",
      "",
      "## O que eu faria diferente",
      "[Aprendizados para quem quiser repetir.]",
    ].join("\n"),
  },
  {
    id: "safra",
    label: "Resultado de safra",
    description: "Números, clima e manejo da temporada",
    body: [
      "**Cultura e safra:** [ex.: soja 2025/26]",
      "**Região:** [município/UF ou bioma]",
      "**Cultivar/híbrido:** [nome]",
      "",
      "## Números",
      "- Área plantada: [ha]",
      "- Produtividade: [sc/ha]",
      "- Custo por hectare: [R$/ha]",
      "",
      "## Clima e manejo",
      "[Chuva, plantio, adubação, pragas e doenças da safra.]",
      "",
      "## Conclusão",
      "[O que funcionou e o que não funcionou.]",
    ].join("\n"),
  },
];

export function findPublishTemplate(id) {
  return PUBLISH_TEMPLATES.find((template) => template.id === id) || null;
}

// Trechos-guia entre colchetes ("[ex.: soja, café, gado de corte]") que
// continuam no texto: sinal de que o modelo foi publicado sem preencher.
const TEMPLATE_GUIDES = [
  ...new Set(
    PUBLISH_TEMPLATES.flatMap((template) =>
      template.body.match(/\[[^\]\n]+\]/g),
    ),
  ),
];

export function findTemplateGuides(body) {
  const text = String(body || "");
  return TEMPLATE_GUIDES.filter((guide) => text.includes(guide));
}

const DRAFT_PREFIX = "agrotab:publicar:rascunho:";

export function readPublishDraft(userId, storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(DRAFT_PREFIX + userId);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (typeof draft?.title !== "string" || typeof draft?.body !== "string") {
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function writePublishDraft(
  userId,
  draft,
  storage = globalThis.localStorage,
) {
  try {
    if (!draft.title.trim() && !draft.body.trim()) {
      storage?.removeItem(DRAFT_PREFIX + userId);
      return;
    }
    storage?.setItem(DRAFT_PREFIX + userId, JSON.stringify(draft));
  } catch {
    // Sem armazenamento, o texto vive só enquanto a página estiver aberta.
  }
}

export function clearPublishDraft(userId, storage = globalThis.localStorage) {
  try {
    storage?.removeItem(DRAFT_PREFIX + userId);
  } catch {
    // Idem.
  }
}
