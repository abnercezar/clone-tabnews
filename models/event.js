import database from "infra/database.js";

async function create(
  { type, originatorUserId, originatorIp, metadata },
  options = {},
) {
  const results = await database.query(
    {
      text: `
        INSERT INTO
          events (type, originator_user_id, originator_ip, metadata)
        VALUES
          ($1, $2, $3, $4::jsonb)
        RETURNING
          *
      ;`,
      values: [
        type,
        originatorUserId || null,
        originatorIp || null,
        metadata ? JSON.stringify(metadata) : null,
      ],
    },
    options,
  );

  return results.rows[0];
}

const event = {
  create,
};

export default event;
