import { useGraphStore } from "../store/graphStore.ts";
import { buildDomainGraph } from "./graphSnapshot.ts";
import { generatePlan } from "../../infrastructure/adapters/archEngineAdapter.ts";

export function generatePlanUseCase() {
  const store = useGraphStore.getState();
  const graph = buildDomainGraph(store.nodes, store.edges);
  const result = generatePlan(graph);
  store.setPlan(result.plan || result);
  return result;
}
