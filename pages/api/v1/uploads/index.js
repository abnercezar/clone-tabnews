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

function isVideoContentType(contentType) {
  return String(contentType || "")
    .toLowerCase()
    .startsWith("video/");
}

function looksLikeVideo(buffer) {
  if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
    return true;
  }
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return true;
  }
  return (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "AVI "
  );
}

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
  if (isVideoContentType(request.headers["content-type"])) {
    throw new ValidationError({
      message: "Vídeo não é aceito.",
      action: "Envie uma foto de até 8 MB, em JPEG, PNG ou WebP.",
    });
  }

  const body = await readBody(request);

  if (looksLikeVideo(body)) {
    throw new ValidationError({
      message: "Vídeo não é aceito.",
      action: "Envie uma foto de até 8 MB, em JPEG, PNG ou WebP.",
    });
  }

  const imageType = detectImageType(body);

  if (!imageType) {
    throw new ValidationError({
      message: "O arquivo enviado não é uma foto válida.",
      action: "Envie uma foto em JPEG ou WebP.",
    });
  }

  if (!storage.isConfigured()) {
    throw new UnprocessableEntityError({
      message: "O envio de fotos ainda não está disponível.",
      action:
        "Por enquanto, cole o endereço de uma imagem que já está na internet.",
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
