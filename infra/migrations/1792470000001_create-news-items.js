// Fila da curadoria diária de notícias. Cada item vem de um feed RSS de
// um portal do agro, recebe resumo próprio e só vira publicação no feed
// depois que um moderador aprova.
exports.up = (pgm) => {
  pgm.createTable("news_items", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    source_name: {
      type: "varchar(120)",
      notNull: true,
    },

    // Link normalizado (sem utm_* nem âncora): evita a mesma notícia duas vezes.
    source_url: {
      type: "varchar(2048)",
      notNull: true,
      unique: true,
    },

    original_title: {
      type: "varchar(512)",
      notNull: true,
    },

    title: {
      type: "varchar(256)",
      notNull: true,
    },

    summary: {
      type: "text",
      notNull: true,
    },

    discussion_question: {
      type: "varchar(500)",
      notNull: false,
    },

    tags: {
      type: "text[]",
      notNull: true,
      default: pgm.func("'{}'::text[]"),
    },

    // 1 a 10, dado pela curadoria. Ordena a fila de moderação.
    relevance: {
      type: "smallint",
      notNull: true,
      default: 5,
    },

    // true quando o resumo foi escrito por IA; false no modo sem IA.
    ai_curated: {
      type: "boolean",
      notNull: true,
      default: false,
    },

    source_published_at: {
      type: "timestamptz",
      notNull: false,
    },

    // 'pending', 'published' ou 'rejected'.
    status: {
      type: "varchar(12)",
      notNull: true,
      default: "pending",
    },

    content_id: {
      type: "uuid",
      notNull: false,
      references: "contents",
      onDelete: "SET NULL",
    },

    reviewed_by: {
      type: "uuid",
      notNull: false,
    },

    reviewed_at: {
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

  pgm.createIndex("news_items", ["status", "created_at"]);
};

exports.down = (pgm) => {
  pgm.dropTable("news_items");
};
