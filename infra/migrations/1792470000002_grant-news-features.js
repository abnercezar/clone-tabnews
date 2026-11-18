// Admins (quem já edita conteúdo de outros) passam a moderar a curadoria
// de notícias.
const GRANTS = [{ feature: "review:news", requires: "update:content:others" }];

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
