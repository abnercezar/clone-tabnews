// Fotos do celular: reduz no próprio aparelho antes de enviar, para gastar
// pouco do plano de dados no campo. Vídeo não entra.
export const MAX_PHOTOS_PER_POST = 6;
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const PHOTO_ACCEPT =
  "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
const MAX_SIDE = 1600;
const QUALITY = 0.8;
const VIDEO_EXTENSIONS = new Set([
  "mp4",
  "mov",
  "webm",
  "mkv",
  "avi",
  "m4v",
  "3gp",
  "mpeg",
  "mpg",
  "wmv",
]);
const PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
]);
const PHOTO_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

function fileExtension(name) {
  const match = String(name || "")
    .toLowerCase()
    .match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

// Recusa vídeo e arquivo grande antes de abrir a imagem na memória.
export function assertPhotoFile(file) {
  const type = String(file?.type || "").toLowerCase();
  const extension = fileExtension(file?.name);
  if (type.startsWith("video/") || VIDEO_EXTENSIONS.has(extension)) {
    throw new TypeError("Vídeo não é aceito. Envie uma foto.");
  }
  if (!file || file.size > MAX_PHOTO_BYTES) {
    throw new TypeError("A foto é grande demais. Envie uma foto de até 8 MB.");
  }
  const typeOk = !type || PHOTO_TYPES.has(type);
  const extensionOk = !extension || PHOTO_EXTENSIONS.has(extension);
  if (!typeOk || !extensionOk) {
    throw new TypeError("Envie uma foto em JPEG, PNG ou WebP.");
  }
}

// Conta fotos enviadas pelo AgroTab já presentes no texto (Markdown).
export function countUploadedPhotos(body) {
  const matches = String(body || "").match(
    /!\[[^\]]*\]\([^)]*\/fotos\/[^)]*\)/g,
  );
  return matches ? matches.length : 0;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new TypeError("Não foi possível abrir a foto."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas, type) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

export async function compressPhoto(file) {
  assertPhotoFile(file);
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);

  // Safari antigo não gera WebP e devolve PNG: nesse caso fica o JPEG.
  const webp = await canvasToBlob(canvas, "image/webp");
  if (webp && webp.type === "image/webp") {
    return webp;
  }
  return canvasToBlob(canvas, "image/jpeg");
}

// XMLHttpRequest em vez de fetch: só ele informa o progresso do envio.
export function uploadPhoto(blob, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/v1/uploads");
    request.setRequestHeader("Content-Type", blob.type);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      let body = null;
      try {
        body = JSON.parse(request.responseText);
      } catch {
        body = null;
      }
      if (request.status === 201 && body?.url) {
        resolve(body.url);
        return;
      }
      reject(new TypeError(body?.message || "Não foi possível enviar a foto."));
    };
    request.onerror = () =>
      reject(new TypeError("Sem conexão para enviar a foto."));
    request.send(blob);
  });
}
