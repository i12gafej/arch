import { validateGraph } from "../../domain/graph/validators.ts";
import { getLayerForKind } from "../../domain/graph/nodeTypes.ts";

function normalizeCoreError(error, index) {
  return {
    code: error?.code || `core_error_${index + 1}`,
    message: error?.message || "Invalid graph according to arch-core rules.",
    detail: error?.detail || null,
  };
}

function toCoreGraph(graph) {
  return {
    nodes: (graph.nodes || []).map((node) => ({
      id: node.id,
      kind: node.kind,
      layer: node.layer || getLayerForKind(node.kind),
      module: node.module || node.metadata?.moduleId || null,
      submodule: node.submodule || node.metadata?.submoduleId || null,
      metadata: { ...(node.metadata || {}) },
    })),
    edges: (graph.edges || []).map((edge) => ({
      id: edge.id,
      kind: edge.kind,
      source: edge.source || edge.from,
      target: edge.target || edge.to,
      from: edge.from || edge.source,
      to: edge.to || edge.target,
    })),
  };
}

function getOptionalCoreBridge() {
  // Optional bridge hook for desktop integration.
  if (typeof globalThis === "undefined") {
    return null;
  }
  return globalThis.__ARCH_CORE__ || null;
}

function validateWithCore(coreGraph) {
  const core = getOptionalCoreBridge();
  const validate = core?.validateGraph;
  if (typeof validate !== "function") {
    return [];
  }
  return validate(coreGraph) || [];
}

function buildPlanFromCore(coreGraph) {
  const core = getOptionalCoreBridge();
  const planner = core?.planFromGraph;
  if (typeof planner !== "function") {
    return null;
  }
  return planner(coreGraph) || null;
}

export function generatePlan(graph) {
  const localErrors = validateGraph(graph);
  if (localErrors.length) {
    return { ok: false, errors: localErrors };
  }

  const coreGraph = toCoreGraph(graph);
  const coreErrors = validateWithCore(coreGraph);
  if (coreErrors.length) {
    return {
      ok: false,
      errors: coreErrors.map(normalizeCoreError),
    };
  }

  const planResult = buildPlanFromCore(coreGraph);
  if (planResult?.errors?.length) {
    return {
      ok: false,
      errors: planResult.errors.map(normalizeCoreError),
    };
  }

  const rawActions =
    planResult?.plan ||
    graph.nodes.map((node) => ({
      type: "create_node",
      payload: { id: node.id, kind: node.kind },
    }));

  const actions = rawActions.map((action) => ({
    type: action.type || "create_node",
    payload: action.node || action.payload || {},
  }));

  return {
    ok: true,
    plan: {
      actions,
      summary: `${actions.length} actions`,
    },
  };
}

export function runDoctor(graph) {
  const localErrors = validateGraph(graph);
  const coreGraph = toCoreGraph(graph);
  const coreErrors = validateWithCore(coreGraph);
  const errors = [...localErrors, ...coreErrors.map(normalizeCoreError)];

  return {
    status: errors.length ? "invalid" : "valid",
    errors,
    warnings: [],
  };
}
