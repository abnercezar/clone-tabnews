// Campos novos com valor padrão: contas existentes continuam iguais.
exports.up = (pgm) => {
  pgm.addColumns("users", {
    // Produtor, agrônomo, técnico... (lista em models/profile.js).
    occupation: {
      type: "varchar(30)",
      notNull: false,
    },

    // Slugs de tags da categoria 'cultura'.
    crops: {
      type: "varchar(40)[]",
      notNull: true,
      default: pgm.func("'{}'::varchar[]"),
    },

    // Sigla da UF.
    state: {
      type: "varchar(2)",
      notNull: false,
    },

    // Selo "Membro fundador", atribuído manualmente por admin.
    founder: {
      type: "boolean",
      notNull: true,
      default: false,
    },

    // Aviso por e-mail quando alguém responde.
    notify_replies: {
      type: "boolean",
      notNull: true,
      default: true,
    },

    // Identificador da conta Google ("sub"), quando o login é pelo Google.
    google_id: {
      type: "varchar(64)",
      notNull: false,
      unique: true,
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns("users", [
    "occupation",
    "crops",
    "state",
    "founder",
    "notify_replies",
    "google_id",
  ]);
};
