function startCase(value) {
  return String(value || "")
    .split("_")
    .filter(Boolean)
    .map((token) => token[0].toUpperCase() + token.slice(1))
    .join(" ");
}

export function buildNodeLabel(kind, name) {
  const base = startCase(kind);
  if (!name) {
    return base;
  }
  return `${base}: ${name}`;
}
