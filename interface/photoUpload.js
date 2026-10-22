// Fotos do celular: reduz no próprio aparelho antes de enviar, para gastar
// pouco do plano de dados no campo.
export const MAX_PHOTOS_PER_POST = 6;
const MAX_SIDE = 1600;
const QUALITY = 0.8;

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
