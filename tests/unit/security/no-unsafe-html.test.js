import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

function walk(dir, acc = []) {
  if (!existsSync(dir)) {
    return acc;
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, acc);
    } else if (/\.(js|jsx)$/.test(entry.name)) {
      acc.push(full);
    }
  }

  return acc;
}

// interface/JsonLd é a única exceção: serializa dados estruturados com
// JSON.stringify e escapa "<" (coberto pelo teste abaixo).
const ALLOWED = [path.join("interface", "JsonLd", "index.js")];

describe("Markdown / XSS posture", () => {
  test("pages and interface do not use dangerouslySetInnerHTML", () => {
    const roots = [
      path.join(process.cwd(), "pages"),
      path.join(process.cwd(), "interface"),
    ];

    const offenders = [];

    for (const root of roots) {
      for (const file of walk(root)) {
        if (file.includes(`${path.sep}api${path.sep}`)) {
          continue;
        }
        const source = readFileSync(file, "utf8");
        const relative = path.relative(process.cwd(), file);
        if (ALLOWED.includes(relative)) {
          continue;
        }
        if (source.includes("dangerouslySetInnerHTML")) {
          offenders.push(path.relative(process.cwd(), file));
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe("JSON-LD", () => {
  test("serializeJsonLd não deixa fechar a tag script", async () => {
    const { serializeJsonLd } = await import("interface/JsonLd");
    const output = serializeJsonLd({
      headline: '</script><script>alert("xss")</script>',
    });
    expect(output).not.toContain("<");
    expect(JSON.parse(output).headline).toBe(
      '</script><script>alert("xss")</script>',
    );
  });
});
