import { canConnect, suggestEdgeKind } from "../../domain/graph/rules.ts";
import { createGraphEdge } from "../../domain/graph/factories.ts";
import { useGraphStore } from "../store/graphStore.ts";

export function connectNodes(sourceId, targetId, edgeKind) {
  const store = useGraphStore.getState();
  const source = store.nodes.find((node) => node.id === sourceId);
  const target = store.nodes.find((node) => node.id === targetId);
  if (!source || !target) {
    return { ok: false, error: "Missing source or target node." };
  }

  const resolvedEdgeKind = edgeKind || suggestEdgeKind(source.data?.kind, target.data?.kind);
  if (!resolvedEdgeKind) {
    return { ok: false, error: "No valid edge kind for this connection." };
  }

  const result = canConnect(source.data?.kind, target.data?.kind, resolvedEdgeKind);
  if (!result.allowed) {
    return { ok: false, error: result.reason || "Connection not allowed." };
  }

  const alreadyExists = store.edges.some(
    (edge) => edge.source === sourceId && edge.target === targetId && edge.data?.kind === resolvedEdgeKind
  );
  if (alreadyExists) {
    return { ok: false, error: "Connection already exists." };
  }

  const edge = createGraphEdge({ source: sourceId, target: targetId, kind: resolvedEdgeKind });
  store.addEdge({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    data: { kind: edge.kind },
  });
  return { ok: true };
}
