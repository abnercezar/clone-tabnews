#!/usr/bin/env node
/* eslint-env es2021 */
/**
 * Busca as aulas do curso.dev e gera `aulas-curso.dev.md` com as URLs.
 *
 * Uso:
 *   # Com cookie de sessão (DevTools → Application → Cookies → curso.dev)
 *   CURSO_DEV_COOKIE='nome=valor; outro=valor' node infra/scripts/fetch-curso-lessons.mjs
 *
 *   # A partir de um JSON local (ex.: resposta colada da Network)
 *   node infra/scripts/fetch-curso-lessons.mjs --from-file=curso-lessons.json
 *
 *   # Só imprimir no terminal
 *   node infra/scripts/fetch-curso-lessons.mjs --stdout
 *
 * Variáveis opcionais:
 *   CURSO_DEV_COURSE=web|ia   (padrão: web)
 *   CURSO_DEV_BASE_URL=https://curso.dev
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");

const BASE_URL = process.env.CURSO_DEV_BASE_URL || "https://curso.dev";
const COURSE = process.env.CURSO_DEV_COURSE || "web";
const OUTPUT_MD = path.join(PROJECT_ROOT, "aulas-curso.dev.md");
const OUTPUT_JSON = path.join(PROJECT_ROOT, "curso-lessons.json");

function parseArgs(argv) {
  const args = { fromFile: null, stdout: false, help: false };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--stdout") args.stdout = true;
    else if (arg.startsWith("--from-file=")) {
      args.fromFile = arg.slice("--from-file=".length);
    }
  }
  return args;
}

function lessonUrl(lesson) {
  const course = lesson.course_slug || COURSE;
  const slug = lesson.slug || lesson.content_slug;
  return `${BASE_URL}/${course}/${slug}`;
}

function isCompleted(lesson) {
  return Boolean(lesson.progress_completed_at);
}

function isInProgress(lesson) {
  return Boolean(lesson.progress_created_at) && !isCompleted(lesson);
}

function isNotStarted(lesson) {
  return !lesson.progress_created_at;
}

function checkboxMark(lesson) {
  if (isCompleted(lesson)) return "x";
  if (isInProgress(lesson)) return "~";
  return " ";
}

function lessonLine(lesson) {
  const title = lesson.content_title || lesson.slug;
  const url = lessonUrl(lesson);
  const visibility =
    lesson.listing_visibility === "unlisted" ? " _(unlisted)_" : "";
  return `- [${checkboxMark(lesson)}] [${title}](${url}) — \`${lesson.slug}\` · ${lesson.xp ?? 0} xp${visibility}`;
}

function groupBySection(lessons) {
  const map = new Map();
  for (const lesson of lessons) {
    const section = lesson.listing_section || "Sem seção";
    if (!map.has(section)) map.set(section, []);
    map.get(section).push(lesson);
  }
  return map;
}

function summarize(lessons) {
  const total = lessons.length;
  const completed = lessons.filter(isCompleted);
  const inProgress = lessons.filter(isInProgress);
  const notStarted = lessons.filter(isNotStarted);
  const xpDone = completed.reduce((sum, l) => sum + (l.xp || 0), 0);
  const xpTotal = lessons.reduce((sum, l) => sum + (l.xp || 0), 0);
  const pct = total === 0 ? 0 : ((completed.length / total) * 100).toFixed(1);

  return {
    total,
    completed,
    inProgress,
    notStarted,
    xpDone,
    xpTotal,
    pct,
  };
}

function buildMarkdown(lessons) {
  const sorted = [...lessons].sort(
    (a, b) => (a.listing_order ?? 0) - (b.listing_order ?? 0),
  );
  const stats = summarize(sorted);

  const lines = [
    `# Aulas — curso.dev /${COURSE}`,
    "",
    `Gerado em ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
    "",
    "## Comparação de progresso",
    "",
    `- Total de aulas: **${stats.total}**`,
    `- Concluídas: **${stats.completed.length}**`,
    `- Em andamento (começou, não concluiu): **${stats.inProgress.length}**`,
    `- Não iniciadas: **${stats.notStarted.length}**`,
    `- Progresso: **${stats.completed.length}/${stats.total}** (${stats.pct}%)`,
    `- XP: **${stats.xpDone}/${stats.xpTotal}**`,
    `- API: \`${BASE_URL}/api/v1/lessons/${COURSE}/progress\``,
    `- Legenda: \`[x]\` concluída · \`[~]\` em andamento · \`[ ]\` não iniciada`,
    "",
  ];

  if (stats.inProgress.length > 0) {
    lines.push("## Em andamento");
    lines.push("");
    for (const lesson of stats.inProgress) {
      lines.push(lessonLine(lesson));
    }
    lines.push("");
  }

  if (stats.notStarted.length > 0) {
    lines.push("## Não iniciadas");
    lines.push("");
    for (const lesson of stats.notStarted) {
      lines.push(lessonLine(lesson));
    }
    lines.push("");
  }

  lines.push("## Resumo por seção");
  lines.push("");
  const bySection = groupBySection(sorted);
  for (const [section, sectionLessons] of bySection) {
    const done = sectionLessons.filter(isCompleted).length;
    lines.push(`- ${section}: **${done}/${sectionLessons.length}**`);
  }
  lines.push("");

  for (const [section, sectionLessons] of bySection) {
    lines.push(`## ${section}`);
    lines.push("");
    for (const lesson of sectionLessons) {
      lines.push(lessonLine(lesson));
    }
    lines.push("");
  }

  lines.push("## Índice rápido (todas as URLs)");
  lines.push("");
  for (const lesson of sorted) {
    lines.push(`- ${lessonUrl(lesson)}`);
  }
  lines.push("");

  return lines.join("\n");
}

function printSummary(lessons) {
  const stats = summarize(lessons);
  console.error(
    `Progresso: ${stats.completed.length}/${stats.total} (${stats.pct}%) | Em andamento: ${stats.inProgress.length} | Não iniciadas: ${stats.notStarted.length} | XP: ${stats.xpDone}/${stats.xpTotal}`,
  );
}

async function fetchFromApi(cookie) {
  const url = `${BASE_URL}/api/v1/lessons/${COURSE}/progress`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Cookie: cookie,
      "User-Agent": "clone-tabnews-fetch-curso-lessons/1.0",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Falha ao buscar ${url}: HTTP ${response.status}\n${body.slice(0, 500)}`,
    );
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error(
      "Resposta da API não é um array. Verifique o cookie e o course slug.",
    );
  }
  return data;
}

function loadFromFile(filePath) {
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.join(PROJECT_ROOT, filePath);
  const raw = fs.readFileSync(absolute, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error(`Arquivo ${absolute} deve conter um array JSON de aulas.`);
  }
  return data;
}

function printHelp() {
  console.log(`Uso:
  CURSO_DEV_COOKIE='...' node infra/scripts/fetch-curso-lessons.mjs
  node infra/scripts/fetch-curso-lessons.mjs --from-file=curso-lessons.json

Como pegar o cookie:
  1. Abra https://curso.dev e faça login
  2. DevTools → Application → Cookies → curso.dev
  3. Copie os cookies (ex.: session_id=...)
  4. Exporte: export CURSO_DEV_COOKIE='session_id=...'

Opções:
  --from-file=PATH   Usa JSON local em vez da API
  --stdout           Só imprime o markdown (não grava arquivos)
  CURSO_DEV_COURSE   web (padrão) ou ia
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  let lessons;
  if (args.fromFile) {
    lessons = loadFromFile(args.fromFile);
    console.error(`Lido ${lessons.length} aulas de ${args.fromFile}`);
  } else {
    const cookie = process.env.CURSO_DEV_COOKIE;
    if (!cookie) {
      printHelp();
      console.error(
        "\nErro: defina CURSO_DEV_COOKIE ou use --from-file=arquivo.json",
      );
      process.exit(1);
    }
    lessons = await fetchFromApi(cookie);
    console.error(`Baixadas ${lessons.length} aulas de /${COURSE}`);
  }

  printSummary(lessons);
  const markdown = buildMarkdown(lessons);

  if (args.stdout) {
    process.stdout.write(markdown);
    return;
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(lessons, null, 2) + "\n");
  fs.writeFileSync(OUTPUT_MD, markdown);
  console.error(`Salvo: ${path.relative(PROJECT_ROOT, OUTPUT_JSON)}`);
  console.error(`Salvo: ${path.relative(PROJECT_ROOT, OUTPUT_MD)}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
