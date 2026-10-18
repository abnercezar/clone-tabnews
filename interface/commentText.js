export function splitComment(body) {
  const [firstLine, ...rest] = String(body || "").split("\n");

  return {
    title: firstLine.trim(),
    body: rest.join("\n").trim(),
  };
}
