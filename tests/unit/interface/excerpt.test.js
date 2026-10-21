import { createExcerpt } from "interface/excerpt";

describe("`interface/excerpt.js`", () => {
  test("Returns empty string for empty input", () => {
    expect(createExcerpt("")).toBe("");
    expect(createExcerpt(null)).toBe("");
    expect(createExcerpt(undefined)).toBe("");
  });

  test("Strips markdown syntax", () => {
    const markdown = [
      "# Ferrugem asiática",
      "",
      "Aplicar **fungicida** no [estádio R1](https://exemplo.com).",
      "![foto da lavoura](https://exemplo.com/soja.jpg)",
      "- Monitorar `semanalmente`",
      "> Dica de campo",
    ].join("\n");

    expect(createExcerpt(markdown)).toBe(
      "Ferrugem asiática Aplicar fungicida no estádio R1. Monitorar semanalmente Dica de campo",
    );
  });

  test("Removes code blocks and html", () => {
    expect(createExcerpt("Antes ```\nconst x = 1;\n``` <b>depois</b>")).toBe(
      "Antes depois",
    );
  });

  test("Truncates on a word boundary with ellipsis", () => {
    const text = "milho ".repeat(50);
    const excerpt = createExcerpt(text, 30);

    expect(excerpt.length).toBeLessThanOrEqual(30);
    expect(excerpt.endsWith("…")).toBe(true);
    expect(excerpt).toBe("milho milho milho milho milho…");
  });
});
