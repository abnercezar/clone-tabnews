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
  uuid,
};

export default validator;
