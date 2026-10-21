// Volta para onde a pessoa estava depois do login. Só aceita caminho interno
// ("/algo"): URL absoluta, "//host" ou "/\host" viraria open redirect.
export function safeRedirectPath(value) {
  if (typeof value !== "string") {
    return "/";
  }

  const path = value.trim();
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.startsWith("/\\") ||
    hasControlCharacter(path)
  ) {
    return "/";
  }

  // Voltar para o próprio login prenderia a pessoa num ciclo.
  if (/^\/login(?:[/?#]|$)/.test(path)) {
    return "/";
  }

  return path;
}

export function loginHref(returnTo) {
  const path = safeRedirectPath(returnTo);
  return path === "/"
    ? "/login"
    : `/login?redirect=${encodeURIComponent(path)}`;
}

// Quebra de linha ou tab no meio do caminho: sinal de URL forjada.
function hasControlCharacter(text) {
  for (let index = 0; index < text.length; index++) {
    if (text.charCodeAt(index) < 32) {
      return true;
    }
  }
  return false;
}
