import database from "infra/database.js";
import balance from "models/balance.js";
import session from "models/session.js";
import user from "models/user.js";

// Ban permanente (estilo TabNews `nuke`), adaptado ao AgroTab:
// remove features, expira sessões, despublica conteúdos, desfaz ratings e marca `nuked`.
async function nuke(userId, options = {}) {
  await user.setFeatures(userId, [], options);
  await session.expireAllFromUserId(userId, options);
  await unpublishAllContent(userId, options);
  await undoAllRatingOperations(userId, options);
  return await user.addFeatures(userId, ["nuked"], options);
}

async function unpublishAllContent(userId, options = {}) {
  await database.query(
    {
      text: `
        UPDATE
          contents
        SET
          status = 'deleted',
          updated_at = timezone('utc', now())
        WHERE
          owner_id = $1
          AND status != 'deleted'
      ;`,
      values: [userId],
    },
    options,
  );
}

async function undoAllRatingOperations(userId, options = {}) {
  const userEvents = await getAllRatingEventsFromUser(userId, options);

  for (const userEvent of userEvents) {
    const eventBalanceOperations = await balance.findAllByOriginatorId(
      userEvent.id,
      options,
    );

    for (const eventBalanceOperation of eventBalanceOperations) {
      await balance.undo(eventBalanceOperation, options);
    }
  }

  const userBalanceOperations = await balance.findAllByOriginatorId(
    userId,
    options,
  );

  for (const userBalanceOperation of userBalanceOperations) {
    await balance.undo(userBalanceOperation, options);
  }

  async function getAllRatingEventsFromUser(userId, options = {}) {
    const results = await database.query(
      {
        text: `
          SELECT
            *
          FROM
            events
          WHERE
            originator_user_id = $1
            AND created_at > NOW() - INTERVAL '2 weeks'
            AND type = 'update:content:tabcoins'
          ORDER BY
            created_at ASC
        ;`,
        values: [userId],
      },
      options,
    );

    return results.rows;
  }
}

const ban = {
  nuke,
};

export default ban;
