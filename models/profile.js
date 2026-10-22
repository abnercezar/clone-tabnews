import { ValidationError } from "infra/errors.js";

// Credencial exibida ao lado do nome em publicações e comentários.
export const OCCUPATIONS = [
  { value: "produtor", label: "Produtor" },
  { value: "agronomo", label: "Agrônomo" },
  { value: "tecnico-agricola", label: "Técnico agrícola" },
  { value: "veterinario", label: "Veterinário" },
  { value: "zootecnista", label: "Zootecnista" },
  { value: "consultor", label: "Consultor" },
  { value: "pesquisador", label: "Pesquisador" },
  { value: "estudante", label: "Estudante" },
  { value: "outro", label: "Outro" },
];

export const STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

export const MAX_CROPS = 5;

export function occupationLabel(value) {
  return OCCUPATIONS.find((item) => item.value === value)?.label || null;
}

// Texto curto ao lado do nome: "Agrônomo · GO".
export function credentialText({ occupation, state } = {}) {
  return [occupationLabel(occupation), state].filter(Boolean).join(" · ");
}

function emptyToNull(value) {
  return value === "" || value === undefined ? null : value;
}

function validateOccupation(value) {
  const occupation = emptyToNull(value);
  if (
    occupation !== null &&
    !OCCUPATIONS.some((item) => item.value === occupation)
  ) {
    throw new ValidationError({
      message: "A ocupação informada não é válida.",
      action: `Use um destes valores: ${OCCUPATIONS.map((item) => item.value).join(", ")}.`,
    });
  }
  return occupation;
}

function validateState(value) {
  const state = emptyToNull(value);
  if (state === null) {
    return null;
  }
  const normalized = String(state).toUpperCase();
  if (!STATES.includes(normalized)) {
    throw new ValidationError({
      message: "O estado informado não é válido.",
      action: "Use a sigla da UF, por exemplo GO ou PR.",
    });
  }
  return normalized;
}

function validateCrops(value, knownCropSlugs) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new ValidationError({
      message: '"crops" deve ser uma lista de culturas.',
      action: 'Envie as culturas como ["soja", "milho"].',
    });
  }

  const crops = [...new Set(value.map((item) => item.trim().toLowerCase()))];

  if (crops.length > MAX_CROPS) {
    throw new ValidationError({
      message: `Escolha no máximo ${MAX_CROPS} culturas ou criações.`,
      action: "Fique com as principais.",
    });
  }

  const unknown = crops.filter((crop) => !knownCropSlugs.includes(crop));
  if (unknown.length > 0) {
    throw new ValidationError({
      message: `Cultura desconhecida: ${unknown.join(", ")}.`,
      action: "Escolha entre as culturas e criações disponíveis.",
    });
  }

  return crops;
}

function validateBoolean(value, field) {
  if (typeof value !== "boolean") {
    throw new ValidationError({
      message: `"${field}" deve ser verdadeiro ou falso.`,
      action: `Envie true ou false em "${field}".`,
    });
  }
  return value;
}

const profile = {
  OCCUPATIONS,
  STATES,
  MAX_CROPS,
  occupationLabel,
  credentialText,
  validateOccupation,
  validateState,
  validateCrops,
  validateBoolean,
};

export default profile;
