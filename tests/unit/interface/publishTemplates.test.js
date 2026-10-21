import {
  PUBLISH_TEMPLATES,
  clearPublishDraft,
  findTemplateGuides,
  readPublishDraft,
  writePublishDraft,
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

describe("rascunho de publicação", () => {
  test("grava, lê e apaga por usuário", () => {
    const storage = memoryStorage();
    writePublishDraft("u1", { title: "Milho", body: "Texto" }, storage);
    expect(readPublishDraft("u1", storage)).toEqual({
      title: "Milho",
      body: "Texto",
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
});
