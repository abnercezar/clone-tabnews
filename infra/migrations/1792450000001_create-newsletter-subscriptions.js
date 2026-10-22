exports.up = (pgm) => {
  pgm.createTable("newsletter_subscriptions", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    // Why 254 in length? https://stackoverflow.com/a/1199238
    email: {
      type: "varchar(254)",
      notNull: true,
    },

    // Vai nos links de confirmação e de saída; troca a cada nova inscrição.
    token: {
      type: "uuid",
      notNull: true,
      unique: true,
      default: pgm.func("gen_random_uuid()"),
    },

    confirmed_at: {
      type: "timestamptz",
      notNull: false,
    },

    unsubscribed_at: {
      type: "timestamptz",
      notNull: false,
    },

    confirmation_sent_at: {
      type: "timestamptz",
      notNull: false,
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

  pgm.sql(`
    CREATE UNIQUE INDEX newsletter_subscriptions_email_lower_idx
    ON newsletter_subscriptions (LOWER(email));
  `);
};

exports.down = (pgm) => {
  pgm.dropTable("newsletter_subscriptions");
};
