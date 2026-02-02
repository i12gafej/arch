import { buildDomainGraph } from "./graphSnapshot.ts";
import { generatePlan } from "../../infrastructure/adapters/archEngineAdapter.ts";
import { assertGraphGateway } from "../ports/graphGateway.ts";
import { storeGraphGateway } from "../../infrastructure/adapters/storeGraphGateway.ts";

export function generatePlanUseCase(dependencies = {}) {
  const graphGateway = assertGraphGateway(dependencies.graphGateway || storeGraphGateway);
  const state = graphGateway.getState();
  const graph = buildDomainGraph(state.nodes, state.edges);
  const result = generatePlan(graph);
  graphGateway.setPlan(result.plan || result);
  return result;
}
