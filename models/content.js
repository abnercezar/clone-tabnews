import database from "infra/database.js";
import validator from "models/validator.js";
import balance from "models/balance.js";
import prestige from "models/prestige.js";
import {
  ForbiddenError,
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

  await creditOrDebitTabCoins(null, newContent, options);
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

// Crédito/débito de TabCoins no estilo TabNews:
// - ao publicar: prestígio do autor define o ganho do usuário; conteúdo recebe +1 inicial
// - ao excluir: reverte os ganhos do autor ligados àquele conteúdo
async function creditOrDebitTabCoins(oldContent, newContent, options = {}) {
  let contentEarnings = 0;
  let userEarnings = 0;

  if (
    oldContent &&
    ((!oldContent.published_at && newContent.status !== "published") ||
      ["deleted", "firewall"].includes(oldContent.status))
  ) {
    return;
  }

  // Debita se o conteúdo já foi publicado e agora deixa de estar.
  // 1) tabcoins > 0 → reverte todo o ganho do autor neste conteúdo
  // 2) tabcoins <= 0 → reverte só o crédito inicial de criação
  if (oldContent?.published_at && newContent.status !== "published") {
    const userEarningsByContent = await prestige.getByContentId(oldContent.id, {
      transaction: options.transaction,
    });

    let amountToDebit;

    if (oldContent.tabcoins > 0) {
      amountToDebit = -userEarningsByContent.totalTabcoins;
    } else {
      amountToDebit = -userEarningsByContent.initialTabcoins;
    }

    if (!amountToDebit) return;

    await balance.create(
      {
        balanceType: "user:tabcoin",
        recipientId: newContent.owner_id,
        amount: amountToDebit,
        originatorType: options.eventId ? "event" : "content",
        originatorId: options.eventId ? options.eventId : newContent.id,
      },
      {
        transaction: options.transaction,
      },
    );
    return;
  }

  if (
    (!oldContent && newContent.published_at) ||
    (oldContent &&
      !oldContent.published_at &&
      newContent.status === "published")
  ) {
    contentEarnings = 1;
    userEarnings = await prestige.getByUserId(newContent.owner_id, {
      isRoot: !newContent.parent_id,
      transaction: options.transaction,
    });

    if (userEarnings < 0) {
      throw new ForbiddenError({
        message:
          "Não é possível publicar porque há outras publicações mal avaliadas que ainda não foram excluídas.",
        action:
          "Exclua seus conteúdos mais recentes que estiverem classificados como não relevantes.",
      });
    }

    // AgroTab: anúncios não recebem TabCoin inicial no conteúdo (só TabCash via budget).
    // Gap vs TN, que ainda aplica contentEarnings=1 em ads.
    if (newContent.type !== "content") {
      userEarnings = 0;
      contentEarnings = 0;
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
  }

  if (userEarnings > 0) {
    await balance.create(
      {
        balanceType: "user:tabcoin",
        recipientId: newContent.owner_id,
        amount: userEarnings,
        originatorType: options.eventId ? "event" : "content",
        originatorId: options.eventId ? options.eventId : newContent.id,
      },
      {
        transaction: options.transaction,
      },
    );
  }

  if (contentEarnings > 0) {
    await balance.create(
      {
        balanceType: "content:tabcoin:initial",
        recipientId: newContent.id,
        amount: contentEarnings,
        originatorType: "user",
        originatorId: newContent.owner_id,
      },
      {
        transaction: options.transaction,
      },
    );
  }
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

function parseContentType(type) {
  if (type === undefined || type === null || type === "") {
    return null;
  }

  if (type === "content" || type === "ad") {
    return type;
  }

  throw new ValidationError({
    message: "O tipo de conteúdo informado não é válido.",
    action: 'Use "content" ou "ad".',
  });
}

function parseWithChildren(withChildren) {
  if (
    withChildren === undefined ||
    withChildren === null ||
    withChildren === ""
  ) {
    return false;
  }

  if (
    withChildren === true ||
    withChildren === "true" ||
    withChildren === "1"
  ) {
    return true;
  }

  if (
    withChildren === false ||
    withChildren === "false" ||
    withChildren === "0"
  ) {
    return false;
  }

  throw new ValidationError({
    message: "O filtro de comentários informado não é válido.",
    action: 'Use "true" ou "false" em with_children.',
  });
}

// Lista o feed.
// strategy=new → mais recentes; strategy=relevant → score por AgroCoins + decadência temporal.
// withChildren=true → só comentários (parent_id NOT NULL); padrão → só raiz.
// type=content|ad → filtra o tipo (útil para classificados).
async function findPublished({
  page,
  perPage,
  username,
  strategy,
  withChildren,
  type,
} = {}) {
  const currentPage = parsePage(page, DEFAULT_PAGE, 10000);
  const currentPerPage = parsePage(perPage, DEFAULT_PER_PAGE, MAX_PER_PAGE);
  const currentStrategy = parseStrategy(strategy);
  const author = username ? username : null;
  const childrenOnly = parseWithChildren(withChildren);
  const contentType = parseContentType(type);
  // No feed de Relevantes (sem filtro de autor), anúncios ficam de fora — como no TabNews.
  // Se o cliente pediu type explicitamente, o filtro de tipo prevalece.
  const excludeAds =
    currentStrategy === "relevant" && !author && contentType === null;

  if (author) {
    validator.username(author);
  }

  const parentClause = childrenOnly
    ? "contents.parent_id IS NOT NULL"
    : "contents.parent_id IS NULL";

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
        AND ${parentClause}
        AND ($1::varchar IS NULL OR LOWER(users.username) = LOWER($1))
        AND ($2::boolean IS FALSE OR contents.type IS DISTINCT FROM 'ad')
        AND ($3::varchar IS NULL OR contents.type = $3)
    ;`,
    values: [author, excludeAds, contentType],
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
        AND ${parentClause}
        AND ($3::varchar IS NULL OR LOWER(users.username) = LOWER($3))
        AND ($4::boolean IS FALSE OR contents.type IS DISTINCT FROM 'ad')
        AND ($5::varchar IS NULL OR contents.type = $5)
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
      contentType,
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

async function findLatestPublishedByOwnerId(ownerId, options = {}) {
  const results = await database.query(
    {
      text: `
        SELECT
          *
        FROM
          contents
        WHERE
          owner_id = $1
          AND status = 'published'
          AND type = 'content'
        ORDER BY
          published_at DESC,
          id DESC
        LIMIT 1
      ;`,
      values: [ownerId],
    },
    options,
  );

  return results.rows[0] || null;
}

// Marca como excluído e reverte TabCoins do autor (paridade TabNews).
// Aceita o objeto do conteúdo (com tabcoins) ou só o id.
async function remove(contentOrId, options = {}) {
  const contentId =
    typeof contentOrId === "string" ? contentOrId : contentOrId.id;
  const tabcoins =
    typeof contentOrId === "object" && contentOrId.tabcoins !== undefined
      ? Number(contentOrId.tabcoins)
      : undefined;

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

  const deletedContent = results.rows[0];

  let contentTabcoins = tabcoins;
  if (contentTabcoins === undefined) {
    const tabcoinsCount = await balance.getContentTabcoinsCreditDebit(
      { recipientId: contentId },
      options,
    );
    contentTabcoins = tabcoinsCount.tabcoins;
  }

  await creditOrDebitTabCoins(
    {
      id: deletedContent.id,
      owner_id: deletedContent.owner_id,
      published_at: deletedContent.published_at,
      tabcoins: contentTabcoins,
      status: "published",
    },
    {
      ...deletedContent,
      status: "deleted",
    },
    options,
  );

  return deletedContent;
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
  findLatestPublishedByOwnerId,
  countPublishedRootByOwner,
  remove,
  creditOrDebitTabCoins,
};

export default content;
