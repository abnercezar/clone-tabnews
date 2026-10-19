import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import authorization from "models/authorization.js";
import firewall from "models/firewall";
import validator from "models/validator.js";

function getValidationHandler(request, response, next) {
  validator.uuid(request.query.id);
  return next();
}

async function getHandler(request, response) {
  const userTryingToGet = request.context.user;

  const data = await firewall.findByEventId(request.query.id);

  const secureOutputValues = authorization.filterOutput(
    userTryingToGet,
    "read:firewall",
    data,
  );

  return response.status(200).json(secureOutputValues);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .get(getValidationHandler, controller.canRequest("read:firewall"), getHandler)
  .handler(controller.errorHandlers);
