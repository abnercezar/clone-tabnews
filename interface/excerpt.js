const DEFAULT_MAX_LENGTH = 160;

// Texto puro a partir do markdown, para <meta description> e prévia de links.
export function createExcerpt(markdown, maxLength = DEFAULT_MAX_LENGTH) {
  const text = String(markdown || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_~`]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  const cut = text.slice(0, maxLength - 1);
  const endsOnWord = text[cut.length] === " ";
  const lastSpace = cut.lastIndexOf(" ");
  const base =
    endsOnWord || lastSpace <= maxLength / 2 ? cut : cut.slice(0, lastSpace);

  return `${base.replace(/[\s.,;:!?-]+$/, "")}…`;
}
