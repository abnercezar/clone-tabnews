import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import recovery from "models/recovery.js";
import validator from "models/validator.js";
import event from "models/event.js";

const TEN_MINUTES = 10 * 60 * 1000;

async function postHandler(request, response) {
  const emailAddress = request.body?.email;
  validator.email(emailAddress);

  const recoveryToken = await recovery.requestPasswordRecovery({
    email: emailAddress,
  });

  const secureOutputValues = authorization.filterOutput(
    request.context.user,
    "read:recovery_token",
    recoveryToken,
  );

  return response.status(201).json(secureOutputValues);
}

async function patchHandler(request, response) {
  const tokenId = request.body?.token_id;
  const password = request.body?.password;

  validator.uuid(tokenId);
  validator.password(password);

  const usedToken = await recovery.resetUserPassword(tokenId, password);

  await event.create({
    type: "update:user",
    originatorUserId: usedToken.user_id,
    originatorIp: controller.getClientIp(request),
    metadata: {
      updatedFields: ["password"],
    },
  });

  const secureOutputValues = authorization.filterOutput(
    request.context.user,
    "read:recovery_token",
    usedToken,
  );

  return response.status(200).json(secureOutputValues);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .post(
    controller.rateLimit({
      name: "create-recovery",
      limit: 20,
      windowMs: TEN_MINUTES,
    }),
    controller.canRequest("read:recovery_token"),
    postHandler,
  )
  .patch(
    controller.rateLimit({
      name: "use-recovery",
      limit: 20,
      windowMs: TEN_MINUTES,
    }),
    controller.canRequest("read:recovery_token"),
    patchHandler,
  )
  .handler(controller.errorHandlers);
