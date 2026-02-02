import { buildNodeLabel } from "./nodeLabel.ts";
import { assertGraphGateway } from "../ports/graphGateway.ts";
import { storeGraphGateway } from "../../infrastructure/adapters/storeGraphGateway.ts";

export function updateNode(id, patch, dependencies = {}) {
  const graphGateway = assertGraphGateway(dependencies.graphGateway || storeGraphGateway);
  const state = graphGateway.getState();
  const node = state.nodes.find((item) => item.id === id);
  if (!node) {
    return { ok: false, error: "Node not found." };
  }
  const nextName = patch?.name ?? node.data?.name;
  const nextData = {
    ...node.data,
    ...patch,
    name: nextName,
    label: buildNodeLabel(node.data?.kind || node.kind, nextName),
  };
  graphGateway.updateNode(id, { data: nextData });
  return { ok: true };
}
