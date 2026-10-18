import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import database from "infra/database.js";
import sponsorship from "models/sponsorship.js";
import event from "models/event.js";
import authorization from "models/authorization.js";
import { ForbiddenError } from "infra/errors.js";

async function deleteHandler(request, response) {
  const userTryingToDelete = request.context.user;
  const sponsorshipFound = await sponsorship.findOneById(request.query.id);

  if (userTryingToDelete.id !== sponsorshipFound.owner_id) {
    throw new ForbiddenError({
      message: "Você só pode excluir o seu próprio patrocínio.",
      action: "Escolha um patrocínio seu.",
    });
  }

  const removed = await database.withTransaction(async (transaction) => {
    const deletedSponsorship = await sponsorship.remove(sponsorshipFound.id, {
      transaction,
    });

    await event.create(
      {
        type: "delete:sponsorship",
        originatorUserId: userTryingToDelete.id,
        originatorIp: controller.getClientIp(request),
        metadata: {
          sponsorship_id: sponsorshipFound.id,
        },
      },
      { transaction },
    );

    return deletedSponsorship;
  });

  removed.owner_username = sponsorshipFound.owner_username;

  const secureOutputValues = authorization.filterOutput(
    userTryingToDelete,
    "read:sponsorship",
    removed,
  );

  return response.status(200).json(secureOutputValues);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .delete(controller.canRequest("create:sponsorship"), deleteHandler)
  .handler(controller.errorHandlers);
