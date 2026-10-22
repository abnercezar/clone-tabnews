// Perguntas que rendem conversa em qualquer região; uma por semana do ano.
const WEEKLY_QUESTIONS = [
  {
    title:
      "Qual foi o maior erro que você já cometeu no plantio e o que aprendeu?",
    tag: "soja",
  },
  {
    title: "Como você suplementa o gado na seca sem estourar o custo?",
    tag: "pecuaria-de-corte",
  },
  {
    title: "Qual praga mais deu trabalho na sua lavoura nesta safra?",
    tag: "pragas-e-doencas",
  },
  {
    title: "Vale a pena travar o preço antes do plantio? Como você decide?",
    tag: "mercado",
  },
  {
    title: "Que ajuste na plantadeira mais fez diferença no seu estande?",
    tag: "maquinas",
  },
  {
    title: "Como você está lidando com o custo do adubo nesta safra?",
    tag: "solo-e-nutricao",
  },
];

export function weeklyQuestion(date = new Date()) {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1);
  const week = Math.floor((date.getTime() - startOfYear) / (7 * 864e5));
  return WEEKLY_QUESTIONS[week % WEEKLY_QUESTIONS.length];
}
