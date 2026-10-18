import validator from "models/validator.js";
import { ValidationError } from "infra/errors.js";

describe("`models/validator.js`", () => {
  describe("`.username()`", () => {
    test("accepts a valid username", () => {
      expect(() => validator.username("usuarioValido1")).not.toThrow();
    });

    test("rejects empty, too short, too long, or with special chars", () => {
      expect(() => validator.username("")).toThrow(ValidationError);
      expect(() => validator.username(undefined)).toThrow(ValidationError);
      expect(() => validator.username("ab")).toThrow(ValidationError);
      expect(() => validator.username("a".repeat(31))).toThrow(ValidationError);
      expect(() => validator.username("com espaco")).toThrow(ValidationError);
      expect(() => validator.username("acento_ç")).toThrow(ValidationError);
    });
  });

  describe("`.email()`", () => {
    test("accepts a valid email", () => {
      expect(() => validator.email("pessoa@agrotab.com.br")).not.toThrow();
    });

    test("rejects empty, malformed, or too long", () => {
      expect(() => validator.email("")).toThrow(ValidationError);
      expect(() => validator.email("semarroba")).toThrow(ValidationError);
      expect(() => validator.email("a@b")).toThrow(ValidationError);
      expect(() => validator.email("com espaco@x.com")).toThrow(
        ValidationError,
      );
      expect(() => validator.email(`${"a".repeat(250)}@x.com`)).toThrow(
        ValidationError,
      );
    });
  });

  describe("`.password()`", () => {
    test("accepts a valid password", () => {
      expect(() => validator.password("senhaSegura1")).not.toThrow();
    });

    test("rejects empty, too short, or too long", () => {
      expect(() => validator.password("")).toThrow(ValidationError);
      expect(() => validator.password("curta7!")).toThrow(ValidationError);
      expect(() => validator.password("a".repeat(73))).toThrow(ValidationError);
    });
  });

  describe("`.title()`", () => {
    test("accepts a valid title", () => {
      expect(() => validator.title("Manejo de pragas no milho")).not.toThrow();
    });

    test("rejects empty, blank, or too long", () => {
      expect(() => validator.title("")).toThrow(ValidationError);
      expect(() => validator.title("   ")).toThrow(ValidationError);
      expect(() => validator.title(undefined)).toThrow(ValidationError);
      expect(() => validator.title("a".repeat(257))).toThrow(ValidationError);
    });
  });

  describe("`.body()`", () => {
    test("accepts a valid body", () => {
      expect(() => validator.body("Conteúdo prático.")).not.toThrow();
    });

    test("rejects empty, blank, or too long", () => {
      expect(() => validator.body("")).toThrow(ValidationError);
      expect(() => validator.body("   ")).toThrow(ValidationError);
      expect(() => validator.body(undefined)).toThrow(ValidationError);
      expect(() => validator.body("a".repeat(20001))).toThrow(ValidationError);
    });
  });

  describe("`.uuid()`", () => {
    test("accepts a valid UUID", () => {
      expect(() =>
        validator.uuid("3ee5a2a0-6c3b-4f2b-9b9a-0f1a2b3c4d5e"),
      ).not.toThrow();
    });

    test("rejects malformed UUIDs", () => {
      expect(() => validator.uuid("")).toThrow(ValidationError);
      expect(() => validator.uuid("nao-e-uuid")).toThrow(ValidationError);
      expect(() => validator.uuid("[uuid]")).toThrow(ValidationError);
      expect(() => validator.uuid("12345")).toThrow(ValidationError);
    });
  });
});
