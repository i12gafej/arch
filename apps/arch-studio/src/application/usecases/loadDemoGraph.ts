import { NodeKinds } from "../../domain/graph/nodeTypes.ts";
import { initGraphTemplate } from "../../domain/graph/templates/initGraphTemplate.ts";
import { useGraphStore } from "../store/graphStore.ts";

function buildLabel(kind, name) {
  const label = NodeKinds[kind]?.label || kind;
  return name ? `${label}: ${name}` : label;
}

function toFlowNode(node) {
  const name = node.name || node.metadata?.name || "";
  const moduleId = node.moduleId || node.metadata?.moduleId || "";
  const submoduleId = node.submoduleId || node.metadata?.submoduleId || "";
  return {
    id: node.id,
    position: { x: 0, y: 0 },
    data: {
      ...node.metadata,
      kind: node.kind,
      name,
      label: buildLabel(node.kind, name),
      moduleId: moduleId || undefined,
      submoduleId: submoduleId || undefined,
    },
  };
}

function toFlowEdge(edge) {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    data: { kind: edge.kind },
  };
}

export function loadDemoGraph(templateId = "generic") {
  const graph = initGraphTemplate(templateId);
  const nodes = graph.nodes.map(toFlowNode);
  const edges = graph.edges.map(toFlowEdge);
  useGraphStore.getState().hydrateGraph({
    nodes,
    edges,
    viewMode: "onion",
  });
  return { nodes, edges };
}
