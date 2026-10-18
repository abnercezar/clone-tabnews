import database from "infra/database.js";
import { UnprocessableEntityError } from "infra/errors.js";

const tableNameMap = {
  "user:tabcoin": "user_tabcoin_operations",
  "user:tabcash": "user_tabcash_operations",
  "ad:budget": "ad_tabcash_operations",
  default: "content_tabcoin_operations",
};

const balanceTypeMap = {
  "content:tabcoin:credit": "credit",
  "content:tabcoin:debit": "debit",
  "content:tabcoin:initial": "initial",
  "ad:budget": "budget",
};

const sqlFunctionMap = {
  "user:tabcoin": "get_user_current_tabcoins",
  "user:tabcash": "get_user_current_tabcash",
  "ad:budget": "get_ad_current_tabcash",
  default: "get_content_current_tabcoins",
};

async function create(
  { balanceType, recipientId, amount, originatorType, originatorId },
  options = {},
) {
  const tableName = tableNameMap[balanceType] || tableNameMap.default;
  const hasBalanceTypeColumn = !balanceType.startsWith("user:");
  const totalBalanceFunction =
    sqlFunctionMap[balanceType] || sqlFunctionMap.default;
  const returning = options.withBalance
    ? `*, ${totalBalanceFunction}($1) as total`
    : "*";

  const queryObject = {
    text: `
      INSERT INTO ${tableName}
        (recipient_id, amount, originator_type, originator_id${hasBalanceTypeColumn ? ", balance_type" : ""})
      VALUES
        ($1, $2, $3, $4${hasBalanceTypeColumn ? ", $5" : ""})
      RETURNING ${returning};
    `,
    values: [recipientId, amount, originatorType, originatorId],
  };

  if (hasBalanceTypeColumn) {
    queryObject.values.push(balanceTypeMap[balanceType] || balanceType);
  }

  const results = await database.query(queryObject, options);
  return results.rows[0];
}

async function getUserBalances(userId, options = {}) {
  const results = await database.query(
    {
      text: `
        SELECT
          get_user_current_tabcoins($1) AS tabcoins,
          get_user_current_tabcash($1) AS tabcash
      ;`,
      values: [userId],
    },
    options,
  );

  return {
    tabcoins: Number(results.rows[0].tabcoins),
    tabcash: Number(results.rows[0].tabcash),
  };
}

async function getContentTabcoinsCreditDebit({ recipientId }, options = {}) {
  const results = await database.query(
    {
      text: "SELECT * FROM get_content_balance_credit_debit($1);",
      values: [recipientId],
    },
    options,
  );

  return {
    tabcoins: Number(results.rows[0].total_balance),
    tabcoins_credit: Number(results.rows[0].total_credit),
    tabcoins_debit: Number(results.rows[0].total_debit),
  };
}

async function rateContent(
  { contentId, contentOwnerId, fromUserId, transactionType },
  options = {},
) {
  const tabCoinsToDebitFromUser = -2;
  const tabCashToCreditToUser = 1;
  const tabCoinsToTransactToContentOwner =
    transactionType === "credit" ? 1 : -1;
  const tabCoinsToTransactToContent = transactionType === "credit" ? 1 : -1;

  const results = await database.query(
    {
      text: `
      WITH users_tabcoin_inserts AS (
        INSERT INTO user_tabcoin_operations
          (recipient_id, amount, originator_type, originator_id)
        VALUES
          ($1, $2, $8, $9),
          ($6, $7, $8, $9)
        RETURNING
          *
      ),
      users_tabcash_insert AS (
        INSERT INTO user_tabcash_operations
          (recipient_id, amount, originator_type, originator_id)
        VALUES
          ($1, $3, $8, $9)
      ),
      content_insert AS (
        INSERT INTO content_tabcoin_operations
          (balance_type, recipient_id, amount, originator_type, originator_id)
        VALUES
          ($10, $4, $5, 'user', $1)
        RETURNING
          *
      )
      SELECT
        get_user_current_tabcoins($1) AS user_current_tabcoin_balance,
        tabcoins_count.total_balance AS content_current_tabcoin_balance,
        tabcoins_count.total_credit AS content_current_tabcoin_credit,
        tabcoins_count.total_debit AS content_current_tabcoin_debit
      FROM
        users_tabcoin_inserts,
        content_insert,
        get_content_balance_credit_debit(content_insert.recipient_id) tabcoins_count
      LIMIT
        1
    ;`,
      values: [
        fromUserId,
        tabCoinsToDebitFromUser,
        tabCashToCreditToUser,
        contentId,
        tabCoinsToTransactToContent,
        contentOwnerId,
        tabCoinsToTransactToContentOwner,
        "event",
        options.eventId,
        transactionType,
      ],
    },
    options,
  );

  const currentBalances = results.rows[0];

  if (Number(currentBalances.user_current_tabcoin_balance) < 0) {
    throw new UnprocessableEntityError({
      message: "Não foi possível adicionar TabCoins nesta publicação.",
      action: `Você precisa de pelo menos ${Math.abs(tabCoinsToDebitFromUser)} TabCoins para realizar esta ação.`,
    });
  }

  return {
    tabcoins: Number(currentBalances.content_current_tabcoin_balance),
    tabcoins_credit: Number(currentBalances.content_current_tabcoin_credit),
    tabcoins_debit: Number(currentBalances.content_current_tabcoin_debit),
  };
}

const balance = {
  create,
  getUserBalances,
  getContentTabcoinsCreditDebit,
  rateContent,
};

export default balance;
