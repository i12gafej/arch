import { NodeKinds } from "../../domain/graph/nodeTypes.ts";
import { useGraphStore } from "../store/graphStore.ts";

function buildLabel(kind, name) {
  const label = NodeKinds[kind]?.label || kind;
  if (name) {
    return `${label}: ${name}`;
  }
  return label;
}

export function updateNode(id, patch) {
  const store = useGraphStore.getState();
  const node = store.nodes.find((item) => item.id === id);
  if (!node) {
    return { ok: false, error: "Node not found." };
  }
  const nextName = patch?.name ?? node.data?.name;
  const nextData = {
    ...node.data,
    ...patch,
    name: nextName,
    label: buildLabel(node.data?.kind || node.kind, nextName),
  };
  store.updateNode(id, { data: nextData });
  return { ok: true };
}
