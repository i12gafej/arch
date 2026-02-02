import { saveGraph } from "../../infrastructure/adapters/persistenceAdapter.ts";
import { buildGraphSnapshot } from "./graphSnapshot.ts";
import { assertGraphGateway } from "../ports/graphGateway.ts";
import { storeGraphGateway } from "../../infrastructure/adapters/storeGraphGateway.ts";

export function saveStudioSnapshot(dependencies = {}) {
  const graphGateway = assertGraphGateway(dependencies.graphGateway || storeGraphGateway);
  const state = graphGateway.getState();
  const snapshot = buildGraphSnapshot(state.nodes, state.edges, state.viewMode);
  return saveGraph(snapshot);
}
