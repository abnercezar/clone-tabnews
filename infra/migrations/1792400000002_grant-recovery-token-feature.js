// Contas existentes não receberam "read:recovery_token" (necessária para
// POST/PATCH /api/v1/recovery com sessão autenticada ou conta inativa).
const FEATURE = "read:recovery_token";

exports.up = (pgm) => {
  pgm.sql(`
    UPDATE
      users
    SET
      features = array_append(features, '${FEATURE}'),
      updated_at = timezone('utc', now())
    WHERE
      NOT ('${FEATURE}' = ANY(features))
    ;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    UPDATE
      users
    SET
      features = array_remove(features, '${FEATURE}'),
      updated_at = timezone('utc', now())
    WHERE
      '${FEATURE}' = ANY(features)
    ;
  `);
};
