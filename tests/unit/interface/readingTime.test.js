import { formatReadingTime } from "interface/readingTime";

function words(count) {
  return Array.from({ length: count }, () => "milho").join(" ");
}

describe("`interface/readingTime.js`", () => {
  test("Uses at least one minute", () => {
    expect(formatReadingTime("")).toBe("1 min de leitura");
    expect(formatReadingTime("   ")).toBe("1 min de leitura");
    expect(formatReadingTime(null)).toBe("1 min de leitura");
    expect(formatReadingTime(words(1))).toBe("1 min de leitura");
    expect(formatReadingTime(words(200))).toBe("1 min de leitura");
  });

  test("Rounds to the nearest minute", () => {
    expect(formatReadingTime(words(300))).toBe("2 min de leitura");
    expect(formatReadingTime(words(400))).toBe("2 min de leitura");
    expect(formatReadingTime(words(500))).toBe("3 min de leitura");
  });
});
