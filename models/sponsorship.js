import database from "infra/database.js";
import validator from "models/validator.js";
import { NotFoundError } from "infra/errors.js";

async function create({ ownerId, title, url }, options = {}) {
  validator.title(title);
  validator.externalUrl(url);

  const results = await database.query(
    {
      text: `
        INSERT INTO
          sponsorships (owner_id, title, url, status)
        VALUES
          ($1, $2, $3, 'published')
        RETURNING
          *
      ;`,
      values: [ownerId, title.trim(), url.trim()],
    },
    options,
  );

  return results.rows[0];
}

async function findLatestPublished() {
  const results = await database.query({
    text: `
      SELECT
        sponsorships.*,
        users.username AS owner_username
      FROM
        sponsorships
      INNER JOIN
        users ON sponsorships.owner_id = users.id
      WHERE
        sponsorships.status = 'published'
      ORDER BY
        sponsorships.created_at DESC,
        sponsorships.id DESC
      LIMIT
        1
    ;`,
  });

  return results.rows;
}

async function findOneById(sponsorshipId) {
  validator.uuid(sponsorshipId);

  const results = await database.query({
    text: `
      SELECT
        sponsorships.*,
        users.username AS owner_username
      FROM
        sponsorships
      INNER JOIN
        users ON sponsorships.owner_id = users.id
      WHERE
        sponsorships.id = $1
        AND sponsorships.status = 'published'
      LIMIT
        1
    ;`,
    values: [sponsorshipId],
  });

  if (results.rowCount === 0) {
    throw new NotFoundError({
      message: "O patrocínio informado não foi encontrado no sistema.",
      action: "Verifique o endereço e tente novamente.",
    });
  }

  return results.rows[0];
}

async function remove(sponsorshipId, options = {}) {
  const results = await database.query(
    {
      text: `
        UPDATE
          sponsorships
        SET
          status = 'deleted',
          updated_at = timezone('utc', now())
        WHERE
          id = $1
          AND status = 'published'
        RETURNING
          *
      ;`,
      values: [sponsorshipId],
    },
    options,
  );

  return results.rows[0];
}

const sponsorship = {
  create,
  findLatestPublished,
  findOneById,
  remove,
};

export default sponsorship;
