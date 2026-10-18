import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import database from "infra/database.js";
import sponsorship from "models/sponsorship.js";
import event from "models/event.js";
import authorization from "models/authorization.js";

const TEN_MINUTES = 10 * 60 * 1000;

async function getHandler(request, response) {
  const userTryingToGet = request.context.user;
  const published = await sponsorship.findLatestPublished();

  const secureOutputValues = authorization.filterOutput(
    userTryingToGet,
    "read:sponsorship",
    published,
  );

  return response.status(200).json(secureOutputValues);
}

async function postHandler(request, response) {
  const userTryingToCreate = request.context.user;

  const created = await database.withTransaction(async (transaction) => {
    const newSponsorship = await sponsorship.create(
      {
        ownerId: userTryingToCreate.id,
        title: request.body?.title,
        url: request.body?.url,
      },
      { transaction },
    );

    await event.create(
      {
        type: "create:sponsorship",
        originatorUserId: userTryingToCreate.id,
        originatorIp: controller.getClientIp(request),
        metadata: {
          sponsorship_id: newSponsorship.id,
        },
      },
      { transaction },
    );

    return newSponsorship;
  });

  created.owner_username = userTryingToCreate.username;

  const secureOutputValues = authorization.filterOutput(
    userTryingToCreate,
    "read:sponsorship",
    created,
  );

  return response.status(201).json(secureOutputValues);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .get(controller.canRequest("read:sponsorship"), getHandler)
  .post(
    controller.rateLimit({
      name: "create-sponsorship",
      limit: 10,
      windowMs: TEN_MINUTES,
    }),
    controller.canRequest("create:sponsorship"),
    postHandler,
  )
  .handler(controller.errorHandlers);
