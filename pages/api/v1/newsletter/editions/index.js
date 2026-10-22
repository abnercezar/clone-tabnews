import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import event from "models/event.js";
import newsletter from "models/newsletter.js";

async function getHandler(request, response) {
  const preview = await newsletter.previewEdition();

  const secureOutputValues = authorization.filterOutput(
    request.context.user,
    "send:newsletter",
    preview,
  );

  return response.status(200).json(secureOutputValues);
}

async function postHandler(request, response) {
  const userTryingToSend = request.context.user;
  const edition = await newsletter.sendEdition();

  await event.create({
    type: "send:newsletter",
    originatorUserId: userTryingToSend.id,
    originatorIp: controller.getClientIp(request),
    metadata: {
      recipients: edition.recipients,
      sent: edition.sent,
      failed: edition.failed,
      content_ids: edition.contents.map((item) => item.id),
    },
  });

  const secureOutputValues = authorization.filterOutput(
    userTryingToSend,
    "send:newsletter",
    edition,
  );

  return response.status(201).json(secureOutputValues);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .get(controller.canRequest("send:newsletter"), getHandler)
  .post(controller.canRequest("send:newsletter"), postHandler)
  .handler(controller.errorHandlers);
