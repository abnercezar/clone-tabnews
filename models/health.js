import { performance } from "node:perf_hooks";
import database from "infra/database.js";

async function getDependencies() {
  const [databaseDependency, webserverDependency] = await Promise.all([
    checkDatabaseDependency(),
    Promise.resolve(checkWebserverDependency()),
  ]);

  return {
    database: databaseDependency,
    webserver: webserverDependency,
  };
}

async function checkDatabaseDependency() {
  try {
    const firstQueryTimer = performance.now();
    const maxConnectionsResult = await database.query("SHOW max_connections;");
    const reservedConnectionsResult = await database.query(
      "SHOW superuser_reserved_connections;",
    );
    const maxConnectionsValue = maxConnectionsResult.rows[0].max_connections;
    const reservedConnectionsValue =
      reservedConnectionsResult.rows[0].superuser_reserved_connections;
    const firstQueryDuration = performance.now() - firstQueryTimer;

    const secondQueryTimer = performance.now();
    const openConnectionsResult = await database.query({
      text: `
        SELECT
          numbackends AS opened_connections
        FROM
          pg_stat_database
        WHERE
          datname = $1
      ;`,
      values: [process.env.POSTGRES_DB],
    });
    const openConnectionsValue =
      openConnectionsResult.rows[0]?.opened_connections ?? 0;
    const secondQueryDuration = performance.now() - secondQueryTimer;

    const thirdQueryTimer = performance.now();
    const versionResult = await database.query("SHOW server_version;");
    const versionResultValue = versionResult.rows[0].server_version;
    const thirdQueryDuration = performance.now() - thirdQueryTimer;

    return {
      status: "healthy",
      max_connections:
        parseInt(maxConnectionsValue, 10) -
        parseInt(reservedConnectionsValue, 10),
      opened_connections: Number(openConnectionsValue),
      latency: {
        first_query: firstQueryDuration,
        second_query: secondQueryDuration,
        third_query: thirdQueryDuration,
      },
      version: versionResultValue,
    };
  } catch (error) {
    console.error("[health] database unhealthy", {
      name: error?.name,
      message: error?.message,
    });
    return {
      status: "unhealthy",
    };
  }
}

function checkWebserverDependency() {
  return {
    status: "healthy",
    provider: process.env.VERCEL ? "vercel" : "local",
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "local",
    aws_region: process.env.AWS_REGION || null,
    vercel_region: process.env.VERCEL_REGION || null,
    timezone:
      process.env.TZ || Intl.DateTimeFormat().resolvedOptions().timeZone,
    last_commit_author: process.env.VERCEL_GIT_COMMIT_AUTHOR_LOGIN || null,
    last_commit_message: process.env.VERCEL_GIT_COMMIT_MESSAGE || null,
    last_commit_message_sha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    version: process.version,
  };
}

const health = {
  getDependencies,
};

export default health;
