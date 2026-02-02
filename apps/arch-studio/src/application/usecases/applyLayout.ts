import { assertGraphGateway } from "../ports/graphGateway.ts";
import { storeGraphGateway } from "../../infrastructure/adapters/storeGraphGateway.ts";

export function applyLayout(layoutFn, dependencies = {}) {
  const graphGateway = assertGraphGateway(dependencies.graphGateway || storeGraphGateway);
  const state = graphGateway.getState();
  const nextNodes = layoutFn(state.nodes, state.edges);
  graphGateway.setNodes(nextNodes);
  return nextNodes;
}
