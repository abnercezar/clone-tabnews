import crypto from "node:crypto";
import { ServiceError } from "infra/errors.js";

// Armazenamento de fotos em bucket compatível com S3 (Cloudflare R2).
// Assinatura AWS SigV4 feita aqui mesmo, sem SDK: só precisamos de PUT.
// Sem as variáveis abaixo, o envio de fotos fica desligado.
function getConfig() {
  const endpoint =
    process.env.STORAGE_ENDPOINT ||
    (process.env.R2_ACCOUNT_ID
      ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
      : null);

  const config = {
    endpoint,
    region: process.env.STORAGE_REGION || "auto",
    bucket: process.env.STORAGE_BUCKET,
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
    publicUrl: process.env.STORAGE_PUBLIC_URL,
  };

  return Object.values(config).every(Boolean) ? config : null;
}

function isConfigured() {
  return Boolean(getConfig());
}

function sha256Hex(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function hmac(key, data) {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function encodeKey(key) {
  return key.split("/").map(encodeURIComponent).join("/");
}

function signRequest({ config, method, path, headers, payloadHash, now }) {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const host = new URL(config.endpoint).host;

  const allHeaders = {
    ...headers,
    host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  const sortedNames = Object.keys(allHeaders)
    .map((name) => name.toLowerCase())
    .sort();
  const lowerHeaders = Object.fromEntries(
    Object.entries(allHeaders).map(([name, value]) => [
      name.toLowerCase(),
      String(value).trim(),
    ]),
  );
  const canonicalHeaders = sortedNames
    .map((name) => `${name}:${lowerHeaders[name]}\n`)
    .join("");
  const signedHeaders = sortedNames.join(";");

  const canonicalRequest = [
    method,
    path,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signingKey = hmac(
    hmac(
      hmac(hmac(`AWS4${config.secretAccessKey}`, dateStamp), config.region),
      "s3",
    ),
    "aws4_request",
  );
  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");

  return {
    ...allHeaders,
    authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

async function putObject(
  { key, body, contentType },
  { now = new Date() } = {},
) {
  const config = getConfig();

  if (!config) {
    throw new ServiceError({
      message: "O armazenamento de fotos não está configurado.",
      action: "Defina as variáveis STORAGE_* do ambiente.",
    });
  }

  const path = `/${encodeURIComponent(config.bucket)}/${encodeKey(key)}`;
  const headers = signRequest({
    config,
    method: "PUT",
    path,
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=31536000, immutable",
    },
    payloadHash: sha256Hex(body),
    now,
  });
  delete headers.host;

  let response;
  try {
    response = await fetch(`${config.endpoint}${path}`, {
      method: "PUT",
      headers,
      body,
    });
  } catch (error) {
    throw new ServiceError({
      cause: error,
      message: "Não foi possível falar com o armazenamento de fotos.",
      action: "Tente novamente em alguns minutos.",
    });
  }

  if (!response.ok) {
    throw new ServiceError({
      cause: `Storage respondeu ${response.status}`,
      message: "O armazenamento de fotos recusou o arquivo.",
      action: "Tente novamente em alguns minutos.",
    });
  }

  return `${config.publicUrl.replace(/\/+$/, "")}/${encodeKey(key)}`;
}

const storage = {
  isConfigured,
  putObject,
  signRequest,
};

export default storage;
