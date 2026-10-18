// Patrocínio é um link externo publicado por uma conta.
// Sem cobrança e sem saldo: só o anúncio e quem contribuiu.
exports.up = (pgm) => {
  pgm.createTable("sponsorships", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    owner_id: {
      type: "uuid",
      notNull: true,
    },

    title: {
      type: "varchar(256)",
      notNull: true,
    },

    url: {
      type: "varchar(2048)",
      notNull: true,
    },

    status: {
      type: "varchar(30)",
      notNull: true,
      default: "published",
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

  pgm.createIndex("sponsorships", ["status", "created_at"]);
};

exports.down = (pgm) => {
  pgm.dropTable("sponsorships");
};
