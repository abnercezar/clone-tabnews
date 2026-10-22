import crypto from "node:crypto";
import { createRouter } from "next-connect";
import controller from "infra/controller.js";
import storage from "infra/storage.js";
import { UnprocessableEntityError, ValidationError } from "infra/errors.js";

// A foto chega já comprimida pelo navegador (~1600px, WebP/JPEG ~80%).
// O limite cobre fotos grandes que o aparelho não conseguiu reduzir.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ONE_HOUR = 60 * 60 * 1000;

// O corpo é lido cru: a foto vai direto ao armazenamento, sem JSON.
export const config = {
  api: {
    bodyParser: false,
  },
};

function detectImageType(buffer) {
  if (
    buffer.length > 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }

  if (
    buffer.length > 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }

  return null;
}

async function readBody(request) {
  const chunks = [];
  let total = 0;

  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_UPLOAD_BYTES) {
      throw new ValidationError({
        message: "A foto é grande demais.",
        action: "Envie uma foto de até 4 MB.",
      });
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

async function postHandler(request, response) {
  if (!storage.isConfigured()) {
    throw new UnprocessableEntityError({
      message: "O envio de fotos ainda não está disponível.",
      action:
        "Por enquanto, cole o endereço de uma imagem que já está na internet.",
    });
  }

  const body = await readBody(request);
  const imageType = detectImageType(body);

  if (!imageType) {
    throw new ValidationError({
      message: "O arquivo enviado não é uma foto válida.",
      action: "Envie uma foto em JPEG ou WebP.",
    });
  }

  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const key = `fotos/${now.getUTCFullYear()}/${month}/${crypto.randomUUID()}.${imageType.extension}`;

  const url = await storage.putObject({
    key,
    body,
    contentType: imageType.contentType,
  });

  return response.status(201).json({ url });
}

export default createRouter()
  .use(controller.injectAnonymousOrUser)
  .post(
    controller.rateLimit({
      name: "upload-photo",
      limit: 40,
      windowMs: ONE_HOUR,
    }),
    controller.canRequest("create:content"),
    postHandler,
  )
  .handler(controller.errorHandlers);
