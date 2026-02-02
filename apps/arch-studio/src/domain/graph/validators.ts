import { canConnect } from "./rules.ts";

export function validateGraph(graph) {
  const errors = [];
  if (!graph?.nodes || !graph?.edges) {
    return [{ code: "GRAPH_INVALID", message: "Graph is missing nodes or edges." }];
  }

  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));

  for (const edge of graph.edges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) {
      errors.push({
        code: "EDGE_DANGLING",
        message: "Edge references missing nodes.",
        edgeId: edge.id,
      });
      continue;
    }
    const result = canConnect(source.kind, target.kind, edge.kind);
    if (!result.allowed) {
      errors.push({
        code: "EDGE_ILLEGAL",
        message: result.reason || "Illegal connection.",
        edgeId: edge.id,
      });
    }
  }

  return errors;
}

export function filterGraphByViewMode(nodes, edges, viewMode) {
  if (!viewMode) {
    return { nodes, edges };
  }
  const allowKind = createViewFilter(viewMode);
  const allowedIds = new Set(
    nodes
      .filter((node) => allowKind(node.data?.kind) || isContainerKind(node.data?.kind))
      .map((node) => node.id)
  );
  const nextNodes = nodes.filter((node) => allowedIds.has(node.id));
  const nextEdges = edges.filter(
    (edge) => allowedIds.has(edge.source) && allowedIds.has(edge.target)
  );
  return { nodes: nextNodes, edges: nextEdges };
}

function createViewFilter(viewMode) {
  if (viewMode === "onion") {
    return (kind) =>
      kind === "domain_interface" ||
      kind === "domain_service" ||
      kind === "entity" ||
      kind === "value_object" ||
      kind === "use_case" ||
      kind === "application_service" ||
      kind === "port" ||
      kind === "adapter" ||
      kind === "persistence_model" ||
      kind === "capability" ||
      kind === "api_surface";
  }
  if (viewMode === "hex") {
    return (kind) =>
      [
        "use_case",
        "application_service",
        "domain_interface",
        "domain_service",
        "entity",
        "value_object",
        "port",
        "adapter",
        "persistence_model",
        "api_surface",
        "capability",
      ].includes(kind);
  }
  if (viewMode === "infra") {
    return (kind) =>
      ["adapter", "capability", "persistence_model", "port", "api_surface"].includes(kind);
  }
  if (viewMode === "distributed") {
    return (kind) => ["service", "module", "submodule", "api_surface", "capability"].includes(kind);
  }
  return () => true;
}

function isContainerKind(kind) {
  return kind === "service" || kind === "module" || kind === "submodule";
}
