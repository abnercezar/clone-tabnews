import prestige from "models/prestige.js";

describe("prestige model", () => {
  describe("calcTabcoinsAverage", () => {
    test.each([
      [undefined, 1],
      [[], 1],
      [[{ tabcoins: 2 }, { tabcoins: 4 }], 3],
      [[{ tabcoins: 0 }, { tabcoins: 0 }], 0],
    ])("given %p returns %p", (input, expected) => {
      expect(prestige.calcTabcoinsAverage(input)).toBe(expected);
    });
  });

  describe("calcPrestigeLevel", () => {
    test.each([
      [true, 0.4, -1],
      [true, 1.0, 0],
      [true, 1.15, 1],
      [true, 2.5, 8],
      [false, 0.3, -1],
      [false, 1.0, 0],
      [false, 1.25, 3],
      [false, 2.1, 8],
    ])(
      "given isRoot %p and mean %p, returns prestige %p",
      (isRoot, mean, expected) => {
        expect(prestige.calcPrestigeLevel(mean, isRoot)).toBe(expected);
      },
    );
  });
});
