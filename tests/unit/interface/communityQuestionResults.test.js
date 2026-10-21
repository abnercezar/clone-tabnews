import {
  clearDraft,
  computeResults,
  describeViewerResult,
  readDraft,
  writeDraft,
} from "interface/CommunityQuestion/results.js";

function option(id, votes, label = id) {
  return { id, label, votes };
}

describe("computeResults", () => {
  test("Percentages always add up to 100", () => {
    const results = computeResults(
      [option("a", 1), option("b", 1), option("c", 1)],
      3,
    );

    expect(results.map((item) => item.percent)).toEqual([34, 33, 33]);
  });

  test("Without votes everything is 0%", () => {
    const results = computeResults([option("a", 0), option("b", 0)], 0);

    expect(results.map((item) => item.percent)).toEqual([0, 0]);
  });

  test("Exact splits are kept", () => {
    const results = computeResults([option("a", 3), option("b", 1)], 4);

    expect(results.map((item) => item.percent)).toEqual([75, 25]);
  });
});

describe("describeViewerResult", () => {
  test("First vote", () => {
    const results = computeResults([option("a", 1), option("b", 0)], 1);

    expect(describeViewerResult(results, "a", 1)).toMatch(/primeiro voto/);
  });

  test("Viewer is with the majority", () => {
    const results = computeResults([option("a", 3), option("b", 1)], 4);

    expect(describeViewerResult(results, "a", 4)).toBe(
      "Você está com a maioria: 2 pessoas escolheram o mesmo que você.",
    );
  });

  test("Viewer is alone in their choice", () => {
    const results = computeResults([option("a", 3), option("b", 1)], 4);

    expect(describeViewerResult(results, "b", 4)).toMatch(/Ninguém mais/);
  });

  test("Viewer is in the minority and sees the leader", () => {
    const results = computeResults(
      [option("a", 4, "Plantio"), option("b", 2, "Colheita")],
      6,
    );

    expect(describeViewerResult(results, "b", 6)).toBe(
      "1 pessoa escolheu o mesmo que você. A mais votada até agora é “Plantio”.",
    );
  });

  test("Tie in the lead", () => {
    const results = computeResults([option("a", 2), option("b", 2)], 4);

    expect(describeViewerResult(results, "a", 4)).toMatch(/^Empate/);
  });

  test("Returns null when the viewer has not voted", () => {
    const results = computeResults([option("a", 2)], 2);

    expect(describeViewerResult(results, null, 2)).toBeNull();
  });
});

describe("drafts", () => {
  function createStorage() {
    const data = {};
    return {
      getItem: (key) => (key in data ? data[key] : null),
      setItem: (key, value) => {
        data[key] = String(value);
      },
      removeItem: (key) => {
        delete data[key];
      },
    };
  }

  test("Writes, reads and clears a draft per question", () => {
    const storage = createStorage();
    const draft = { title: "Título", body: "Relato", category: "clima" };

    writeDraft("q1", draft, storage);
    expect(readDraft("q1", storage)).toEqual(draft);
    expect(readDraft("q2", storage)).toBeNull();

    clearDraft("q1", storage);
    expect(readDraft("q1", storage)).toBeNull();
  });

  test("An empty draft removes the stored one", () => {
    const storage = createStorage();
    writeDraft("q1", { title: "T", body: "B" }, storage);

    writeDraft("q1", { title: " ", body: "" }, storage);

    expect(readDraft("q1", storage)).toBeNull();
  });

  test("Survives a storage that throws or holds invalid data", () => {
    const throwing = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
      removeItem() {
        throw new Error("blocked");
      },
    };

    expect(() =>
      writeDraft("q1", { title: "T", body: "B" }, throwing),
    ).not.toThrow();
    expect(readDraft("q1", throwing)).toBeNull();
    expect(() => clearDraft("q1", throwing)).not.toThrow();

    const corrupted = createStorage();
    corrupted.setItem("agrotab:pergunta:rascunho:q1", "{not json");
    expect(readDraft("q1", corrupted)).toBeNull();
  });
});
