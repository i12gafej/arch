import { validateGraph } from "../../domain/graph/validators.ts";

export function generatePlan(graph) {
  const errors = validateGraph(graph);
  if (errors.length) {
    return { ok: false, errors };
  }
  const actions = graph.nodes.map((node) => ({
    type: "CreateNode",
    payload: { id: node.id, kind: node.kind },
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
  const errors = validateGraph(graph);
  return {
    status: errors.length ? "invalid" : "valid",
    errors,
    warnings: [],
  };
}
