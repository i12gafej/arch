import { buildDomainGraph } from "./graphSnapshot.ts";
import { runDoctor } from "../../infrastructure/adapters/archEngineAdapter.ts";
import { assertGraphGateway } from "../ports/graphGateway.ts";
import { storeGraphGateway } from "../../infrastructure/adapters/storeGraphGateway.ts";

export function runDoctorUseCase(dependencies = {}) {
  const graphGateway = assertGraphGateway(dependencies.graphGateway || storeGraphGateway);
  const state = graphGateway.getState();
  const graph = buildDomainGraph(state.nodes, state.edges);
  const report = runDoctor(graph);
  graphGateway.setDoctorReport(report);
  return report;
}
