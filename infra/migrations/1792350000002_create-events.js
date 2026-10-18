// Trilha do que aconteceu: quem fez, de qual IP e em qual recurso.
// Não guarda saldo nem segredo; serve para auditoria e para limites futuros.
exports.up = (pgm) => {
  pgm.createTable("events", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    type: {
      type: "varchar(100)",
      notNull: true,
    },

    originator_user_id: {
      type: "uuid",
    },

    originator_ip: {
      type: "varchar(100)",
    },

    metadata: {
      type: "jsonb",
    },

    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });

  pgm.createIndex("events", ["type", "created_at"]);
  pgm.createIndex("events", "originator_user_id");
};

exports.down = (pgm) => {
  pgm.dropTable("events");
};
