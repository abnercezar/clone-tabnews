exports.up = (pgm) => {
  pgm.createTable("contents", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    // Autor do conteúdo. Mantém o padrão do projeto (apenas uuid, sem FK real,
    // como em sessions.user_id e user_activation_tokens.user_id).
    owner_id: {
      type: "uuid",
      notNull: true,
    },

    slug: {
      type: "varchar(256)",
      notNull: true,
    },

    title: {
      type: "varchar(256)",
      notNull: true,
    },

    body: {
      type: "text",
      notNull: true,
    },

    // Valores previstos nesta fase: 'draft' e 'published'.
    status: {
      type: "varchar(10)",
      notNull: true,
      default: "draft",
    },

    published_at: {
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

  // Slug único por autor; também acelera a leitura por (username -> owner) + slug.
  pgm.createIndex("contents", ["owner_id", "slug"], { unique: true });
};

exports.down = (pgm) => {
  pgm.dropTable("contents");
};
