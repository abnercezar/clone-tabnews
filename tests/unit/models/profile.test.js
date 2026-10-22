import profile from "models/profile.js";

describe("models/profile", () => {
  test("credentialText junta ocupação e estado", () => {
    expect(
      profile.credentialText({ occupation: "agronomo", state: "GO" }),
    ).toBe("Agrônomo · GO");
    expect(profile.credentialText({ occupation: "produtor" })).toBe("Produtor");
    expect(profile.credentialText({ state: "RS" })).toBe("RS");
    expect(profile.credentialText({})).toBe("");
  });

  test("validateState aceita minúsculas e vazio", () => {
    expect(profile.validateState("pr")).toBe("PR");
    expect(profile.validateState("")).toBeNull();
    expect(() => profile.validateState("XX")).toThrow(
      "O estado informado não é válido.",
    );
  });

  test("validateCrops remove repetidas e limita a 5", () => {
    const known = ["soja", "milho", "cafe", "trigo", "aves", "suinos"];
    expect(profile.validateCrops(["Soja", "soja", "milho"], known)).toEqual([
      "soja",
      "milho",
    ]);
    expect(() => profile.validateCrops(known, known)).toThrow(
      "Escolha no máximo 5 culturas ou criações.",
    );
  });
});
