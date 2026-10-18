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
        if (source.includes("dangerouslySetInnerHTML")) {
          offenders.push(path.relative(process.cwd(), file));
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
