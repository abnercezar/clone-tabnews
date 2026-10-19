import database from "infra/database.js";
import { NotFoundError, ValidationError } from "infra/errors.js";
import balance from "models/balance.js";
import content from "models/content.js";
import event from "models/event.js";
import user from "models/user.js";
import eventTypes from "models/firewall/event-types.js";
import firewallFind from "models/firewall/find.js";

const reviewFunctions = {
  "moderation:block_users": confirmBlockUsers,
  "moderation:block_contents:text_root": confirmBlockContents,
  "moderation:block_contents:text_child": confirmBlockContents,
  "moderation:unblock_users": unblockUsers,
  "moderation:unblock_contents:text_root": unblockContents,
  "moderation:unblock_contents:text_child": unblockContents,
};

async function reviewEvent({
  action,
  eventId,
  originatorIp,
  originatorUserId,
}) {
  const relatedEvents = await validateAndGetRelatedEventsToReview(eventId);

  const users = new Set();
  const contents = new Set();

  for (const firewallEvent of relatedEvents) {
    firewallEvent.metadata?.users?.forEach((userId) => users.add(userId));
    firewallEvent.metadata?.contents?.forEach((contentId) =>
      contents.add(contentId),
    );
  }

  const metadata = {
    related_events: relatedEvents.map((e) => e.id),
    users: users.size ? Array.from(users) : undefined,
    contents: contents.size ? Array.from(contents) : undefined,
  };

  const eventType = eventTypes.reviewByAction[action]?.[relatedEvents[0].type];

  if (!eventType) {
    throw new ValidationError({
      message: "A ação de revisão informada é inválida.",
      action: 'Utilize "confirm" ou "undo".',
    });
  }

  return await database.withTransaction(async (transaction) => {
    const createdEvent = await event.create(
      {
        type: eventType,
        originatorUserId,
        originatorIp,
        metadata,
      },
      {
        transaction,
      },
    );

    const events = [...relatedEvents, createdEvent];

    const affected = await reviewFunctions[eventType]({
      transaction,
      event: createdEvent,
    });

    return {
      affected,
      events,
    };
  });
}

async function validateAndGetRelatedEventsToReview(eventId) {
  const relatedEvents = await firewallFind.findAllRelatedEvents(eventId);

  if (!relatedEvents.length) {
    throw new NotFoundError({
      message: `O id "${eventId}" não foi encontrado no sistema.`,
      action: 'Verifique se o "id" está digitado corretamente.',
    });
  }

  const reviewingEvent = relatedEvents.find((e) =>
    eventTypes.review.includes(e.type),
  );

  if (reviewingEvent) {
    throw new ValidationError({
      message: "Você está tentando analisar um evento que já foi analisado.",
      action:
        'Utilize um "id" que aponte para um evento de firewall que ainda não foi analisado.',
    });
  }

  const firewallEvent = relatedEvents.find((e) =>
    eventTypes.firewall.includes(e.type),
  );

  if (!firewallEvent) {
    throw new NotFoundError({
      message: `O id "${eventId}" não foi encontrado no sistema.`,
      action: 'Verifique se o "id" está digitado corretamente.',
    });
  }

  return relatedEvents;
}

async function confirmBlockUsers(options) {
  const affectedUsers = await user.addFeatures(
    options.event.metadata.users,
    ["nuked"],
    {
      ...options,
      withBalances: true,
      ignoreUpdatedAt: true,
    },
  );

  return {
    users: Array.isArray(affectedUsers) ? affectedUsers : [affectedUsers],
  };
}

async function confirmBlockContents(options) {
  const affectedContents = await content.confirmFirewallStatus(
    options.event.metadata.contents,
    options,
  );

  const usersIds = new Set();

  for (const contentRow of affectedContents) {
    usersIds.add(contentRow.owner_id);
  }

  let affectedUsers = [];

  if (usersIds.size) {
    affectedUsers = await user.findAllByIds(Array.from(usersIds), {
      ...options,
      withBalances: true,
    });
  }

  return {
    contents: affectedContents,
    users: affectedUsers,
  };
}

async function unblockUsers(options) {
  const users = await user.findAllByIds(options.event.metadata.users, options);
  const inactiveUsers = [];
  const activeUsers = [];

  for (const userData of users) {
    if (
      userData.features.length === 0 ||
      (userData.features.length === 1 && userData.features[0] === "nuked")
    ) {
      inactiveUsers.push(userData.id);
    } else {
      activeUsers.push(userData.id);
    }
  }

  const affectedUsers = [];

  const updateOptions = {
    ...options,
    withBalances: true,
    ignoreUpdatedAt: true,
  };

  if (activeUsers.length) {
    const updatedUsers = await user.addFeatures(
      activeUsers,
      ["create:session", "read:session"],
      updateOptions,
    );
    affectedUsers.push(
      ...(Array.isArray(updatedUsers) ? updatedUsers : [updatedUsers]),
    );
  }

  if (inactiveUsers.length) {
    const updatedUsers = await user.addFeatures(
      inactiveUsers,
      ["read:activation_token"],
      updateOptions,
    );
    affectedUsers.push(
      ...(Array.isArray(updatedUsers) ? updatedUsers : [updatedUsers]),
    );
  }

  return {
    users: affectedUsers,
  };
}

async function unblockContents(options) {
  const affectedContents = await content.undoFirewallStatus(
    options.event.metadata.contents,
    options,
  );

  const balanceOperations = await balance.findAllByOriginatorId(
    options.event.metadata.related_events,
    options,
  );

  for (const operation of balanceOperations) {
    await balance.undo(operation, options);
  }

  const usersIds = new Set();

  for (const contentRow of affectedContents) {
    usersIds.add(contentRow.owner_id);
  }

  let affectedUsers = [];

  if (usersIds.size) {
    affectedUsers = await user.findAllByIds(Array.from(usersIds), {
      ...options,
      withBalances: true,
    });
  }

  return {
    contents: affectedContents,
    users: affectedUsers,
  };
}

const review = {
  reviewEvent,
};

export default review;
