exports.up = (pgm) => {
  pgm.createTable("email_confirmation_tokens", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    user_id: {
      type: "uuid",
      notNull: true,
    },

    // Why 254 in length? https://stackoverflow.com/a/1199238
    email: {
      type: "varchar(254)",
      notNull: true,
    },

    used_at: {
      type: "timestamptz",
      notNull: false,
    },

    expires_at: {
      type: "timestamptz",
      notNull: true,
    },

    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },

    updated_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("email_confirmation_tokens");
};
