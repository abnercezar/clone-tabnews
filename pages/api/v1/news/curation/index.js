import { timingSafeEqual } from "node:crypto";
import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import { ForbiddenError } from "infra/errors.js";
import authorization from "models/authorization.js";
import event from "models/event.js";
import news from "models/news.js";

// A coleta lê vários feeds (até 10 s) e chama a IA (até 40 s). 60 s é o
// limite aceito em todos os planos da Vercel.
export const config = {
  maxDuration: 60,
};

function sameSecret(received, expected) {
  const a = Buffer.from(String(received || ""));
  const b = Buffer.from(String(expected || ""));
  return a.length === b.length && timingSafeEqual(a, b);
}

// O Vercel Cron chama a rota com GET e `Authorization: Bearer <CRON_SECRET>`.
function requireCronSecret(request, response, next) {
  const secret = process.env.CRON_SECRET;

  if (secret && sameSecret(request.headers.authorization, `Bearer ${secret}`)) {
    return next();
  }

  throw new ForbiddenError({
    message: "Você não tem permissão para executar esta ação.",
    action: "A coleta automática só pode ser disparada pelo agendador.",
  });
}

async function runAndRespond(request, response, originatorUserId) {
  const result = await news.runDailyCuration();

  await event.create({
    type: "run:news_curation",
    originatorUserId,
    originatorIp: controller.getClientIp(request),
    metadata: {
      mode: result.mode,
      candidates: result.candidates,
      created: result.created,
      feeds: result.feeds,
    },
  });

  return response.status(201).json({
    mode: result.mode,
    candidates: result.candidates,
    created: result.created,
    feeds: result.feeds,
    items: authorization.filterOutput(
      { features: ["review:news"] },
      "review:news",
      result.items,
    ),
  });
}

async function cronHandler(request, response) {
  return runAndRespond(request, response, null);
}

async function manualHandler(request, response) {
  return runAndRespond(request, response, request.context.user.id);
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .get(requireCronSecret, cronHandler)
  .post(controller.canRequest("review:news"), manualHandler)
  .handler(controller.errorHandlers);
