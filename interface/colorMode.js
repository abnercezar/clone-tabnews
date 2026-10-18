const STORAGE_KEY = "agrotab-color-mode";

export function readColorMode() {
  if (typeof window === "undefined") {
    return "auto";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);

  if (stored === "day" || stored === "night" || stored === "auto") {
    return stored;
  }

  return "auto";
}

export function writeColorMode(colorMode) {
  window.localStorage.setItem(STORAGE_KEY, colorMode);
}
