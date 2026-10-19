import {
  markdownPlugins,
  markdownPluginsLite,
} from "interface/markdownPlugins.js";

describe("`interface/markdownPlugins.js`", () => {
  test("Exports a non-empty lite plugin list", () => {
    expect(Array.isArray(markdownPluginsLite)).toBe(true);
    expect(markdownPluginsLite.length).toBeGreaterThan(0);
  });

  test("Exports a non-empty full plugin list", () => {
    expect(Array.isArray(markdownPlugins)).toBe(true);
    expect(markdownPlugins.length).toBeGreaterThan(0);
  });

  test("Full plugin list is larger than the lite list", () => {
    expect(markdownPlugins.length).toBeGreaterThan(markdownPluginsLite.length);
  });
});
