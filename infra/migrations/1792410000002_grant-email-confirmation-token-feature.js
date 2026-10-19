// Contas existentes e anônimos precisam de "read:email_confirmation_token"
// para confirmar alteração de e-mail via PATCH /api/v1/email-confirmation.
const FEATURE = "read:email_confirmation_token";

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
