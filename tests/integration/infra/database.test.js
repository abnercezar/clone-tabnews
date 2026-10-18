import database from "infra/database.js";
import orchestrator from "tests/orchestrator.js";

beforeAll(async () => {
  await orchestrator.waitForAllServices();
  await orchestrator.clearDatabase();
  await orchestrator.runPendingMigrations();
});

describe("`database.withTransaction()`", () => {
  test("Rolls back every change when the callback fails", async () => {
    await expect(
      database.withTransaction(async (transaction) => {
        await database.query(
          {
            text: `
              INSERT INTO
                events (type)
              VALUES
                ('teste:rollback')
            ;`,
          },
          { transaction },
        );

        throw new Error("falha de propósito");
      }),
    ).rejects.toThrow("falha de propósito");

    const results = await database.query({
      text: `
        SELECT
          COUNT(*)::int AS count
        FROM
          events
        WHERE
          type = 'teste:rollback'
      ;`,
    });

    expect(results.rows[0].count).toBe(0);
  });

  test("Keeps the changes when the callback succeeds", async () => {
    await database.withTransaction(async (transaction) => {
      await database.query(
        {
          text: `
            INSERT INTO
              events (type)
            VALUES
              ('teste:commit')
          ;`,
        },
        { transaction },
      );
    });

    const results = await database.query({
      text: `
        SELECT
          COUNT(*)::int AS count
        FROM
          events
        WHERE
          type = 'teste:commit'
      ;`,
    });

    expect(results.rows[0].count).toBe(1);
  });
});
