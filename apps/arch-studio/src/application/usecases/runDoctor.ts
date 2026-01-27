import { useGraphStore } from "../store/graphStore.ts";
import { buildDomainGraph } from "./graphSnapshot.ts";
import { runDoctor } from "../../infrastructure/adapters/archEngineAdapter.ts";

export function runDoctorUseCase() {
  const store = useGraphStore.getState();
  const graph = buildDomainGraph(store.nodes, store.edges);
  const report = runDoctor(graph);
  store.setDoctorReport(report);
  return report;
}
