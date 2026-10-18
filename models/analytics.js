import crypto from "node:crypto";
import database from "infra/database.js";

async function getChildContentsPublished() {
  const results = await database.query(`
    WITH range_values AS (
      SELECT
        date_trunc('day', NOW() - INTERVAL '2 MONTHS') AS minval,
        date_trunc('day', NOW()) AS maxval
    ),
    day_range AS (
      SELECT generate_series(minval, maxval, '1 day'::interval) AS date
      FROM range_values
    ),
    daily_counts AS (
      SELECT
        date_trunc('day', created_at) AS date,
        count(*) AS ct
      FROM contents
      WHERE parent_id IS NOT NULL
      GROUP BY 1
    )
    SELECT
      TO_CHAR(day_range.date::DATE, 'dd/mm') AS date,
      daily_counts.ct::INTEGER AS respostas
    FROM day_range
    LEFT OUTER JOIN daily_counts ON day_range.date = daily_counts.date
    ORDER BY day_range.date;
  `);

  return results.rows.map((row) => ({
    date: row.date,
    respostas: row.respostas || 0,
  }));
}

async function getRootContentsPublished() {
  const results = await database.query(`
    WITH range_values AS (
      SELECT
        date_trunc('day', NOW() - INTERVAL '2 MONTHS') AS minval,
        date_trunc('day', NOW()) AS maxval
    ),
    day_range AS (
      SELECT generate_series(minval, maxval, '1 day'::interval) AS date
      FROM range_values
    ),
    daily_counts AS (
      SELECT
        date_trunc('day', created_at) AS date,
        count(*) AS ct
      FROM contents
      WHERE parent_id IS NULL
      GROUP BY 1
    )
    SELECT
      TO_CHAR(day_range.date::DATE, 'dd/mm') AS date,
      daily_counts.ct::INTEGER AS conteudos
    FROM day_range
    LEFT OUTER JOIN daily_counts ON day_range.date = daily_counts.date
    ORDER BY day_range.date;
  `);

  return results.rows.map((row) => ({
    date: row.date,
    conteudos: row.conteudos || 0,
  }));
}

async function getUsersCreated() {
  const results = await database.query(`
    WITH range_values AS (
      SELECT
        date_trunc('day', NOW() - INTERVAL '2 MONTHS') AS minval,
        date_trunc('day', NOW()) AS maxval
    ),
    day_range AS (
      SELECT generate_series(minval, maxval, '1 day'::interval) AS date
      FROM range_values
    ),
    daily_counts AS (
      SELECT
        date_trunc('day', created_at) AS date,
        count(*) AS ct
      FROM users
      GROUP BY 1
    )
    SELECT
      TO_CHAR(day_range.date::DATE, 'dd/mm') AS date,
      daily_counts.ct::INTEGER AS cadastros
    FROM day_range
    LEFT OUTER JOIN daily_counts ON day_range.date = daily_counts.date
    ORDER BY day_range.date;
  `);

  return results.rows.map((row) => ({
    date: row.date,
    cadastros: row.cadastros || 0,
  }));
}

async function getVotesTaken() {
  const results = await database.query(`
    WITH range_values AS (
      SELECT
        date_trunc('day', NOW() - INTERVAL '2 MONTHS') AS minval,
        date_trunc('day', NOW()) AS maxval
    ),
    day_range AS (
      SELECT generate_series(minval, maxval, '1 day'::interval) AS date
      FROM range_values
    ),
    daily_counts AS (
      SELECT
        date_trunc('day', created_at) AS date,
        count(*) AS ct
      FROM events
      WHERE type = 'update:content:tabcoins'
      GROUP BY 1
    )
    SELECT
      TO_CHAR(day_range.date::DATE, 'dd/mm') AS date,
      daily_counts.ct::INTEGER AS votos
    FROM day_range
    LEFT OUTER JOIN daily_counts ON day_range.date = daily_counts.date
    ORDER BY day_range.date;
  `);

  return results.rows.map((row) => ({
    date: row.date,
    votos: row.votos || 0,
  }));
}

async function getVotesGraph({ limit = 300, showUsernames = false } = {}) {
  const results = await database.query({
    text: `
      SELECT
        id,
        originator_user_id AS "from",
        metadata->>'content_owner_id' AS "to",
        metadata->>'transaction_type' AS transaction_type,
        originator_ip AS ip,
        created_at
      FROM
        events
      WHERE
        type = 'update:content:tabcoins'
      ORDER BY
        created_at DESC
      LIMIT $1;
    `,
    values: [limit],
  });

  const usersMap = new Map();
  const ipNodesMap = new Map();
  const votesMap = new Map();
  const rows = showUsernames ? results.rows : [...results.rows].reverse();

  for (const row of rows) {
    if (!row.from || !row.to) {
      continue;
    }

    const from = usersMap.get(row.from)?.id || hash(row.from, row.id);
    const to = usersMap.get(row.to)?.id || hash(row.to, row.id);

    usersMap.set(row.from, {
      id: from,
      group: "users",
      votes: (usersMap.get(row.from)?.votes || 0) + 1,
    });

    usersMap.set(row.to, {
      id: to,
      group: "users",
      votes: (usersMap.get(row.to)?.votes || 0) + 1,
    });

    if (row.ip) {
      if (ipNodesMap.has(row.ip)) {
        ipNodesMap.get(row.ip).add(row.from);
      } else {
        ipNodesMap.set(row.ip, new Set([row.from]));
      }
    }

    const fromToKey = `${row.transaction_type}-${from}-${to}`;
    votesMap.set(fromToKey, {
      id: fromToKey,
      from,
      to,
      type: row.transaction_type,
      value: (votesMap.get(fromToKey)?.value || 0) + 1,
    });
  }

  let ipId = 0;
  const sharedIps = [];
  const ipEdges = [];

  for (const users of ipNodesMap.values()) {
    if (users.size === 1) {
      continue;
    }

    ipId += 1;

    for (const userId of users) {
      const from = usersMap.get(userId).id;
      usersMap.set(userId, {
        id: from,
        group: "users",
        shared: true,
        votes: usersMap.get(userId).votes,
      });
      ipEdges.push({
        id: `net-${from}-${ipId}`,
        from,
        to: ipId,
        type: "network",
      });
    }

    sharedIps.push({ id: ipId, group: "IPs" });
  }

  if (usersMap.size > 0) {
    // Igual TabNews: no grafo público só hidrata quem é `nuked` (❌);
    // com usernames (mods), hidrata todos.
    const usersData = await database.query({
      text: `
        SELECT
          ${showUsernames ? "username," : ""}
          'nuked' = ANY(features) AS nuked,
          id AS key
        FROM
          users
        WHERE
          id = ANY($1)
          ${showUsernames ? "" : "AND 'nuked' = ANY(features)"}
      ;`,
      values: [[...usersMap.keys()]],
    });

    for (const row of usersData.rows) {
      const user = usersMap.get(row.key);
      const next = {
        id: user.id,
        group: row.nuked ? "nuked" : "users",
        votes: user.votes,
      };
      if (showUsernames && row.username) {
        next.username = row.username;
      }
      usersMap.set(row.key, next);
    }
  }

  return {
    nodes: [...usersMap.values(), ...sharedIps],
    edges: [...votesMap.values(), ...ipEdges],
  };
}

function hash(key, salt) {
  const digest = crypto.createHash("md5");
  digest.update(String(key) + String(salt));
  return digest.digest("base64").slice(0, 7);
}

const analytics = {
  getChildContentsPublished,
  getRootContentsPublished,
  getUsersCreated,
  getVotesTaken,
  getVotesGraph,
};

export default analytics;
