import {
  PUBLISH_TEMPLATES,
  clearPublishDraft,
  findTemplateGuides,
  isUntouchedTemplateDraft,
  readPublishDraft,
  writePublishDraft,
  VISITOR_DRAFT_ID,
  moveVisitorDraft,
} from "interface/publishTemplates";

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

describe("findTemplateGuides", () => {
  test("acha os trechos-guia que sobraram do modelo", () => {
    const body = PUBLISH_TEMPLATES[0].body;
    expect(findTemplateGuides(body)).toContain(
      "[ex.: soja, café, gado de corte]",
    );
  });

  test("texto preenchido não acusa nada", () => {
    expect(
      findTemplateGuides(
        "**Cultura/criação:** soja\n\nVeja [este link](https://exemplo.com) e - [x] feito",
      ),
    ).toEqual([]);
    expect(findTemplateGuides(undefined)).toEqual([]);
  });
});

describe("isUntouchedTemplateDraft", () => {
  test("modelo intacto e sem título não é texto da pessoa", () => {
    expect(
      isUntouchedTemplateDraft({
        title: "  ",
        body: PUBLISH_TEMPLATES[0].body,
      }),
    ).toBe(true);
  });

  test("título ou texto alterado conta como rascunho", () => {
    expect(
      isUntouchedTemplateDraft({
        title: "Ferrugem na soja",
        body: PUBLISH_TEMPLATES[0].body,
      }),
    ).toBe(false);
    expect(
      isUntouchedTemplateDraft({
        title: "",
        body: "Já descrevi o problema.",
      }),
    ).toBe(false);
    expect(isUntouchedTemplateDraft(null)).toBe(false);
  });
});

describe("rascunho de publicação", () => {
  test("grava, lê e apaga por usuário", () => {
    const storage = memoryStorage();
    writePublishDraft("u1", { title: "Milho", body: "Texto" }, storage);
    expect(readPublishDraft("u1", storage)).toEqual({
      title: "Milho",
      body: "Texto",
      tags: [],
    });
    expect(readPublishDraft("u2", storage)).toBeNull();
    clearPublishDraft("u1", storage);
    expect(readPublishDraft("u1", storage)).toBeNull();
  });

  test("texto vazio remove o rascunho", () => {
    const storage = memoryStorage();
    writePublishDraft("u1", { title: "Milho", body: "" }, storage);
    writePublishDraft("u1", { title: " ", body: "" }, storage);
    expect(readPublishDraft("u1", storage)).toBeNull();
  });

  test("rascunho corrompido ou sem armazenamento não quebra", () => {
    const storage = memoryStorage();
    storage.setItem("agrotab:publicar:rascunho:u1", "{quebrado");
    expect(readPublishDraft("u1", storage)).toBeNull();
    expect(readPublishDraft("u1", null)).toBeNull();
    expect(() =>
      writePublishDraft("u1", { title: "a", body: "b" }, null),
    ).not.toThrow();
  });

  test("guarda as tags escolhidas", () => {
    const storage = memoryStorage();
    writePublishDraft(
      "u1",
      { title: "Milho", body: "Texto", tags: ["milho", 3] },
      storage,
    );
    expect(readPublishDraft("u1", storage).tags).toEqual(["milho"]);
  });
});

describe("rascunho do visitante", () => {
  test("passa para a conta depois do login", () => {
    const storage = memoryStorage();
    writePublishDraft(
      VISITOR_DRAFT_ID,
      { title: "Percevejo na soja", body: "Como controlar?", tags: ["soja"] },
      storage,
    );

    expect(moveVisitorDraft("u1", storage)).toEqual({
      title: "Percevejo na soja",
      body: "Como controlar?",
      tags: ["soja"],
    });
    expect(readPublishDraft("u1", storage).title).toBe("Percevejo na soja");
    expect(readPublishDraft(VISITOR_DRAFT_ID, storage)).toBeNull();
  });

  test("não sobrescreve um rascunho que a conta já tinha", () => {
    const storage = memoryStorage();
    writePublishDraft("u1", { title: "Antigo", body: "Meu texto" }, storage);
    writePublishDraft(
      VISITOR_DRAFT_ID,
      { title: "Novo", body: "Outro texto" },
      storage,
    );

    expect(moveVisitorDraft("u1", storage)).toBeNull();
    expect(readPublishDraft("u1", storage).title).toBe("Antigo");
  });

  test("sem rascunho de visitante não faz nada", () => {
    expect(moveVisitorDraft("u1", memoryStorage())).toBeNull();
  });
});
