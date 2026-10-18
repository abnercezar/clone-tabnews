// Quem já podia publicar passa a poder excluir o próprio conteúdo.
exports.up = (pgm) => {
  pgm.sql(`
    UPDATE
      users
    SET
      features = array_append(features, 'delete:content'),
      updated_at = timezone('utc', now())
    WHERE
      'create:content' = ANY(features)
      AND NOT ('delete:content' = ANY(features))
    ;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    UPDATE
      users
    SET
      features = array_remove(features, 'delete:content'),
      updated_at = timezone('utc', now())
    WHERE
      'delete:content' = ANY(features)
    ;
  `);
};
