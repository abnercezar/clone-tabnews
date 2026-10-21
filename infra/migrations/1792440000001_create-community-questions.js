// Pergunta da Comunidade: uma pergunta ativa por vez na home, com enquete
// opcional e contribuições que viram publicações reais em `contents`.
// As FKs ficam entre as tabelas novas (integridade do voto); user_id e
// content_id seguem o padrão do projeto, sem FK para users/contents.
const CATEGORIES = [
  "lavoura",
  "pecuaria",
  "manejo",
  "clima",
  "comercializacao",
  "credito-rural",
  "custos",
  "gestao",
  "tecnologia",
];

const categoryCheck = `IN (${CATEGORIES.map((category) => `'${category}'`).join(", ")})`;

exports.up = (pgm) => {
  pgm.createTable("community_questions", {
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
    description: {
      type: "varchar(1000)",
    },
    category: {
      type: "varchar(30)",
      notNull: true,
      check: `category ${categoryCheck}`,
    },
    // 'open' só recebe experiências; 'poll' também tem alternativas.
    kind: {
      type: "varchar(10)",
      notNull: true,
      check: "kind IN ('open', 'poll')",
    },
    // 'after_vote': resultado por alternativa só para quem votou ou após o fim.
    results_visibility: {
      type: "varchar(20)",
      notNull: true,
      default: "after_vote",
      check: "results_visibility IN ('after_vote', 'always')",
    },
    starts_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
    ends_at: {
      type: "timestamptz",
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

  pgm.addConstraint(
    "community_questions",
    "community_questions_period_check",
    "CHECK (ends_at IS NULL OR ends_at > starts_at)",
  );
  pgm.createIndex("community_questions", ["starts_at", "ends_at"]);

  pgm.createTable("community_question_options", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    question_id: {
      type: "uuid",
      notNull: true,
      references: "community_questions",
      onDelete: "CASCADE",
    },
    label: {
      type: "varchar(120)",
      notNull: true,
    },
    position: {
      type: "smallint",
      notNull: true,
    },
  });

  pgm.addConstraint(
    "community_question_options",
    "community_question_options_question_position_unique",
    "UNIQUE (question_id, position)",
  );
  // Alvo da FK composta do voto: garante que a alternativa é da pergunta.
  pgm.addConstraint(
    "community_question_options",
    "community_question_options_question_id_unique",
    "UNIQUE (question_id, id)",
  );

  pgm.createTable("community_question_votes", {
    id: {
      type: "uuid",
      primaryKey: true,
      default: pgm.func("gen_random_uuid()"),
    },
    question_id: {
      type: "uuid",
      notNull: true,
    },
    option_id: {
      type: "uuid",
      notNull: true,
    },
    user_id: {
      type: "uuid",
      notNull: true,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });

  // Um voto por pessoa e pergunta, inclusive sob requisições simultâneas.
  pgm.addConstraint(
    "community_question_votes",
    "community_question_votes_question_user_unique",
    "UNIQUE (question_id, user_id)",
  );
  pgm.addConstraint(
    "community_question_votes",
    "community_question_votes_option_fk",
    `FOREIGN KEY (question_id, option_id)
      REFERENCES community_question_options (question_id, id)
      ON DELETE CASCADE`,
  );
  pgm.createIndex("community_question_votes", ["question_id", "option_id"]);

  pgm.createTable("community_question_contents", {
    content_id: {
      type: "uuid",
      primaryKey: true,
    },
    question_id: {
      type: "uuid",
      notNull: true,
      references: "community_questions",
      onDelete: "CASCADE",
    },
    category: {
      type: "varchar(30)",
      notNull: true,
      check: `category ${categoryCheck}`,
    },
    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("timezone('utc', now())"),
    },
  });

  pgm.createIndex("community_question_contents", ["question_id", "category"]);
};

exports.down = (pgm) => {
  pgm.dropTable("community_question_contents");
  pgm.dropTable("community_question_votes");
  pgm.dropTable("community_question_options");
  pgm.dropTable("community_questions");
};
