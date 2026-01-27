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
  return `${kind}:${base}-${Date.now().toString(36)}`;
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
