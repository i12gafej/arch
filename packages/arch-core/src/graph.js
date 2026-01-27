const NODE_KINDS = [
  "service",
  "module",
  "submodule",
  "api_surface",
  "use_case",
  "domain_interface",
  "domain_service",
  "application_service",
  "port",
  "adapter",
  "capability",
  "persistence_model",
];

const EDGE_KINDS = [
  "contains",
  "depends_on",
  "implements",
  "implemented_by",
  "exposes",
  "enabled_by",
  "connects_to",
];

const LAYERS = [
  "domain",
  "application",
  "delivery",
  "infrastructure",
  "bootstrap",
  "distributed",
];

function createGraph() {
  return {
    nodes: [],
    edges: [],
  };
}

function addNode(graph, node) {
  return {
    ...graph,
    nodes: [...graph.nodes, node],
  };
}

function addEdge(graph, edge) {
  return {
    ...graph,
    edges: [...graph.edges, edge],
  };
}

module.exports = {
  NODE_KINDS,
  EDGE_KINDS,
  LAYERS,
  createGraph,
  addNode,
  addEdge,
};
