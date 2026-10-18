// Contas ativadas antes da publicação de conteúdos não receberam
// "create:content" nem "read:content".
const CONTENT_FEATURES = ["create:content", "read:content"];

exports.up = (pgm) => {
  for (const feature of CONTENT_FEATURES) {
    pgm.sql(`
      UPDATE
        users
      SET
        features = array_append(features, '${feature}'),
        updated_at = timezone('utc', now())
      WHERE
        'create:session' = ANY(features)
        AND NOT ('${feature}' = ANY(features))
      ;
    `);
  }
};

exports.down = (pgm) => {
  for (const feature of CONTENT_FEATURES) {
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
