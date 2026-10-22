import database from "infra/database.js";
import { NotFoundError, ValidationError } from "infra/errors.js";

export const MAX_TAGS_PER_CONTENT = 3;

const CATEGORY_LABELS = {
  cultura: "Cultura e criação",
  tema: "Tema",
  regiao: "Região e bioma",
};

async function findAll(options = {}) {
  const results = await database.query(
    {
      text: `
        SELECT
          slug,
          label,
          category
        FROM
          tags
        ORDER BY
          position ASC
      ;`,
    },
    options,
  );

  return results.rows;
}

async function findOneBySlug(slug, options = {}) {
  const results = await database.query(
    {
      text: `
        SELECT
          slug,
          label,
          category
        FROM
          tags
        WHERE
          slug = $1
        LIMIT 1
      ;`,
      values: [String(slug || "").toLowerCase()],
    },
    options,
  );

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "A tag informada não existe.",
      action: "Escolha uma das tags disponíveis no AgroTab.",
    });
  }

  return results.rows[0];
}

// Valida a lista enviada pelo cliente: só slugs conhecidos, sem repetir,
// no máximo 3. Lista vazia é aceita (comentários e clientes antigos).
async function parseSlugs(input, options = {}) {
  if (input === undefined || input === null) {
    return [];
  }

  if (!Array.isArray(input) || input.some((item) => typeof item !== "string")) {
    throw new ValidationError({
      message: '"tags" deve ser uma lista de textos.',
      action: 'Envie as tags como ["soja", "pragas-e-doencas"].',
    });
  }

  const slugs = [...new Set(input.map((item) => item.trim().toLowerCase()))];

  if (slugs.length > MAX_TAGS_PER_CONTENT) {
    throw new ValidationError({
      message: `Escolha no máximo ${MAX_TAGS_PER_CONTENT} tags.`,
      action: "Remova as tags que menos descrevem a publicação.",
    });
  }

  if (slugs.length === 0) {
    return [];
  }

  const results = await database.query(
    {
      text: `
        SELECT
          slug
        FROM
          tags
        WHERE
          slug = ANY($1)
      ;`,
      values: [slugs],
    },
    options,
  );

  const known = new Set(results.rows.map((row) => row.slug));
  const unknown = slugs.filter((slug) => !known.has(slug));

  if (unknown.length > 0) {
    throw new ValidationError({
      message: `Tag desconhecida: ${unknown.join(", ")}.`,
      action: "Escolha uma das tags disponíveis no AgroTab.",
    });
  }

  return slugs;
}

// Troca as tags de um conteúdo pelas informadas.
async function setForContent(contentId, slugs, options = {}) {
  await database.query(
    {
      text: `
        DELETE FROM
          content_tags
        WHERE
          content_id = $1
      ;`,
      values: [contentId],
    },
    options,
  );

  if (slugs.length === 0) {
    return [];
  }

  const results = await database.query(
    {
      text: `
        WITH inserted AS (
          INSERT INTO
            content_tags (content_id, tag_id)
          SELECT
            $1, id
          FROM
            tags
          WHERE
            slug = ANY($2)
          RETURNING
            tag_id
        )
        SELECT
          tags.slug,
          tags.label
        FROM
          inserted
        INNER JOIN
          tags ON tags.id = inserted.tag_id
        ORDER BY
          tags.position ASC
      ;`,
      values: [contentId, slugs],
    },
    options,
  );

  return results.rows;
}

async function findForContent(contentId, options = {}) {
  const results = await database.query(
    {
      text: `
        SELECT
          tags.slug,
          tags.label
        FROM
          content_tags
        INNER JOIN
          tags ON tags.id = content_tags.tag_id
        WHERE
          content_tags.content_id = $1
        ORDER BY
          tags.position ASC
      ;`,
      values: [contentId],
    },
    options,
  );

  return results.rows;
}

// Tags com publicações, para o sitemap e para o filtro do feed.
async function findAllWithPublishedCount(options = {}) {
  const results = await database.query(
    {
      text: `
        SELECT
          tags.slug,
          tags.label,
          tags.category,
          COUNT(contents.id)::int AS published_count,
          MAX(contents.published_at) AS last_published_at
        FROM
          tags
        LEFT JOIN
          content_tags ON content_tags.tag_id = tags.id
        LEFT JOIN
          contents ON contents.id = content_tags.content_id
          AND contents.status = 'published'
        GROUP BY
          tags.id
        ORDER BY
          tags.position ASC
      ;`,
    },
    options,
  );

  return results.rows;
}

// Trecho SQL que monta a lista de tags do conteúdo como JSON.
function tagsJsonSql(contentsAlias = "contents") {
  return `
  COALESCE(
    (
      SELECT
        json_agg(
          json_build_object('slug', tags.slug, 'label', tags.label)
          ORDER BY tags.position
        )
      FROM
        content_tags
      INNER JOIN
        tags ON tags.id = content_tags.tag_id
      WHERE
        content_tags.content_id = ${contentsAlias}.id
    ),
    '[]'::json
  )
`;
}

const tag = {
  findAll,
  findOneBySlug,
  findForContent,
  findAllWithPublishedCount,
  parseSlugs,
  setForContent,
  CATEGORY_LABELS,
  MAX_TAGS_PER_CONTENT,
  tagsJsonSql,
};

export default tag;
