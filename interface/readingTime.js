const WORDS_PER_MINUTE = 200;

export function formatReadingTime(text) {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));

  return minutes === 1 ? "1 min de leitura" : `${minutes} min de leitura`;
}
