import database from "infra/database.js";
import validator from "models/validator.js";
import communityQuestionCategories from "models/community-question-categories.js";
import { NotFoundError, ValidationError } from "infra/errors.js";

const CATEGORIES = communityQuestionCategories;

const KINDS = ["open", "poll"];
const RESULTS_VISIBILITIES = ["after_vote", "always"];
const DESCRIPTION_MAX = 1000;
const OPTIONS_MIN = 2;
const OPTIONS_MAX = 6;
const OPTION_LABEL_MAX = 120;
const CONTRIBUTIONS_PER_PAGE = 10;

const ACTIVE_CLAUSE = `
  community_questions.starts_at <= timezone('utc', now())
  AND (
    community_questions.ends_at IS NULL
    OR community_questions.ends_at > timezone('utc', now())
  )
`;

function category(value) {
  if (!CATEGORIES.some((item) => item.slug === value)) {
    throw new ValidationError({
      message: "A categoria informada não é válida.",
      action: `Use uma destas categorias: ${CATEGORIES.map((item) => item.slug).join(", ")}.`,
    });
  }
}

function validateCreateInput(input) {
  validator.title(input.title);
  category(input.category);

  if (!KINDS.includes(input.kind)) {
    throw new ValidationError({
      message: "O tipo de pergunta informado não é válido.",
      action: 'Use "open" para respostas abertas ou "poll" para enquete.',
    });
  }

  const resultsVisibility = input.results_visibility ?? "after_vote";
  if (!RESULTS_VISIBILITIES.includes(resultsVisibility)) {
    throw new ValidationError({
      message: "A regra de exibição dos resultados não é válida.",
      action: 'Use "after_vote" ou "always".',
    });
  }

  let description = null;
  if (input.description !== undefined && input.description !== null) {
    if (
      typeof input.description !== "string" ||
      input.description.length > DESCRIPTION_MAX
    ) {
      throw new ValidationError({
        message: `A descrição deve ter no máximo ${DESCRIPTION_MAX} caracteres.`,
        action: "Reduza o tamanho da descrição.",
      });
    }
    description = input.description.trim() || null;
  }

  let endsAt = null;
  if (input.ends_at !== undefined && input.ends_at !== null) {
    endsAt = new Date(input.ends_at);
    if (Number.isNaN(endsAt.getTime()) || endsAt <= new Date()) {
      throw new ValidationError({
        message: "A data de encerramento não é válida.",
        action: "Informe uma data futura no formato ISO 8601.",
      });
    }
  }

  const options = validateOptions(input.kind, input.options);

  return {
    title: input.title.trim(),
    description,
    category: input.category,
    kind: input.kind,
    resultsVisibility,
    endsAt,
    options,
  };
}

function validateOptions(kind, options) {
  if (kind === "open") {
    if (options !== undefined && options !== null && options.length !== 0) {
      throw new ValidationError({
        message: "Perguntas abertas não têm alternativas.",
        action: 'Remova as alternativas ou use o tipo "poll".',
      });
    }
    return [];
  }

  if (
    !Array.isArray(options) ||
    options.length < OPTIONS_MIN ||
    options.length > OPTIONS_MAX
  ) {
    throw new ValidationError({
      message: `A enquete precisa ter entre ${OPTIONS_MIN} e ${OPTIONS_MAX} alternativas.`,
      action: "Ajuste a quantidade de alternativas.",
    });
  }

  const labels = options.map((option) =>
    typeof option === "string" ? option.trim() : "",
  );

  if (
    labels.some(
      (label) => label.length === 0 || label.length > OPTION_LABEL_MAX,
    )
  ) {
    throw new ValidationError({
      message: `Cada alternativa deve ter entre 1 e ${OPTION_LABEL_MAX} caracteres.`,
      action: "Revise o texto das alternativas.",
    });
  }

  const normalized = new Set(labels.map((label) => label.toLowerCase()));
  if (normalized.size !== labels.length) {
    throw new ValidationError({
      message: "As alternativas não podem se repetir.",
      action: "Escreva alternativas diferentes entre si.",
    });
  }

  return labels;
}

async function create(input, options = {}) {
  const values = validateCreateInput(input);

  const questionResult = await database.query(
    {
      text: `
        INSERT INTO
          community_questions (owner_id, title, description, category, kind, results_visibility, ends_at)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7)
        RETURNING
          id
      ;`,
      values: [
        input.owner_id,
        values.title,
        values.description,
        values.category,
        values.kind,
        values.resultsVisibility,
        values.endsAt,
      ],
    },
    options,
  );

  const questionId = questionResult.rows[0].id;

  if (values.options.length > 0) {
    await database.query(
      {
        text: `
          INSERT INTO
            community_question_options (question_id, label, position)
          SELECT
            $1, label, position::smallint
          FROM
            unnest($2::varchar[]) WITH ORDINALITY AS input(label, position)
        ;`,
        values: [questionId, values.options],
      },
      options,
    );
  }

  return findOneDetailed({ id: questionId }, options);
}

// Uma única consulta traz pergunta, alternativas com contagem, voto de quem
// está vendo e contribuições publicadas por categoria (sem N+1).
async function findOneDetailed(
  { id, onlyActive = false, viewerId = null },
  options = {},
) {
  const results = await database.query(
    {
      text: `
        SELECT
          community_questions.*,
          (community_questions.ends_at IS NOT NULL
            AND community_questions.ends_at <= timezone('utc', now())) AS is_ended,
          COALESCE((
            SELECT
              json_agg(
                json_build_object(
                  'id', community_question_options.id,
                  'label', community_question_options.label,
                  'position', community_question_options.position,
                  'votes', (
                    SELECT COUNT(*)
                    FROM community_question_votes
                    WHERE community_question_votes.option_id = community_question_options.id
                  )
                )
                ORDER BY community_question_options.position
              )
            FROM
              community_question_options
            WHERE
              community_question_options.question_id = community_questions.id
          ), '[]'::json) AS options,
          (
            SELECT COUNT(*)::int
            FROM community_question_votes
            WHERE community_question_votes.question_id = community_questions.id
          ) AS total_votes,
          (
            SELECT community_question_votes.option_id
            FROM community_question_votes
            WHERE
              community_question_votes.question_id = community_questions.id
              AND community_question_votes.user_id = $2
          ) AS viewer_option_id,
          COALESCE((
            SELECT
              json_object_agg(grouped.category, grouped.total)
            FROM (
              SELECT
                community_question_contents.category,
                COUNT(*) AS total
              FROM
                community_question_contents
              INNER JOIN
                contents ON contents.id = community_question_contents.content_id
              WHERE
                community_question_contents.question_id = community_questions.id
                AND contents.status = 'published'
              GROUP BY
                community_question_contents.category
            ) AS grouped
          ), '{}'::json) AS contributions_by_category
        FROM
          community_questions
        WHERE
          ($1::uuid IS NULL OR community_questions.id = $1)
          AND ($3::boolean IS FALSE OR (${ACTIVE_CLAUSE}))
        ORDER BY
          community_questions.starts_at DESC,
          community_questions.created_at DESC
        LIMIT 1
      ;`,
      values: [id ?? null, viewerId ?? null, onlyActive],
    },
    options,
  );

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: onlyActive
        ? "Não há uma Pergunta da Comunidade aberta no momento."
        : "A pergunta informada não foi encontrada.",
      action: onlyActive
        ? "Volte mais tarde para participar da próxima pergunta."
        : "Verifique o endereço e tente novamente.",
    });
  }

  return results.rows[0];
}

async function findActive({ viewerId } = {}) {
  return findOneDetailed({ onlyActive: true, viewerId });
}

async function findActiveById(id, { viewerId } = {}, options = {}) {
  validator.uuid(id);
  return findOneDetailed({ id, onlyActive: true, viewerId }, options);
}

async function vote({ questionId, optionId, userId }, options = {}) {
  validator.uuid(questionId);

  const question = await findActiveById(questionId, {}, options);

  if (question.kind !== "poll") {
    throw new ValidationError({
      message: "Esta pergunta não tem enquete.",
      action: "Compartilhe sua experiência em uma publicação.",
    });
  }

  if (
    typeof optionId !== "string" ||
    !question.options.some((option) => option.id === optionId)
  ) {
    throw new ValidationError({
      message: "A alternativa escolhida não pertence a esta pergunta.",
      action: "Escolha uma das alternativas exibidas.",
    });
  }

  // A UNIQUE (question_id, user_id) decide em caso de cliques simultâneos.
  const results = await database.query(
    {
      text: `
        INSERT INTO
          community_question_votes (question_id, option_id, user_id)
        VALUES
          ($1, $2, $3)
        ON CONFLICT (question_id, user_id) DO NOTHING
        RETURNING
          id
      ;`,
      values: [questionId, optionId, userId],
    },
    options,
  );

  if (results.rowCount === 0) {
    throw new ValidationError({
      message: "Você já votou nesta pergunta.",
      action: "Cada pessoa vota uma vez. Conte sua experiência no relato.",
    });
  }

  return findOneDetailed({ id: questionId, viewerId: userId }, options);
}

async function addContribution(
  { questionId, contentId, category: contributionCategory },
  options = {},
) {
  category(contributionCategory);

  await database.query(
    {
      text: `
        INSERT INTO
          community_question_contents (content_id, question_id, category)
        VALUES
          ($1, $2, $3)
      ;`,
      values: [contentId, questionId, contributionCategory],
    },
    options,
  );
}

async function findContributions({ questionId, category: filter, page }) {
  validator.uuid(questionId);

  const categoryFilter = filter === undefined || filter === "" ? null : filter;
  if (categoryFilter !== null) {
    category(categoryFilter);
  }

  const currentPage = page === undefined ? 1 : Number(page);
  if (!Number.isInteger(currentPage) || currentPage < 1) {
    throw new ValidationError({
      message: "A paginação informada não é válida.",
      action: "Use um número de página válido.",
    });
  }

  await findOneDetailed({ id: questionId });

  const results = await database.query({
    text: `
      SELECT
        contents.*,
        users.username AS owner_username,
        community_question_contents.category AS community_question_category,
        tabcoins_count.total_balance AS tabcoins,
        tabcoins_count.total_credit AS tabcoins_credit,
        tabcoins_count.total_debit AS tabcoins_debit,
        (
          SELECT COUNT(*)::int
          FROM contents AS children
          WHERE children.parent_id = contents.id AND children.status = 'published'
        ) AS children_count,
        COUNT(*) OVER()::int AS total_count
      FROM
        community_question_contents
      INNER JOIN
        contents ON contents.id = community_question_contents.content_id
      INNER JOIN
        users ON contents.owner_id = users.id
      CROSS JOIN LATERAL
        get_content_balance_credit_debit(contents.id) AS tabcoins_count
      WHERE
        community_question_contents.question_id = $1
        AND contents.status = 'published'
        AND ($2::varchar IS NULL OR community_question_contents.category = $2)
      ORDER BY
        contents.published_at DESC,
        contents.id DESC
      LIMIT
        $3
      OFFSET
        $4
    ;`,
    values: [
      questionId,
      categoryFilter,
      CONTRIBUTIONS_PER_PAGE,
      (currentPage - 1) * CONTRIBUTIONS_PER_PAGE,
    ],
  });

  return {
    contents: results.rows,
    pagination: {
      page: currentPage,
      perPage: CONTRIBUTIONS_PER_PAGE,
      total: results.rows[0]?.total_count ?? 0,
    },
  };
}

const communityQuestion = {
  CATEGORIES,
  validateCreateInput,
  create,
  findActive,
  findActiveById,
  vote,
  addContribution,
  findContributions,
};

export default communityQuestion;
