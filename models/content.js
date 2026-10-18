import database from "infra/database.js";
import validator from "models/validator.js";
import balance from "models/balance.js";
import {
  NotFoundError,
  UnprocessableEntityError,
  ValidationError,
} from "infra/errors.js";

const SLUG_MAX_LENGTH = 200;

// Gera um slug a partir do título, sem dependência externa:
// remove acentos, deixa minúsculo, troca não-alfanuméricos por hífen.
function generateBaseSlug(title) {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH);

  // Garante um slug não vazio mesmo para títulos só com símbolos.
  return slug.length > 0 ? slug : "conteudo";
}

async function slugExistsForOwner(ownerId, slug, options) {
  const results = await database.query(
    {
      text: `
      SELECT
        1
      FROM
        contents
      WHERE
        owner_id = $1
        AND slug = $2
      LIMIT 1
    ;`,
      values: [ownerId, slug],
    },
    options,
  );

  return results.rowCount > 0;
}

async function buildUniqueSlug(ownerId, title, options) {
  const baseSlug = generateBaseSlug(title);

  let candidate = baseSlug;
  let suffix = 2;

  while (await slugExistsForOwner(ownerId, candidate, options)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix++;
  }

  return candidate;
}

function titleFromBody(body) {
  const firstLine = body.trim().split("\n")[0].trim();
  const title = firstLine.slice(0, 80).trim();
  return title.length > 0 ? title : "Comentário";
}

// Cria um conteúdo. owner_id vem SEMPRE do usuário autenticado (nunca do corpo).
// Com parent_id, vira um comentário da publicação publicada correspondente.
// Nesta fase, o conteúdo é criado já publicado.
async function create(contentInputValues, options = {}) {
  validator.body(contentInputValues.body);

  let parentId = null;
  let title = contentInputValues.title;

  if (contentInputValues.parent_id) {
    validator.uuid(contentInputValues.parent_id);
    const parent = await findPublishedById(
      contentInputValues.parent_id,
      options,
    );

    if (parent.parent_id) {
      const grandparent = await findPublishedById(parent.parent_id, options);

      if (grandparent.parent_id) {
        throw new ValidationError({
          message: "Só é possível responder um comentário da publicação.",
          action: "Responda o comentário original.",
        });
      }
    }

    parentId = parent.id;
    title = titleFromBody(contentInputValues.body);
  } else {
    validator.title(title);
  }

  const contentType =
    !parentId && contentInputValues.type === "ad" ? "ad" : "content";

  const slug = await buildUniqueSlug(
    contentInputValues.owner_id,
    title,
    options,
  );

  const newContent = await runInsertQuery(
    {
      owner_id: contentInputValues.owner_id,
      parent_id: parentId,
      slug,
      title,
      body: contentInputValues.body,
      type: contentType,
    },
    options,
  );

  await creditOrDebitTabCoins(newContent, options);
  await updateTabCashBalance(newContent, options);

  const tabcoinsCount = await balance.getContentTabcoinsCreditDebit(
    { recipientId: newContent.id },
    options,
  );
  newContent.tabcoins = tabcoinsCount.tabcoins;
  newContent.tabcoins_credit = tabcoinsCount.tabcoins_credit;
  newContent.tabcoins_debit = tabcoinsCount.tabcoins_debit;

  return newContent;

  async function runInsertQuery(content, queryOptions) {
    const results = await database.query(
      {
        text: `
          INSERT INTO
            contents (owner_id, parent_id, slug, title, body, type, status, published_at)
          VALUES
            ($1, $2, $3, $4, $5, $6, 'published', timezone('utc', now()))
          RETURNING
            *
        ;`,
        values: [
          content.owner_id,
          content.parent_id,
          content.slug,
          content.title,
          content.body,
          content.type,
        ],
      },
      queryOptions,
    );

    return results.rows[0];
  }
}

// Crédito padrão como no TabNews: +1 TabCoin no conteúdo e +1 no autor
// quando o texto tem valor concreto mínimo.
async function creditOrDebitTabCoins(newContent, options = {}) {
  if (newContent.type !== "content") {
    return;
  }

  if (newContent.body.split(/[a-z]{5,}/i, 6).length < 6) {
    return;
  }

  if (newContent.parent_id) {
    const parent = await findPublishedById(newContent.parent_id, options);
    if (parent.owner_id === newContent.owner_id) {
      return;
    }
  }

  await balance.create(
    {
      balanceType: "user:tabcoin",
      recipientId: newContent.owner_id,
      amount: 1,
      originatorType: "content",
      originatorId: newContent.id,
    },
    options,
  );

  await balance.create(
    {
      balanceType: "content:tabcoin:initial",
      recipientId: newContent.id,
      amount: 1,
      originatorType: "user",
      originatorId: newContent.owner_id,
    },
    options,
  );
}

async function updateTabCashBalance(newContent, options = {}) {
  if (newContent.type !== "ad") {
    return;
  }

  const initialTabCash = 100;
  const userBalance = await balance.create(
    {
      balanceType: "user:tabcash",
      recipientId: newContent.owner_id,
      amount: -initialTabCash,
      originatorType: "content",
      originatorId: newContent.id,
    },
    {
      ...options,
      withBalance: true,
    },
  );

  if (Number(userBalance.total) < 0) {
    throw new UnprocessableEntityError({
      message: "Não foi possível criar a publicação patrocinada.",
      action: `Você precisa de pelo menos ${initialTabCash} TabCash para realizar esta ação.`,
    });
  }

  await balance.create(
    {
      balanceType: "ad:budget",
      recipientId: newContent.id,
      amount: initialTabCash,
      originatorType: "user",
      originatorId: newContent.owner_id,
    },
    options,
  );
}

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 30;
const MAX_PER_PAGE = 100;

function parsePage(value, fallback, max) {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
    throw new ValidationError({
      message: "A paginação informada não é válida.",
      action: "Use um número de página e uma quantidade por página válidos.",
    });
  }

  return parsed;
}

// Inspired by TabNews / Hacker News ranking:
// https://medium.com/hacking-and-gonzo/how-hacker-news-ranking-algorithm-works-1d9b0cf2c08d
const AGE_BASE_SECONDS = 60 * 60 * 6; // 6 hours
const BOOST_PERIOD_SECONDS = 60 * 10; // 10 minutes
const SCORE_OFFSET = 0.5;

function parseStrategy(strategy) {
  if (strategy === undefined || strategy === null || strategy === "") {
    return "new";
  }

  if (strategy === "new" || strategy === "relevant") {
    return strategy;
  }

  throw new ValidationError({
    message: "A estratégia de ordenação informada não é válida.",
    action: 'Use "new" ou "relevant".',
  });
}

// Lista o feed: publicações (sem comentários).
// strategy=new → mais recentes; strategy=relevant → score por AgroCoins + decadência temporal.
async function findPublished({ page, perPage, username, strategy } = {}) {
  const currentPage = parsePage(page, DEFAULT_PAGE, 10000);
  const currentPerPage = parsePage(perPage, DEFAULT_PER_PAGE, MAX_PER_PAGE);
  const currentStrategy = parseStrategy(strategy);
  const author = username ? username : null;
  // No feed de Relevantes (sem filtro de autor), anúncios ficam de fora — como no TabNews.
  const excludeAds = currentStrategy === "relevant" && !author;

  if (author) {
    validator.username(author);
  }

  const countResults = await database.query({
    text: `
      SELECT
        COUNT(*)::int AS count
      FROM
        contents
      INNER JOIN
        users ON contents.owner_id = users.id
      WHERE
        contents.status = 'published'
        AND contents.parent_id IS NULL
        AND ($1::varchar IS NULL OR LOWER(users.username) = LOWER($1))
        AND ($2::boolean IS FALSE OR contents.type IS DISTINCT FROM 'ad')
    ;`,
    values: [author, excludeAds],
  });

  const orderByClause =
    currentStrategy === "relevant"
      ? `
      ORDER BY
        (
          (tabcoins_count.total_balance - ${SCORE_OFFSET})
          * CASE
              WHEN EXTRACT(EPOCH FROM (NOW() - contents.published_at)) < ${BOOST_PERIOD_SECONDS}
                THEN 3
              ELSE 1
            END
          * CASE
              WHEN tabcoins_count.total_balance > 0
                THEN (
                  1 + EXP(
                    -EXTRACT(EPOCH FROM (NOW() - contents.published_at))
                    / ${AGE_BASE_SECONDS}.0
                  )
                )
              ELSE (
                1 - EXP(
                  -EXTRACT(EPOCH FROM (NOW() - contents.published_at))
                  / ${AGE_BASE_SECONDS}.0
                )
              )
            END
        ) DESC,
        contents.published_at DESC,
        contents.id DESC
    `
      : `
      ORDER BY
        contents.published_at DESC,
        contents.id DESC
    `;

  const results = await database.query({
    text: `
      SELECT
        contents.*,
        users.username AS owner_username,
        tabcoins_count.total_balance AS tabcoins,
        tabcoins_count.total_credit AS tabcoins_credit,
        tabcoins_count.total_debit AS tabcoins_debit
      FROM
        contents
      INNER JOIN
        users ON contents.owner_id = users.id
      CROSS JOIN LATERAL
        get_content_balance_credit_debit(contents.id) AS tabcoins_count
      WHERE
        contents.status = 'published'
        AND contents.parent_id IS NULL
        AND ($3::varchar IS NULL OR LOWER(users.username) = LOWER($3))
        AND ($4::boolean IS FALSE OR contents.type IS DISTINCT FROM 'ad')
      ${orderByClause}
      LIMIT
        $1
      OFFSET
        $2
    ;`,
    values: [
      currentPerPage,
      (currentPage - 1) * currentPerPage,
      author,
      excludeAds,
    ],
  });

  return {
    contents: results.rows,
    pagination: {
      page: currentPage,
      perPage: currentPerPage,
      total: countResults.rows[0].count,
    },
  };
}

async function findPublishedById(contentId, options = {}) {
  const results = await database.query(
    {
      text: `
        SELECT
          contents.*
        FROM
          contents
        WHERE
          id = $1
          AND status = 'published'
        LIMIT 1
      ;`,
      values: [contentId],
    },
    options,
  );

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "O conteúdo informado não foi encontrado no sistema.",
      action: "Verifique o endereço e tente novamente.",
    });
  }

  return results.rows[0];
}

async function findChildren(parentId) {
  const results = await database.query({
    text: `
      SELECT
        contents.*,
        users.username AS owner_username,
        tabcoins_count.total_balance AS tabcoins,
        tabcoins_count.total_credit AS tabcoins_credit,
        tabcoins_count.total_debit AS tabcoins_debit
      FROM
        contents
      INNER JOIN
        users ON contents.owner_id = users.id
      CROSS JOIN LATERAL
        get_content_balance_credit_debit(contents.id) AS tabcoins_count
      WHERE
        contents.parent_id = $1
        AND contents.status = 'published'
      ORDER BY
        contents.published_at ASC,
        contents.id ASC
      LIMIT 100
    ;`,
    values: [parentId],
  });

  return results.rows;
}

async function countPublishedRootByOwner(ownerId, options = {}) {
  const results = await database.query(
    {
      text: `
        SELECT
          COUNT(*)::int AS count
        FROM
          contents
        WHERE
          owner_id = $1
          AND parent_id IS NULL
          AND status = 'published'
      ;`,
      values: [ownerId],
    },
    options,
  );

  return results.rows[0].count;
}

// Marca como excluído. A linha permanece para a trilha de auditoria.
async function remove(contentId, options = {}) {
  const results = await database.query(
    {
      text: `
        UPDATE
          contents
        SET
          status = 'deleted',
          updated_at = timezone('utc', now())
        WHERE
          id = $1
          AND status = 'published'
        RETURNING
          *
      ;`,
      values: [contentId],
    },
    options,
  );

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "O conteúdo informado não foi encontrado no sistema.",
      action: "Verifique o endereço e tente novamente.",
    });
  }

  return results.rows[0];
}

// Busca um conteúdo publicado pelo username do autor e pelo slug.
async function findOneByUsernameAndSlug(username, slug) {
  const results = await database.query({
    text: `
      SELECT
        contents.*,
        users.username AS owner_username,
        tabcoins_count.total_balance AS tabcoins,
        tabcoins_count.total_credit AS tabcoins_credit,
        tabcoins_count.total_debit AS tabcoins_debit
      FROM
        contents
      INNER JOIN
        users ON contents.owner_id = users.id
      CROSS JOIN LATERAL
        get_content_balance_credit_debit(contents.id) AS tabcoins_count
      WHERE
        LOWER(users.username) = LOWER($1)
        AND contents.slug = $2
        AND contents.status = 'published'
      LIMIT 1
    ;`,
    values: [username, slug],
  });

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "O conteúdo informado não foi encontrado no sistema.",
      action: "Verifique o endereço e tente novamente.",
    });
  }

  return results.rows[0];
}

const content = {
  create,
  findPublished,
  findPublishedById,
  findOneByUsernameAndSlug,
  findChildren,
  countPublishedRootByOwner,
  remove,
};

export default content;
