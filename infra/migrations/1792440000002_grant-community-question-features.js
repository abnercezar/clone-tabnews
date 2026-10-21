// Contas ativadas passam a ler e votar na Pergunta da Comunidade;
// admins (quem já edita conteúdo de outros) passam a criar perguntas.
const GRANTS = [
  { feature: "read:community_question", requires: "create:content" },
  { feature: "create:community_question_vote", requires: "create:content" },
  { feature: "create:community_question", requires: "update:content:others" },
];

exports.up = (pgm) => {
  for (const { feature, requires } of GRANTS) {
    pgm.sql(`
      UPDATE
        users
      SET
        features = array_append(features, '${feature}'),
        updated_at = timezone('utc', now())
      WHERE
        '${requires}' = ANY(features)
        AND NOT ('${feature}' = ANY(features))
      ;
    `);
  }
};

exports.down = (pgm) => {
  for (const { feature } of GRANTS) {
    pgm.sql(`
      UPDATE
        users
      SET
        features = array_remove(features, '${feature}'),
        updated_at = timezone('utc', now())
      WHERE
        '${feature}' = ANY(features)
      ;
    `);
  }
};
