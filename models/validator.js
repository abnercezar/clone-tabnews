import { ValidationError } from "infra/errors.js";

// Validação manual de entrada (sem dependências externas).
// Regras alinhadas aos limites das colunas do banco (ver migrations) e ao
// limite de 72 bytes do bcrypt para senha.

const USERNAME_REGEX = /^[a-zA-Z0-9]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const EMAIL_MAX = 254;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 72;
const TITLE_MAX = 256;
const BODY_MAX = 20000;

// Nomes que colidem com páginas estáticas em `pages/` (perfil público `/{username}`).
const RESERVED_USERNAMES = new Set([
  "api",
  "cadastro",
  "contato",
  "conteudos",
  "faq",
  "login",
  "moderacao",
  "newsletter",
  "patrocinar",
  "perfil",
  "publicar",
  "recentes",
  "rss",
  "sobre",
  "status",
]);

function username(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new ValidationError({
      message: "O username é obrigatório.",
      action: "Informe um username válido.",
    });
  }

  if (value.length < USERNAME_MIN || value.length > USERNAME_MAX) {
    throw new ValidationError({
      message: `O username deve ter entre ${USERNAME_MIN} e ${USERNAME_MAX} caracteres.`,
      action: "Ajuste o username e tente novamente.",
    });
  }

  if (!USERNAME_REGEX.test(value)) {
    throw new ValidationError({
      message: "O username deve conter apenas letras e números.",
      action: "Remova espaços e caracteres especiais do username.",
    });
  }

  if (RESERVED_USERNAMES.has(value.toLowerCase())) {
    throw new ValidationError({
      message: "Este nome de usuário não está disponível para uso.",
      action: "Escolha outro username.",
    });
  }
}

function email(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new ValidationError({
      message: "O email é obrigatório.",
      action: "Informe um email válido.",
    });
  }

  if (value.length > EMAIL_MAX) {
    throw new ValidationError({
      message: `O email deve ter no máximo ${EMAIL_MAX} caracteres.`,
      action: "Utilize um email mais curto.",
    });
  }

  if (!EMAIL_REGEX.test(value)) {
    throw new ValidationError({
      message: "O email informado não é válido.",
      action: "Informe um email no formato nome@dominio.com.",
    });
  }
}

function password(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new ValidationError({
      message: "A senha é obrigatória.",
      action: "Informe uma senha válida.",
    });
  }

  if (value.length < PASSWORD_MIN || value.length > PASSWORD_MAX) {
    throw new ValidationError({
      message: `A senha deve ter entre ${PASSWORD_MIN} e ${PASSWORD_MAX} caracteres.`,
      action: "Ajuste a senha e tente novamente.",
    });
  }
}

function title(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError({
      message: "O título é obrigatório.",
      action: "Informe um título para a publicação.",
    });
  }

  if (value.length > TITLE_MAX) {
    throw new ValidationError({
      message: `O título deve ter no máximo ${TITLE_MAX} caracteres.`,
      action: "Utilize um título mais curto.",
    });
  }
}

function body(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError({
      message: "O conteúdo é obrigatório.",
      action: "Escreva o conteúdo da publicação.",
    });
  }

  if (value.length > BODY_MAX) {
    throw new ValidationError({
      message: `O conteúdo deve ter no máximo ${BODY_MAX} caracteres.`,
      action: "Reduza o tamanho do conteúdo.",
    });
  }
}

function externalUrl(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError({
      message: "O link é obrigatório.",
      action: "Informe o endereço da página patrocinada.",
    });
  }

  if (value.length > 2048) {
    throw new ValidationError({
      message: "O link deve ter no máximo 2048 caracteres.",
      action: "Utilize um endereço mais curto.",
    });
  }

  let parsed;

  try {
    parsed = new URL(value.trim());
  } catch {
    throw new ValidationError({
      message: "O link informado não é válido.",
      action: "Informe um endereço que comece com http:// ou https://.",
    });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ValidationError({
      message: "O link informado não é válido.",
      action: "Informe um endereço que comece com http:// ou https://.",
    });
  }
}

function uuid(value) {
  if (typeof value !== "string" || !UUID_REGEX.test(value)) {
    throw new ValidationError({
      message: "O identificador informado não é um UUID válido.",
      action: "Verifique o link ou o identificador e tente novamente.",
    });
  }
}

const validator = {
  username,
  email,
  password,
  title,
  body,
  externalUrl,
  uuid,
};

export default validator;
