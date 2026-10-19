#!/usr/bin/env node
/**
 * Promove um usuário a admin (features privilegiadas estilo TabNews).
 *
 * Uso:
 *   ADMIN_EMAIL=voce@email.com npm run admin:promote
 *   ADMIN_EMAIL=voce@email.com ENV_PATH=.env.production npm run admin:promote
 *
 * Sem ADMIN_EMAIL, usa o primeiro argumento:
 *   npm run admin:promote -- voce@email.com
 */
const dotenv = require("dotenv");
const dotenvExpand = require("dotenv-expand");
const path = require("node:path");

const envPath = process.env.ENV_PATH || ".env.development";
dotenvExpand.expand(
  dotenv.config({ path: path.resolve(process.cwd(), envPath), override: true }),
);

const { Client } = require("pg");

const ADMIN_FEATURES = [
  "create:session",
  "read:session",
  "update:user",
  "create:content",
  "read:content",
  "update:content",
  "delete:content",
  "create:sponsorship",
  "read:sponsorship",
  "read:recovery_token",
  "update:user:others",
  "delete:content:others",
  "update:content:others",
  "create:migration",
  "read:migration",
  "read:status:all",
  "read:user:list",
  "ban:user",
];

async function main() {
  const email =
    process.env.ADMIN_EMAIL || process.argv[2] || process.argv.at(-1);

  if (!email || email.startsWith("-") || email.includes("promote-admin")) {
    console.error(
      "Informe o e-mail: ADMIN_EMAIL=dono@email.com npm run admin:promote",
    );
    process.exit(1);
  }

  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    ssl: process.env.POSTGRES_CA
      ? { ca: process.env.POSTGRES_CA, rejectUnauthorized: true }
      : process.env.NODE_ENV === "production" ||
          (process.env.POSTGRES_HOST || "").includes("neon.tech")
        ? { rejectUnauthorized: false }
        : undefined,
  });

  await client.connect();

  const result = await client.query(
    `
      UPDATE users
      SET
        features = $2::varchar[],
        updated_at = timezone('utc', now())
      WHERE LOWER(email) = LOWER($1)
      RETURNING id, username, email, features
    ;`,
    [email, ADMIN_FEATURES],
  );

  await client.end();

  if (result.rowCount === 0) {
    console.error(`Usuário não encontrado: ${email}`);
    process.exit(1);
  }

  const promoted = result.rows[0];
  console.log("Admin promovido:");
  console.log(`  username: ${promoted.username}`);
  console.log(`  email: ${promoted.email}`);
  console.log(`  features: ${promoted.features.join(", ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
