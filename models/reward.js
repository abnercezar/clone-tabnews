import database from "infra/database.js";
import balance from "models/balance.js";
import content from "models/content.js";
import event from "models/event.js";
import prestige from "models/prestige.js";
import user from "models/user.js";

const tabcoinsBase = 20;
const contentAgeBase = 604_800_000; // one week in milliseconds

async function reward(request) {
  if (request?.context?.user?.tabcoins === undefined) return 0;

  const {
    id: userId,
    username,
    tabcoins,
    rewarded_at: rewardedAt,
  } = request.context.user;

  if (!userId || !username || !rewardedAt) return 0;

  // Atalho do caso comum; a fonte da verdade é o WHERE do UPDATE condicional.
  if (rewardedAt >= new Date().setUTCHours(0, 0, 0, 0)) return 0;

  const prestigeFactor = await prestige.getByUserId(userId);
  const tabcoinsFactor = calcTabcoinsFactor(tabcoins);

  let amount = 0;

  if (tabcoinsFactor <= prestigeFactor) {
    const contentAgeFactor = await getContentAgeFactor(userId);
    amount = calcReward(prestigeFactor, tabcoinsFactor, contentAgeFactor);
  }

  amount = await saveReward(request, amount);

  return amount;
}

function calcTabcoinsFactor(tabcoins) {
  if (tabcoins <= 0) return 0;

  return Math.floor((tabcoins / tabcoinsBase) ** 2);
}

async function getContentAgeFactor(ownerId) {
  const lastContent = await content.findLatestPublishedByOwnerId(ownerId);

  if (!lastContent) return 0;

  const lastContentAge = new Date() - new Date(lastContent.created_at);

  return Math.ceil(lastContentAge / contentAgeBase);
}

function calcReward(prestigeFactor, tabcoinsFactor, contentAgeFactor) {
  if (!contentAgeFactor || prestigeFactor <= tabcoinsFactor) return 0;

  return Math.ceil((prestigeFactor - tabcoinsFactor) / contentAgeFactor);
}

async function saveReward(request, amount) {
  const transaction = await database.transaction();

  try {
    await transaction.query("BEGIN");

    const isFirstRewardToday = await user.updateRewardedAtIfStale(
      request.context.user.id,
      { transaction },
    );

    // Sem linha atualizada, outra requisição concorrente já recompensou hoje.
    if (!isFirstRewardToday) {
      await transaction.query("ROLLBACK");
      return 0;
    }

    if (amount > 0) {
      const currentEvent = await event.create(
        {
          type: "reward:user:tabcoins",
          originatorUserId: request.context.user.id,
          originatorIp: request.context.clientIp,
          metadata: {
            reward_type: "daily",
            amount,
          },
        },
        { transaction },
      );

      await balance.create(
        {
          balanceType: "user:tabcoin",
          recipientId: request.context.user.id,
          amount,
          originatorType: "event",
          originatorId: currentEvent.id,
        },
        { transaction },
      );
    }

    await transaction.query("COMMIT");

    return amount;
  } catch (error) {
    await transaction.query("ROLLBACK");
    throw error;
  } finally {
    await transaction.release();
  }
}

export default reward;
