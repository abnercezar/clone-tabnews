import database from "infra/database.js";

const byContentIdQuery = `
WITH content_events AS (
  SELECT
    id,
    originator_user_id,
    type
  FROM
    events
  WHERE
    metadata ->> 'id' = $1
    OR metadata ->> 'content_id' = $1
),
event_operations AS (
  SELECT
    user_tabcoin_operations.amount,
    content_events.type
  FROM
    user_tabcoin_operations
  INNER JOIN
    content_events
  ON user_tabcoin_operations.originator_id = content_events.id
    AND (
      user_tabcoin_operations.recipient_id != content_events.originator_user_id
      OR content_events.type = 'create:content'
      OR content_events.type = 'create:content:text_root'
      OR content_events.type = 'create:content:text_child'
    )
),
content_operations AS (
  SELECT
    amount,
    'create:content' AS type
  FROM
    user_tabcoin_operations
  WHERE
    originator_type = 'content'
    AND originator_id = $1::uuid
)
SELECT amount, type FROM event_operations
UNION ALL
SELECT amount, type FROM content_operations
;
`;

const byUserIdQuery = `
WITH content_window AS ((
  SELECT
    id,
    published_at
  FROM contents
  WHERE
    owner_id = $1
    AND status = 'published'
    AND type = 'content'
    AND ($3 = FALSE OR parent_id IS NULL)
  ORDER BY
    published_at DESC
  LIMIT $4 OFFSET $5
)
UNION
  SELECT
    id,
    published_at
  FROM
    contents
  WHERE
    owner_id = $1
    AND status = 'published'
    AND type = 'content'
    AND published_at < $2
    AND ($3 = FALSE OR parent_id IS NULL)
  ORDER BY
    published_at DESC
  LIMIT $4
)
SELECT
  get_content_current_tabcoins(content_window.id) as tabcoins
FROM
  content_window
ORDER BY
  published_at ASC
LIMIT $4
;
`;

async function getByContentId(contentId, { transaction, database: db = database } = {}) {
  const result = await db.query(
    {
      text: byContentIdQuery,
      values: [contentId],
    },
    { transaction },
  );

  let initialTabcoins = 0;

  const totalTabcoins = result.rows.reduce((acc, row) => {
    if (
      row.type === "create:content" ||
      row.type === "create:content:text_root" ||
      row.type === "create:content:text_child"
    ) {
      initialTabcoins = row.amount;
    }
    return acc + row.amount;
  }, 0);

  return {
    initialTabcoins,
    totalTabcoins,
  };
}

async function getByUserId(
  userId,
  {
    timeOffset = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    offset = 3,
    isRoot = false,
    limit = 20,
    transaction,
    database: db = database,
  } = {},
) {
  const result = await db.query(
    {
      text: byUserIdQuery,
      values: [userId, timeOffset, isRoot, limit, offset],
    },
    { transaction },
  );

  const mean = calcTabcoinsAverage(result.rows);

  return calcPrestigeLevel(mean, isRoot);
}

function calcTabcoinsAverage(tabcoinsObjectArray) {
  const length = tabcoinsObjectArray?.length;

  if (!length || typeof length !== "number") {
    return 1;
  }

  const tabcoins = tabcoinsObjectArray.reduce(
    (acc, { tabcoins: value }) => acc + (value || 0),
    0,
  );

  return tabcoins / length;
}

function calcPrestigeLevel(mean, isRoot) {
  if (isRoot) {
    if (0.5 >= mean) return -1;
    if (1.1 >= mean) return 0;
    if (1.2 >= mean) return 1;
    if (1.3 >= mean) return 2;
    if (1.4 >= mean) return 3;
    if (1.6 >= mean) return 4;
    if (1.8 >= mean) return 5;
    if (2.1 >= mean) return 6;
    if (2.4 >= mean) return 7;
  } else {
    if (0.4 >= mean) return -1;
    if (1.0 >= mean) return 0;
    if (1.1 >= mean) return 1;
    if (1.2 >= mean) return 2;
    if (1.25 >= mean) return 3;
    if (1.3 >= mean) return 4;
    if (1.5 >= mean) return 5;
    if (1.7 >= mean) return 6;
    if (2.0 >= mean) return 7;
  }

  return Math.ceil(mean + 5);
}

const prestige = {
  calcPrestigeLevel,
  calcTabcoinsAverage,
  getByContentId,
  getByUserId,
};

export default prestige;
