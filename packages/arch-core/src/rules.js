const { NODE_KINDS, EDGE_KINDS, LAYERS } = require("./graph");

function error(code, message, detail) {
  return { code, message, detail };
}

function validateNode(node) {
  const errors = [];
  if (!node.id) {
    errors.push(error("node.missing_id", "Node id is required", node));
  }
  if (!NODE_KINDS.includes(node.kind)) {
    errors.push(error("node.invalid_kind", `Invalid node kind: ${node.kind}`, node));
  }
  if (node.layer && !LAYERS.includes(node.layer)) {
    errors.push(error("node.invalid_layer", `Invalid layer: ${node.layer}`, node));
  }
  return errors;
}

function validateEdge(edge) {
  const errors = [];
  if (!edge.id) {
    errors.push(error("edge.missing_id", "Edge id is required", edge));
  }
  if (!EDGE_KINDS.includes(edge.kind)) {
    errors.push(error("edge.invalid_kind", `Invalid edge kind: ${edge.kind}`, edge));
  }
  if (!edge.from || !edge.to) {
    errors.push(error("edge.missing_nodes", "Edge requires from/to", edge));
  }
  return errors;
}

function findNode(graph, nodeId) {
  return graph.nodes.find((node) => node.id === nodeId);
}

function validateOperation(graph, operation) {
  if (!operation || !operation.type) {
    return [error("operation.invalid", "Operation must include type")];
  }
  if (operation.type === "add_node") {
    return validateNode(operation.node || {});
  }
  if (operation.type === "add_edge") {
    return validateEdge(operation.edge || {});
  }
  if (operation.type === "delete_node" || operation.type === "delete_edge") {
    return [];
  }
  return [error("operation.unsupported", `Unsupported operation ${operation.type}`)];
}

function validateGraph(graph) {
  const errors = [];
  graph.nodes.forEach((node) => errors.push(...validateNode(node)));
  graph.edges.forEach((edge) => errors.push(...validateEdge(edge)));

  graph.edges.forEach((edge) => {
    const from = findNode(graph, edge.from);
    const to = findNode(graph, edge.to);
    if (!from || !to) {
      errors.push(error("edge.missing_node", `Edge references missing node ${edge.id}`, edge));
      return;
    }

    if (edge.kind === "implemented_by") {
      if (from.kind !== "port" || to.kind !== "adapter") {
        errors.push(error("edge.invalid_impl", "implemented_by must be port -> adapter", edge));
      }
    }

    if (edge.kind === "implements") {
      if (from.kind !== "domain_interface" || to.kind !== "domain_service") {
        errors.push(error("edge.invalid_implements", "implements must be domain_interface -> domain_service", edge));
      }
    }

    if (edge.kind === "depends_on") {
      if (from.kind === "use_case" && to.kind === "adapter") {
        errors.push(error("rule.use_case_adapter", "use_case cannot depend on adapter", edge));
      }
      if (from.layer === "domain" && ["delivery", "infrastructure"].includes(to.layer)) {
        errors.push(error("rule.domain_dep", "domain cannot depend on delivery/infrastructure", edge));
      }
      if (from.layer === "application" && ["delivery", "infrastructure"].includes(to.layer)) {
        errors.push(error("rule.application_dep", "application cannot depend on delivery/infrastructure", edge));
      }
      if (from.kind === "adapter" && to.kind === "domain_interface") {
        errors.push(error("rule.adapter_domain_interface", "adapter cannot depend on domain interface", edge));
      }
    }
  });

  return errors;
}

function validateIR(ir) {
  if (!ir || !ir.modules) {
    return [error("ir.invalid", "IR must include modules")];
  }
  return [];
}

function validatePlan(plan) {
  if (!Array.isArray(plan)) {
    return [error("plan.invalid", "Plan must be an array")];
  }
  return [];
}

function doctor(workspace) {
  if (!workspace || !workspace.listTree) {
    return [error("doctor.invalid", "WorkspaceAdapter required")];
  }
  return [];
}

module.exports = {
  validateOperation,
  validateGraph,
  validateIR,
  validatePlan,
  doctor,
};
