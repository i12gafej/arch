import { assertGraphGateway } from "../ports/graphGateway.ts";
import { storeGraphGateway } from "../../infrastructure/adapters/storeGraphGateway.ts";

export function clearStudioGraph(dependencies = {}) {
  const graphGateway = assertGraphGateway(dependencies.graphGateway || storeGraphGateway);
  const state = graphGateway.getState();
  graphGateway.hydrateGraph({
    nodes: [],
    edges: [],
    viewMode: state.viewMode || "onion",
  });
  return { ok: true };
}
