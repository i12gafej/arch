function normalizeName(raw) {
  if (!raw || typeof raw !== "string") {
    throw new Error("Name is required");
  }
  const trimmed = raw.trim();
  const withUnderscore = trimmed.replace(/([a-z0-9])([A-Z])/g, "$1_$2");
  const snake = withUnderscore
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  const parts = snake ? snake.split("_") : [];
  const pascal = parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
  const kebab = parts.join("-");
  return {
    raw,
    snake,
    pascal,
    kebab,
  };
}

function splitQualified(raw) {
  if (!raw || typeof raw !== "string") {
    throw new Error("Qualified name is required");
  }
  const trimmed = raw.trim();
  const parts = trimmed.split(".").filter(Boolean);
  if (parts.length > 3) {
    throw new Error(`Too many segments in qualified name: ${raw}`);
  }
  return parts;
}

function normalizeQualified(raw) {
  const parts = splitQualified(raw);
  if (parts.length === 0) {
    throw new Error("Qualified name is required");
  }
  if (parts.length === 1) {
    return {
      module: null,
      submodule: null,
      name: normalizeName(parts[0]),
    };
  }
  if (parts.length === 2) {
    return {
      module: normalizeName(parts[0]),
      submodule: null,
      name: normalizeName(parts[1]),
    };
  }
  return {
    module: normalizeName(parts[0]),
    submodule: normalizeName(parts[1]),
    name: normalizeName(parts[2]),
  };
}

function buildGetterName(submoduleSnake, itemSnake) {
  if (submoduleSnake) {
    return `${submoduleSnake}_${itemSnake}`;
  }
  return itemSnake;
}

module.exports = {
  normalizeName,
  normalizeQualified,
  buildGetterName,
};

