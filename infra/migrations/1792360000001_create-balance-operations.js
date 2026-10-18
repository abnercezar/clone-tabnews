// Ledger de TabCoins e TabCash no mesmo desenho do TabNews:
// operações append-only + funções SQL de saldo atual.
exports.up = (pgm) => {
  pgm.createTable("content_tabcoin_operations", {
    id: {
      type: "uuid",
      default: pgm.func("gen_random_uuid()"),
      notNull: true,
      primaryKey: true,
    },
    sequence: {
      type: "serial",
      notNull: true,
    },
    balance_type: {
      type: "text",
      notNull: true,
    },
    recipient_id: {
      type: "uuid",
      notNull: true,
    },
    amount: {
      type: "integer",
      notNull: true,
    },
    originator_type: {
      type: "text",
      notNull: true,
    },
    originator_id: {
      type: "uuid",
      notNull: true,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });

  pgm.createTable("user_tabcoin_operations", {
    id: {
      type: "uuid",
      default: pgm.func("gen_random_uuid()"),
      notNull: true,
      primaryKey: true,
    },
    sequence: {
      type: "serial",
      notNull: true,
    },
    recipient_id: {
      type: "uuid",
      notNull: true,
    },
    amount: {
      type: "integer",
      notNull: true,
    },
    originator_type: {
      type: "text",
      notNull: true,
    },
    originator_id: {
      type: "uuid",
      notNull: true,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });

  pgm.createTable("user_tabcash_operations", {
    id: {
      type: "uuid",
      default: pgm.func("gen_random_uuid()"),
      notNull: true,
      primaryKey: true,
    },
    sequence: {
      type: "serial",
      notNull: true,
    },
    recipient_id: {
      type: "uuid",
      notNull: true,
    },
    amount: {
      type: "integer",
      notNull: true,
    },
    originator_type: {
      type: "text",
      notNull: true,
    },
    originator_id: {
      type: "uuid",
      notNull: true,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });

  pgm.createTable("ad_tabcash_operations", {
    id: {
      type: "uuid",
      default: pgm.func("gen_random_uuid()"),
      notNull: true,
      primaryKey: true,
    },
    sequence: {
      type: "serial",
      notNull: true,
    },
    balance_type: {
      type: "text",
      notNull: true,
    },
    recipient_id: {
      type: "uuid",
      notNull: true,
    },
    amount: {
      type: "integer",
      notNull: true,
    },
    originator_type: {
      type: "text",
      notNull: true,
    },
    originator_id: {
      type: "uuid",
      notNull: true,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });

  pgm.createFunction(
    "get_content_current_tabcoins",
    [{ name: "recipient_id_input", mode: "IN", type: "uuid" }],
    { returns: "integer", language: "plpgsql", replace: true },
    `
    DECLARE
      total_tabcoins integer;
    BEGIN
      SELECT COALESCE(SUM(amount), 0)
      INTO total_tabcoins
      FROM content_tabcoin_operations
      WHERE recipient_id = recipient_id_input;
      RETURN total_tabcoins;
    END;
  `,
  );

  pgm.createFunction(
    "get_user_current_tabcoins",
    [{ name: "recipient_id_input", mode: "IN", type: "uuid" }],
    { returns: "integer", language: "plpgsql", replace: true },
    `
    DECLARE
      total_tabcoins integer;
    BEGIN
      SELECT COALESCE(SUM(amount), 0)
      INTO total_tabcoins
      FROM user_tabcoin_operations
      WHERE recipient_id = recipient_id_input;
      RETURN total_tabcoins;
    END;
  `,
  );

  pgm.createFunction(
    "get_user_current_tabcash",
    [{ name: "recipient_id_input", mode: "IN", type: "uuid" }],
    { returns: "integer", language: "plpgsql", replace: true },
    `
    DECLARE
      total_tabcash integer;
    BEGIN
      SELECT COALESCE(SUM(amount), 0)
      INTO total_tabcash
      FROM user_tabcash_operations
      WHERE recipient_id = recipient_id_input;
      RETURN total_tabcash;
    END;
  `,
  );

  pgm.createFunction(
    "get_ad_current_tabcash",
    [{ name: "recipient_id_input", mode: "IN", type: "uuid" }],
    { returns: "integer", language: "plpgsql", replace: true },
    `
    DECLARE
      total_tabcash integer;
    BEGIN
      SELECT COALESCE(SUM(amount), 0)
      INTO total_tabcash
      FROM ad_tabcash_operations
      WHERE recipient_id = recipient_id_input;
      RETURN total_tabcash;
    END;
  `,
  );

  pgm.createFunction(
    "get_content_balance_credit_debit",
    [{ name: "content_id_input", mode: "IN", type: "uuid" }],
    {
      returns:
        "TABLE (total_balance BIGINT, total_credit BIGINT, total_debit BIGINT) ROWS 1",
      language: "plpgsql",
      replace: true,
    },
    `
    BEGIN
      RETURN QUERY
        SELECT
          COALESCE(SUM(amount), 0) AS total_balance,
          COALESCE(SUM(CASE WHEN balance_type = 'credit' THEN amount END), 0) AS total_credit,
          COALESCE(SUM(CASE WHEN balance_type = 'debit' THEN amount END), 0) AS total_debit
        FROM
          content_tabcoin_operations
        WHERE
          recipient_id = content_id_input;
    END;
  `,
  );

  pgm.createIndex("content_tabcoin_operations", ["recipient_id", "balance_type"]);
  pgm.createIndex("user_tabcoin_operations", ["recipient_id"]);
  pgm.createIndex("user_tabcash_operations", ["recipient_id"]);
  pgm.createIndex("ad_tabcash_operations", ["recipient_id", "balance_type"]);
};

exports.down = (pgm) => {
  pgm.dropFunction("get_content_balance_credit_debit", [
    { name: "content_id_input", mode: "IN", type: "uuid" },
  ]);
  pgm.dropFunction("get_ad_current_tabcash", [
    { name: "recipient_id_input", mode: "IN", type: "uuid" },
  ]);
  pgm.dropFunction("get_user_current_tabcash", [
    { name: "recipient_id_input", mode: "IN", type: "uuid" },
  ]);
  pgm.dropFunction("get_user_current_tabcoins", [
    { name: "recipient_id_input", mode: "IN", type: "uuid" },
  ]);
  pgm.dropFunction("get_content_current_tabcoins", [
    { name: "recipient_id_input", mode: "IN", type: "uuid" },
  ]);
  pgm.dropTable("ad_tabcash_operations");
  pgm.dropTable("user_tabcash_operations");
  pgm.dropTable("user_tabcoin_operations");
  pgm.dropTable("content_tabcoin_operations");
};
