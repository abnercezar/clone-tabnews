// Quem já publica passa a poder criar e ler patrocínios.
exports.up = (pgm) => {
  pgm.sql(`
    UPDATE
      users
    SET
      features = features || ARRAY['create:sponsorship', 'read:sponsorship']::varchar[],
      updated_at = timezone('utc', now())
    WHERE
      'create:content' = ANY(features)
      AND NOT ('create:sponsorship' = ANY(features))
    ;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    UPDATE
      users
    SET
      features = array_remove(array_remove(features, 'create:sponsorship'), 'read:sponsorship'),
      updated_at = timezone('utc', now())
    WHERE
      'create:sponsorship' = ANY(features)
      OR 'read:sponsorship' = ANY(features)
    ;
  `);
};
