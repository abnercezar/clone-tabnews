// Tags fixas por cultura/criação, tema e região/bioma. Cada publicação
// escolhe de 1 a 3; a lista é curada (não há criação livre de tags).
const TAGS = [
  ["cultura", "soja", "Soja"],
  ["cultura", "milho", "Milho"],
  ["cultura", "cafe", "Café"],
  ["cultura", "cana", "Cana-de-açúcar"],
  ["cultura", "algodao", "Algodão"],
  ["cultura", "trigo", "Trigo"],
  ["cultura", "feijao", "Feijão"],
  ["cultura", "hortifruti", "Hortifrúti"],
  ["cultura", "pecuaria-de-corte", "Pecuária de corte"],
  ["cultura", "pecuaria-de-leite", "Pecuária de leite"],
  ["cultura", "aves", "Aves"],
  ["cultura", "suinos", "Suínos"],
  ["cultura", "piscicultura", "Piscicultura"],
  ["tema", "pragas-e-doencas", "Pragas e doenças"],
  ["tema", "solo-e-nutricao", "Solo e nutrição"],
  ["tema", "maquinas", "Máquinas"],
  ["tema", "mercado", "Mercado"],
  ["tema", "gestao", "Gestão"],
  ["tema", "credito-rural", "Crédito rural"],
  ["regiao", "norte", "Norte"],
  ["regiao", "nordeste", "Nordeste"],
  ["regiao", "centro-oeste", "Centro-Oeste"],
  ["regiao", "sudeste", "Sudeste"],
  ["regiao", "sul", "Sul"],
  ["regiao", "cerrado", "Cerrado"],
  ["regiao", "amazonia", "Amazônia"],
  ["regiao", "mata-atlantica", "Mata Atlântica"],
  ["regiao", "caatinga", "Caatinga"],
  ["regiao", "pampa", "Pampa"],
  ["regiao", "pantanal", "Pantanal"],
];

exports.up = (pgm) => {
  pgm.createTable("tags", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },

    slug: {
      type: "varchar(40)",
      notNull: true,
      unique: true,
    },

    label: {
      type: "varchar(60)",
      notNull: true,
    },

    // 'cultura', 'tema' ou 'regiao'.
    category: {
      type: "varchar(20)",
      notNull: true,
    },

    position: {
      type: "integer",
      notNull: true,
      default: 0,
    },

    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });

  pgm.createTable("content_tags", {
    content_id: {
      type: "uuid",
      notNull: true,
      references: "contents",
      onDelete: "CASCADE",
    },

    tag_id: {
      type: "uuid",
      notNull: true,
      references: "tags",
      onDelete: "CASCADE",
    },

    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });

  pgm.addConstraint("content_tags", "content_tags_pkey", {
    primaryKey: ["content_id", "tag_id"],
  });
  pgm.createIndex("content_tags", "tag_id");

  TAGS.forEach(([category, slug, label], position) => {
    pgm.sql(`
      INSERT INTO tags (slug, label, category, position)
      VALUES ('${slug}', '${label}', '${category}', ${position})
      ON CONFLICT (slug) DO NOTHING;
    `);
  });
};

exports.down = (pgm) => {
  pgm.dropTable("content_tags");
  pgm.dropTable("tags");
};
