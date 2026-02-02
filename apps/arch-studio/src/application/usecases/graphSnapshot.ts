export function buildDomainGraph(nodes, edges) {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      kind: node.data?.kind || node.kind,
      layer: node.data?.layer || node.layer,
      module: node.data?.moduleId || node.moduleId || null,
      submodule: node.data?.submoduleId || node.submoduleId || null,
      metadata: buildNodeMetadata(node),
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      from: edge.source,
      to: edge.target,
      kind: edge.data?.kind || edge.kind || "depends_on",
    })),
  };
}

function buildNodeMetadata(node) {
  const data = node.data || {};
  const {
    kind,
    layer,
    label,
    metadata,
    moduleId,
    submoduleId,
    serviceId,
    ...rest
  } = data;
  return {
    ...(metadata || {}),
    ...rest,
    ...(moduleId ? { moduleId } : {}),
    ...(submoduleId ? { submoduleId } : {}),
    ...(serviceId ? { serviceId } : {}),
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
