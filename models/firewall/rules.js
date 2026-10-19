import database from "infra/database.js";
import { TooManyRequestsError } from "infra/errors.js";
import content from "models/content.js";
import event from "models/event.js";
import notification from "models/notification.js";

const PG_UNDEFINED_FUNCTION = "42883";

const rules = {
  "create:user": createUserRule,
  "create:content:text_root": createContentTextRootRule,
  "create:content:text_child": createContentTextChildRule,
};

function isFirewallDisabled() {
  return process.env.FIREWALL_ENABLED === "false";
}

function getPgErrorCode(error) {
  let current = error;
  while (current) {
    if (typeof current.code === "string") {
      return current.code;
    }
    current = current.cause;
  }
  return null;
}

function canRequest(ruleId) {
  return async function firewallCanRequestMiddleware(request, response, next) {
    if (isFirewallDisabled()) {
      return next();
    }

    try {
      await rules[ruleId](request.context);
      return next();
    } catch (error) {
      // Passa se a função ainda não existir (migration pendente).
      if (getPgErrorCode(error) === PG_UNDEFINED_FUNCTION) {
        return next();
      }

      throw error;
    }
  };
}

async function createUserRule(context) {
  const results = await database.query({
    text: "SELECT firewall_create_user($1) AS pass",
    values: [context.clientIp],
  });

  if (!results.rows[0].pass) {
    await createUserRuleSideEffect(context);

    throw new TooManyRequestsError({
      message:
        "Identificamos a criação de muitos usuários em um curto período, então usuários criados recentemente podem ter sido desativados.",
      action:
        "Tente novamente mais tarde ou contate o suporte caso acredite que isso seja um erro.",
    });
  }
}

async function createUserRuleSideEffect(context) {
  const results = await database.query({
    text: "SELECT * FROM firewall_create_user_side_effect($1)",
    values: [context.clientIp],
  });

  const affectedUsersIds = [
    ...new Set(results.rows.map((userRow) => userRow.id)),
  ];

  const createdEvent = await event.create({
    type: "firewall:block_users",
    originatorUserId: context.user?.id,
    originatorIp: context.clientIp,
    metadata: {
      from_rule: "create:user",
      users: affectedUsersIds,
    },
  });

  await sendUserNotification(results.rows, createdEvent);
}

function sendUserNotification(userRows, createdEvent) {
  const seen = new Set();
  const notifications = [];

  for (const userRow of userRows) {
    if (seen.has(userRow.id)) {
      continue;
    }
    seen.add(userRow.id);
    notifications.push(
      notification.sendUserDisabled({
        eventId: createdEvent.id,
        user: userRow,
      }),
    );
  }

  return Promise.allSettled(notifications);
}

async function createContentTextRootRule(context) {
  const results = await database.query({
    text: "SELECT firewall_create_content_text_root($1) AS pass",
    values: [context.clientIp],
  });

  if (!results.rows[0].pass) {
    await createContentTextRootRuleSideEffect(context);

    throw new TooManyRequestsError({
      message:
        "Identificamos a criação de muitas publicações em um curto período, então publicações criadas recentemente podem ter sido removidas.",
      action:
        "Tente novamente mais tarde ou contate o suporte caso acredite que isso seja um erro.",
    });
  }
}

async function createContentTextRootRuleSideEffect(context) {
  const results = await database.query({
    text: "SELECT * FROM firewall_create_content_text_root_side_effect($1)",
    values: [context.clientIp],
  });

  const affectedContentsIds = results.rows.map((row) => row.id);

  const createdEvent = await event.create({
    type: "firewall:block_contents:text_root",
    originatorUserId: context.user?.id,
    originatorIp: context.clientIp,
    metadata: {
      from_rule: "create:content:text_root",
      contents: affectedContentsIds,
    },
  });

  await Promise.allSettled([
    undoContentsTabcoins(results.rows, createdEvent),
    sendContentTextNotification(results.rows, createdEvent),
  ]);
}

async function createContentTextChildRule(context) {
  const results = await database.query({
    text: "SELECT firewall_create_content_text_child($1) AS pass",
    values: [context.clientIp],
  });

  if (!results.rows[0].pass) {
    await createContentTextChildRuleSideEffect(context);

    throw new TooManyRequestsError({
      message:
        "Identificamos a criação de muitos comentários em um curto período, então comentários criados recentemente podem ter sido removidos.",
      action:
        "Tente novamente mais tarde ou contate o suporte caso acredite que isso seja um erro.",
    });
  }
}

async function createContentTextChildRuleSideEffect(context) {
  const results = await database.query({
    text: "SELECT * FROM firewall_create_content_text_child_side_effect($1)",
    values: [context.clientIp],
  });

  const affectedContentsIds = results.rows.map((row) => row.id);

  const createdEvent = await event.create({
    type: "firewall:block_contents:text_child",
    originatorUserId: context.user?.id,
    originatorIp: context.clientIp,
    metadata: {
      from_rule: "create:content:text_child",
      contents: affectedContentsIds,
    },
  });

  await Promise.allSettled([
    undoContentsTabcoins(results.rows, createdEvent),
    sendContentTextNotification(results.rows, createdEvent),
  ]);
}

async function undoContentsTabcoins(contentRows, createdEvent) {
  for (const contentObject of contentRows) {
    await content.creditOrDebitTabCoins(
      {
        ...contentObject,
        status: contentObject.status_before_update,
      },
      contentObject,
      {
        eventId: createdEvent.id,
      },
    );
  }
}

function sendContentTextNotification(contentRows, createdEvent) {
  const usersToNotify = {};

  for (const contentRow of contentRows) {
    if (contentRow.owner_id !== createdEvent.originator_user_id) {
      if (usersToNotify[contentRow.owner_id]) {
        usersToNotify[contentRow.owner_id].push(contentRow);
      } else {
        usersToNotify[contentRow.owner_id] = [contentRow];
      }
    }
  }

  const notifications = [];

  for (const [userId, contents] of Object.entries(usersToNotify)) {
    notifications.push(
      notification.sendContentDeletedToUser({
        contents,
        eventId: createdEvent.id,
        userId,
      }),
    );
  }

  return Promise.allSettled(notifications);
}

const rulesModule = {
  canRequest,
};

export default rulesModule;
