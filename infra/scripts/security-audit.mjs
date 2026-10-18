#!/usr/bin/env node
/**
 * npm audit (produção) com allowlist de GHSAs critical documentados.
 * Falha se houver critical novo ou allowlist expirada.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const allowlistPath = path.join(root, ".github/security-audit-allowlist.json");

const audit = spawnSync("npm", ["audit", "--omit=dev", "--json"], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});

let report;
try {
  report = JSON.parse(audit.stdout || "{}");
} catch {
  console.error("Falha ao parsear saída do npm audit.");
  process.exit(1);
}

const meta = report.metadata?.vulnerabilities || {};
console.log("npm audit (omit=dev):", JSON.stringify(meta));

const allowlist = JSON.parse(readFileSync(allowlistPath, "utf8"));
const today = new Date().toISOString().slice(0, 10);
const allowedIds = new Set();

for (const entry of allowlist.critical || []) {
  if (entry.expires && entry.expires < today) {
    console.error(
      `Allowlist expirada: ${entry.id} (${entry.package}) em ${entry.expires}. Atualize o pacote ou renove com justificativa.`,
    );
    process.exit(1);
  }
  allowedIds.add(entry.id);
}

const criticalFindings = [];

for (const [pkgName, info] of Object.entries(report.vulnerabilities || {})) {
  if (info.severity !== "critical") {
    continue;
  }

  const vias = (info.via || []).filter((item) => typeof item === "object");
  for (const via of vias) {
    if (via.severity !== "critical") {
      continue;
    }
    const ghsa = String(via.url || "").match(/GHSA-[\w-]+/)?.[0];
    criticalFindings.push({
      package: pkgName,
      title: via.title,
      ghsa: ghsa || via.url || "unknown",
      url: via.url,
    });
  }

  if (vias.length === 0) {
    criticalFindings.push({
      package: pkgName,
      title: "critical sem via detalhada",
      ghsa: "unknown",
    });
  }
}

const blocking = criticalFindings.filter((item) => !allowedIds.has(item.ghsa));

if (blocking.length > 0) {
  console.error("\nCritical de produção sem allowlist:");
  for (const item of blocking) {
    console.error(`- ${item.package}: ${item.title} (${item.ghsa})`);
  }
  console.error(
    "\nCorrija a dependência ou documente em .github/security-audit-allowlist.json com motivo e expires.",
  );
  process.exit(1);
}

if (criticalFindings.length > 0) {
  console.log("\nCritical allowlisted (revisar antes do expires):");
  for (const item of criticalFindings) {
    console.log(`- ${item.package}: ${item.ghsa}`);
  }
}

const highCount = meta.high || 0;
if (highCount > 0) {
  console.log(
    `\nAviso: ${highCount} vulnerabilidade(s) high em produção (não bloqueiam o CI). Priorize no Dependabot / upgrade de Next e nodemailer.`,
  );
}

console.log("security:audit OK");
process.exit(0);
