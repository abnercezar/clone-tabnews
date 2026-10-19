import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import { ValidationError } from "infra/errors.js";
import user from "models/user.js";
import activation from "models/activation.js";
import authorization from "models/authorization";
import event from "models/event.js";
import firewall from "models/firewall";

async function getHandler(request, response) {
  const userTryingToList = request.context.user;
  const page = parsePositiveInt(request.query.page, 1);
  const perPage = parsePositiveInt(request.query.per_page, 30);

  const results = await user.findAllWithPagination({ page, perPage });

  const secureOutputValues = authorization.filterOutput(
    userTryingToList,
    "read:user:list",
    results.rows,
  );

  response.setHeader("X-Total-Count", String(results.pagination.totalRows));
  response.setHeader("X-Page", String(results.pagination.currentPage));
  response.setHeader("X-Per-Page", String(results.pagination.perPage));

  return response.status(200).json(secureOutputValues);
}

async function postHandler(request, response) {
  const userTryingToPost = request.context.user;
  const userInputValues = request.body;
  const newUser = await user.create(userInputValues);

  await event.create({
    type: "create:user",
    originatorUserId: userTryingToPost.id || newUser.id,
    originatorIp: request.context.clientIp,
    metadata: {
      id: newUser.id,
    },
  });

  await activation.createAndSendActivationEmail(newUser);

  const secureOutputValues = authorization.filterOutput(
    userTryingToPost,
    "read:user",
    newUser,
  );

  return response.status(201).json(secureOutputValues);
}

function parsePositiveInt(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ValidationError({
      message: "Os parâmetros de paginação informados são inválidos.",
      action: "Informe `page` e `per_page` como inteiros maiores que zero.",
    });
  }

  return parsed;
}

const TEN_MINUTES = 10 * 60 * 1000;

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .get(controller.canRequest("read:user:list"), getHandler)
  .post(
    controller.rateLimit({
      name: "create-user",
      limit: 20,
      windowMs: TEN_MINUTES,
    }),
    controller.canRequest("create:user"),
    firewall.canRequest("create:user"),
    postHandler,
  )
  .handler(controller.errorHandlers);
