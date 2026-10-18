// Quem publica passa a poder qualificar (votar TabCoins) conteúdos de outros.
exports.up = (pgm) => {
  pgm.sql(`
    UPDATE
      users
    SET
      features = array_append(features, 'update:content'),
      updated_at = timezone('utc', now())
    WHERE
      'create:content' = ANY(features)
      AND NOT ('update:content' = ANY(features))
    ;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    UPDATE
      users
    SET
      features = array_remove(features, 'update:content'),
      updated_at = timezone('utc', now())
    WHERE
      'update:content' = ANY(features)
    ;
  `);
};
