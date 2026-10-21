// Sem dependências de servidor: preenche o formulário da moderação.
// As regras de validação continuam em models/community-question.js; o teste
// unitário garante que cada modelo passa por elas.
const communityQuestionTemplates = [
  {
    id: "adubacao-safra",
    title: "Com o adubo ainda caro, o que você fez com a adubação desta safra?",
    description:
      "Fertilizante segue bem acima do preço de antes da crise e tem produtor cortando dose para fechar a conta. Conte o que você decidiu e em qual cultura.",
    category: "custos",
    kind: "poll",
    options: [
      "Mantive a dose recomendada",
      "Reduzi a dose em até 20%",
      "Reduzi a dose em mais de 20%",
      "Troquei de fonte ou formulação",
      "Ajustei por talhão com análise de solo",
    ],
  },
  {
    id: "financiamento-custeio",
    title: "Como você está financiando o custeio desta safra?",
    description:
      "Com o crédito rural mais curto e os juros altos, muita gente está combinando linhas. Marque a principal e conte como ficou a taxa.",
    category: "credito-rural",
    kind: "poll",
    options: [
      "Crédito rural do Plano Safra",
      "Banco com juros livres",
      "Barter (troca por grãos)",
      "CPR",
      "Prazo da revenda ou do fornecedor",
      "Recurso próprio",
    ],
  },
  {
    id: "compra-fertilizante",
    title: "Quando você fechou a compra de fertilizante para esta safra?",
    description:
      "O mesmo adubo variou mais que o dobro de preço ao longo do ano. Saber quando os outros compraram ajuda a planejar a próxima.",
    category: "custos",
    kind: "poll",
    options: [
      "Antes de junho",
      "Entre junho e agosto",
      "Em setembro ou outubro",
      "Estou comprando aos poucos",
      "Ainda não fechei",
    ],
  },
  {
    id: "venda-antecipada",
    title: "Quanto da produção desta safra você já travou na venda?",
    description:
      "Com custo alto e margem apertada, travar preço protege o caixa, mas pode deixar dinheiro na mesa. Como você está fazendo?",
    category: "comercializacao",
    kind: "poll",
    options: ["Nada ainda", "Até 20%", "Entre 20% e 50%", "Mais de 50%"],
  },
  {
    id: "corte-de-custo",
    title: "Onde você conseguiu cortar custo sem perder produtividade?",
    description:
      "Diesel, defensivo, adubo, frete, manutenção: conte o que mudou na sua propriedade, quanto economizou e o que faria diferente.",
    category: "custos",
    kind: "open",
    options: [],
  },
  {
    id: "decisao-ultima-safra",
    title: "Se pudesse voltar à última safra, que decisão você mudaria?",
    description: null,
    category: "gestao",
    kind: "poll",
    options: [
      "Teria comprado os insumos em outro momento",
      "Teria travado parte da venda antecipada",
      "Teria mudado a cultivar ou a época de plantio",
      "Teria contratado seguro rural",
      "Não mudaria nada",
    ],
  },
];

export default communityQuestionTemplates;
