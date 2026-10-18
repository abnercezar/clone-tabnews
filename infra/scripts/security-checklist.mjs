#!/usr/bin/env node
/**
 * Checklist estrutural de segurança (authz/IDOR, economia, Markdown/XSS, CI).
 * Complementa os testes Jest; não substitui revisão humana.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relPath) {
  return readFileSync(path.join(root, relPath), "utf8");
}

function walkJsFiles(dirRel, acc = []) {
  const abs = path.join(root, dirRel);
  if (!existsSync(abs)) {
    return acc;
  }
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dirRel, entry.name);
    if (entry.isDirectory()) {
      walkJsFiles(rel, acc);
    } else if (/\.(js|jsx|mjs|tsx|ts)$/.test(entry.name)) {
      acc.push(rel);
    }
  }
  return acc;
}

// 1. Artefatos de processo
for (const required of [
  "docs/security-checklist.md",
  "SECURITY.md",
  ".github/dependabot.yml",
  ".github/workflows/security.yaml",
  ".github/security-audit-allowlist.json",
]) {
  if (!existsSync(path.join(root, required))) {
    fail(`Arquivo obrigatório ausente: ${required}`);
  }
}

// 2. filterOutput nas rotas de API (não devolver recurso cru)
const apiFiles = walkJsFiles("pages/api");
for (const rel of apiFiles) {
  const source = read(rel);
  const returnsJson =
    /res\.status\([^)]*\)\.json\(/.test(source) ||
    /response\.status\([^)]*\)\.json\(/.test(source);
  const mutatesOrReadsDomain =
    /models\/(user|content|session|sponsorship|activation|balance)/.test(
      source,
    );
  if (returnsJson && mutatesOrReadsDomain) {
    if (
      !source.includes("authorization.filterOutput") &&
      !source.includes("filterOutput(")
    ) {
      // status e migrations são exceções conhecidas com filtro próprio ou lista
      if (
        !rel.includes("/status/") &&
        !rel.includes("/migrations/") &&
        !rel.endsWith("pages/api/v1/status/index.js")
      ) {
        fail(`${rel}: resposta JSON de domínio sem authorization.filterOutput`);
      }
    }
  }
}

// 3. Sem HTML cru no front (XSS via Markdown/HTML armazenado)
const pageFiles = [...walkJsFiles("pages"), ...walkJsFiles("interface")].filter(
  (rel) => !rel.startsWith("pages/api/"),
);

for (const rel of pageFiles) {
  const source = read(rel);
  if (source.includes("dangerouslySetInnerHTML")) {
    fail(
      `${rel}: usa dangerouslySetInnerHTML — ao renderizar Markdown, exija sanitizer (ex.: rehype-sanitize)`,
    );
  }
}

// 4. Controles de authz / economia presentes
const authorization = read("models/authorization.js");
for (const feature of [
  "update:content",
  "delete:content",
  "create:content",
  "read:user",
  "read:user:self",
]) {
  if (!authorization.includes(`"${feature}"`)) {
    fail(`models/authorization.js sem feature "${feature}"`);
  }
}

const tabcoinsRoute = read(
  "pages/api/v1/contents/[username]/[slug]/tabcoins/index.js",
);
if (
  !tabcoinsRoute.includes("própria autoria") &&
  !tabcoinsRoute.includes("propria autoria")
) {
  fail("tabcoins: bloqueio de auto-voto ausente");
}
if (!/SERIALIZABLE/i.test(tabcoinsRoute)) {
  fail("tabcoins: isolamento SERIALIZABLE ausente");
}

// 5. Rate limit em rotas sensíveis
const rateLimitFile = "infra/rate-limit.js";
if (!existsSync(path.join(root, rateLimitFile))) {
  fail(`${rateLimitFile} ausente`);
} else {
  const usersPost = read("pages/api/v1/users/index.js");
  const sessionsPost = read("pages/api/v1/sessions/index.js");
  const contentsPost = read("pages/api/v1/contents/index.js");
  for (const [rel, source] of [
    ["pages/api/v1/users/index.js", usersPost],
    ["pages/api/v1/sessions/index.js", sessionsPost],
    ["pages/api/v1/contents/index.js", contentsPost],
  ]) {
    if (!/rateLimit|rate-limit|createRateLimiter/.test(source)) {
      fail(`${rel}: sem rate limit`);
    }
  }
}

// 6. Testes de regressão P0 referenciados
const securityTests = [
  "tests/integration/api/v1/users/[username]/patch.test.js",
  "tests/integration/api/v1/contents/[username]/[slug]/tabcoins/post.test.js",
  "tests/integration/api/v1/security/p0.test.js",
  "tests/unit/models/authorization.test.js",
];
for (const rel of securityTests) {
  if (!existsSync(path.join(root, rel))) {
    fail(`Teste de segurança ausente: ${rel}`);
  }
}

const patchTest = read(
  "tests/integration/api/v1/users/[username]/patch.test.js",
);
if (!patchTest.includes("Security (P0 regression)")) {
  fail("patch.test.js sem bloco Security (P0 regression) de IDOR");
}

const tabcoinsTest = read(
  "tests/integration/api/v1/contents/[username]/[slug]/tabcoins/post.test.js",
);
if (!tabcoinsTest.includes("Cannot vote on own content")) {
  fail("tabcoins/post.test.js sem regressão de auto-voto");
}

if (failures.length > 0) {
  console.error("security:checklist FALHOU:\n");
  for (const message of failures) {
    console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log(
  "security:checklist OK (" +
    securityTests.length +
    " suítes + controles estruturais)",
);
process.exit(0);
