import { loginHref, safeRedirectPath } from "interface/loginRedirect";

describe("safeRedirectPath", () => {
  test("mantém caminho interno com busca e âncora", () => {
    expect(safeRedirectPath("/produtora/milho-safrinha")).toBe(
      "/produtora/milho-safrinha",
    );
    expect(safeRedirectPath("/publicar?modelo=pergunta")).toBe(
      "/publicar?modelo=pergunta",
    );
    expect(safeRedirectPath("/#pergunta")).toBe("/#pergunta");
  });

  test("recusa destino externo ou malformado", () => {
    for (const value of [
      "https://exemplo.com",
      "//exemplo.com",
      "/\\exemplo.com",
      "javascript:alert(1)",
      "exemplo.com",
      "/caminho\nquebrado",
      "",
      undefined,
      null,
      ["/a"],
    ]) {
      expect(safeRedirectPath(value)).toBe("/");
    }
  });

  test("não volta para o próprio login", () => {
    expect(safeRedirectPath("/login")).toBe("/");
    expect(safeRedirectPath("/login?redirect=/x")).toBe("/");
    expect(safeRedirectPath("/loginho")).toBe("/loginho");
  });
});

describe("loginHref", () => {
  test("leva o caminho de volta codificado", () => {
    expect(loginHref("/produtora/milho?publicado=1")).toBe(
      "/login?redirect=%2Fprodutora%2Fmilho%3Fpublicado%3D1",
    );
  });

  test("sem destino útil, é só /login", () => {
    expect(loginHref("/")).toBe("/login");
    expect(loginHref("https://exemplo.com")).toBe("/login");
  });
});
