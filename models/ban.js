import database from "infra/database.js";
import session from "models/session.js";
import user from "models/user.js";

// Ban permanente (estilo TabNews `nuke`), adaptado ao AgroTab:
// remove features, expira sessões, despublica conteúdos e marca `nuked`.
async function nuke(userId, options = {}) {
  await user.setFeatures(userId, [], options);
  await session.expireAllFromUserId(userId, options);

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

  return await user.addFeatures(userId, ["nuked"], options);
}

const ban = {
  nuke,
};

export default ban;
