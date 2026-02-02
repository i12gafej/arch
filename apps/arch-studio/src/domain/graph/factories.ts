import { getLayerForKind } from "./nodeTypes.ts";

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
}

export function createNodeId(kind, name, overrideId) {
  if (overrideId) {
    return overrideId;
  }
  const base = name ? slugify(name) : "node";
  return `${kind}:${base}`;
}

export function ensureUniqueNodeId(baseId, existingIds = []) {
  if (!existingIds.includes(baseId)) {
    return baseId;
  }
  let index = 2;
  let candidate = `${baseId}-${index}`;
  while (existingIds.includes(candidate)) {
    index += 1;
    candidate = `${baseId}-${index}`;
  }
  return candidate;
}

export function createGraphNode({ kind, name, metadata = {}, moduleId, submoduleId, id }) {
  return {
    id: createNodeId(kind, name, id),
    kind,
    name: name || "",
    layer: getLayerForKind(kind),
    moduleId: moduleId || null,
    submoduleId: submoduleId || null,
    metadata: { ...metadata },
  };
}

export function createGraphEdge({ source, target, kind }) {
  return {
    id: `edge:${source}:${target}:${kind}`,
    source,
    target,
    kind,
  };
}
