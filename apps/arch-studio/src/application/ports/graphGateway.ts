export function createGraphSnapshot(state) {
  return {
    nodes: state.nodes || [],
    edges: state.edges || [],
    selectedNodeId: state.selectedNodeId || null,
    selectedEdgeId: state.selectedEdgeId || null,
    viewMode: state.viewMode || "onion",
    lastPlan: state.lastPlan || null,
    doctorReport: state.doctorReport || null,
    lastError: state.lastError || null,
  };
}

export function assertGraphGateway(gateway) {
  const required = [
    "getState",
    "addNode",
    "updateNode",
    "removeNode",
    "addEdge",
    "removeEdge",
    "setNodes",
    "setEdges",
    "hydrateGraph",
    "setPlan",
    "setDoctorReport",
    "setError",
    "clearError",
  ];
  const missing = required.filter((method) => typeof gateway?.[method] !== "function");
  if (missing.length) {
    throw new Error(`GraphGateway missing methods: ${missing.join(", ")}`);
  }
  return gateway;
}
