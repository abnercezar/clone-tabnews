import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError } from "infra/errors.js";

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

async function slugExistsForOwner(ownerId, slug) {
  const results = await database.query({
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
  });

  return results.rowCount > 0;
}

async function buildUniqueSlug(ownerId, title) {
  const baseSlug = generateBaseSlug(title);

  let candidate = baseSlug;
  let suffix = 2;

  while (await slugExistsForOwner(ownerId, candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix++;
  }

  return candidate;
}

// Cria um conteúdo. owner_id vem SEMPRE do usuário autenticado (nunca do corpo).
// Nesta fase, o conteúdo é criado já publicado.
async function create(contentInputValues) {
  validator.title(contentInputValues.title);
  validator.body(contentInputValues.body);

  const slug = await buildUniqueSlug(
    contentInputValues.owner_id,
    contentInputValues.title,
  );

  const newContent = await runInsertQuery({
    owner_id: contentInputValues.owner_id,
    slug,
    title: contentInputValues.title,
    body: contentInputValues.body,
  });

  return newContent;

  async function runInsertQuery(content) {
    const results = await database.query({
      text: `
        INSERT INTO
          contents (owner_id, slug, title, body, status, published_at)
        VALUES
          ($1, $2, $3, $4, 'published', timezone('utc', now()))
        RETURNING
          *
      ;`,
      values: [content.owner_id, content.slug, content.title, content.body],
    });

    return results.rows[0];
  }
}

// Lista o feed: conteúdos publicados, mais recentes primeiro, com o username do autor.
async function findPublished() {
  const results = await database.query({
    text: `
      SELECT
        contents.*,
        users.username AS owner_username
      FROM
        contents
      INNER JOIN
        users ON contents.owner_id = users.id
      WHERE
        contents.status = 'published'
      ORDER BY
        contents.published_at DESC,
        contents.id DESC
    ;`,
  });

  return results.rows;
}

// Busca um conteúdo publicado pelo username do autor e pelo slug.
async function findOneByUsernameAndSlug(username, slug) {
  const results = await database.query({
    text: `
      SELECT
        contents.*,
        users.username AS owner_username
      FROM
        contents
      INNER JOIN
        users ON contents.owner_id = users.id
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
  findOneByUsernameAndSlug,
};

export default content;
