import authorization from "models/authorization.js";
import { InternalServerError } from "infra/errors.js";

describe("`models/authorization.js`", () => {
  describe("`.can()`", () => {
    test("without `user`", () => {
      expect(() => {
        authorization.can();
      }).toThrow(InternalServerError);
    });

    test("without `user.features`", () => {
      const createdUser = {
        username: "UserWithoutFeatures",
      };

      expect(() => {
        authorization.can(createdUser);
      }).toThrow(InternalServerError);
    });

    test("with unknown `feature`", () => {
      const createdUser = {
        features: [],
      };

      expect(() => {
        authorization.can(createdUser, "unknown-feature");
      }).toThrow(InternalServerError);
    });

    test("with valid `user` and known `feature`", () => {
      const createdUser = {
        features: ["create:user"],
      };

      expect(authorization.can(createdUser, "create:user")).toBe(true);
    });
  });

  describe("`.filterOutput()`", () => {
    test("without `user`", () => {
      expect(() => {
        authorization.filterOutput();
      }).toThrow(InternalServerError);
    });

    test("without `user.features`", () => {
      const createdUser = {
        username: "UserWithoutFeatures",
      };

      expect(() => {
        authorization.filterOutput(createdUser);
      }).toThrow(InternalServerError);
    });

    test("with unknown `feature`", () => {
      const createdUser = {
        features: [],
      };

      expect(() => {
        authorization.filterOutput(createdUser, "unknown:feature");
      }).toThrow(InternalServerError);
    });

    test("with valid `user` and known `feature` but no `resource`", () => {
      const createdUser = {
        features: ["read:user"],
      };

      expect(() => {
        authorization.filterOutput(createdUser, "read:user");
      }).toThrow(InternalServerError);
    });

    test("with valid `user`, known `feature` and `resource`", () => {
      const createdUser = {
        features: ["read:user"],
      };

      const resource = {
        id: 1,
        username: "resource",
        features: ["read:user"],
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        email: "resource@resource.com",
        password: "resource",
      };

      const result = authorization.filterOutput(
        createdUser,
        "read:user",
        resource,
      );

      expect(result).toEqual({
        id: 1,
        username: "resource",
        features: ["read:user"],
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      });
    });

    test("read:user includes balances when present", () => {
      const createdUser = {
        features: ["read:user"],
      };

      const resource = {
        id: 1,
        username: "resource",
        features: ["read:user"],
        tabcoins: 12,
        tabcash: 3,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        email: "resource@resource.com",
        password: "resource",
      };

      const result = authorization.filterOutput(
        createdUser,
        "read:user",
        resource,
      );

      expect(result).toEqual({
        id: 1,
        username: "resource",
        features: ["read:user"],
        tabcoins: 12,
        tabcash: 3,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      });
      expect(result.password).toBeUndefined();
      expect(result.email).toBeUndefined();
    });

    test("read:user:self never leaks password", () => {
      const createdUser = {
        id: "user-1",
        features: ["read:user:self"],
      };

      const resource = {
        id: "user-1",
        username: "eu",
        email: "eu@agrotab.com.br",
        password: "hash-secreto",
        features: ["read:user:self"],
        tabcoins: 4,
        tabcash: 1,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      };

      const result = authorization.filterOutput(
        createdUser,
        "read:user:self",
        resource,
      );

      expect(result.password).toBeUndefined();
      expect(result.email).toBe("eu@agrotab.com.br");
      expect(result.tabcoins).toBe(4);
      expect(result.tabcash).toBe(1);
    });

    test("read:content never leaks unexpected fields", () => {
      const anonymous = { features: ["read:content"] };
      const resource = {
        id: "c1",
        owner_id: "u1",
        owner_username: "autor",
        parent_id: null,
        slug: "slug",
        title: "Titulo",
        body: "<script>alert(1)</script>",
        status: "published",
        type: "content",
        tabcoins: 1,
        tabcoins_credit: 1,
        tabcoins_debit: 0,
        published_at: "2026-01-01T00:00:00.000Z",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        password: "nao-deveria",
        email: "nao@deveria.com",
      };

      const result = authorization.filterOutput(
        anonymous,
        "read:content",
        resource,
      );

      expect(result.password).toBeUndefined();
      expect(result.email).toBeUndefined();
      expect(result.body).toBe("<script>alert(1)</script>");
    });
  });
});
