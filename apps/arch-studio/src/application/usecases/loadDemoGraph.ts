import { initGraphTemplate } from "../../domain/graph/templates/initGraphTemplate.ts";
import { buildNodeLabel } from "./nodeLabel.ts";
import { assertGraphGateway } from "../ports/graphGateway.ts";
import { storeGraphGateway } from "../../infrastructure/adapters/storeGraphGateway.ts";

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
      layer: node.layer,
      name,
      label: buildNodeLabel(node.kind, name),
      moduleId: moduleId || undefined,
      submoduleId: submoduleId || undefined,
      serviceId: node.metadata?.serviceId || undefined,
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

export function loadDemoGraph(templateId = "generic", dependencies = {}) {
  const graphGateway = assertGraphGateway(dependencies.graphGateway || storeGraphGateway);
  const graph = initGraphTemplate(templateId);
  const nodes = graph.nodes.map(toFlowNode);
  const edges = graph.edges.map(toFlowEdge);
  graphGateway.hydrateGraph({
    nodes,
    edges,
    viewMode: "onion",
  });
  return { nodes, edges };
}
