export function buildDomainGraph(nodes, edges) {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      kind: node.data?.kind || node.kind,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      kind: edge.data?.kind || edge.kind || "depends_on",
    })),
  };
}

export function buildGraphSnapshot(nodes, edges, viewMode) {
  return {
    nodes: nodes.map((node) => ({ ...node })),
    edges: edges.map((edge) => ({ ...edge })),
    viewMode,
    version: 1,
  };
}
