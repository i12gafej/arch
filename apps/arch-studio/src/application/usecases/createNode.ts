import { getNodeFields, NodeKinds } from "../../domain/graph/nodeTypes.ts";
import { createNodeId } from "../../domain/graph/factories.ts";
import { useGraphStore } from "../store/graphStore.ts";

function buildDefaultMetadata(kind) {
  const fields = getNodeFields(kind);
  const metadata = {};
  for (const field of fields) {
    metadata[field.key] = "";
  }
  return metadata;
}

function buildLabel(kind, name) {
  const label = NodeKinds[kind]?.label || kind;
  if (name) {
    return `${label}: ${name}`;
  }
  return label;
}

export function createNode(kind, initial = {}, position) {
  const name = initial.name || "";
  const id = createNodeId(kind, name || kind);
  const metadata = { ...buildDefaultMetadata(kind), ...(initial.metadata || {}) };
  const node = {
    id,
    position: position || { x: 200, y: 200 },
    data: {
      kind,
      name,
      label: buildLabel(kind, name),
      metadata,
      ...initial,
    },
  };

  useGraphStore.getState().addNode(node);
  return node;
}
