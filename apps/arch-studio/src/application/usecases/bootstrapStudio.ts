import { validateGraph } from "../../domain/graph/validators.ts";
import { loadGraph } from "../../infrastructure/adapters/persistenceAdapter.ts";
import { loadDemoGraph } from "./loadDemoGraph.ts";
import { buildDomainGraph } from "./graphSnapshot.ts";
import { assertGraphGateway } from "../ports/graphGateway.ts";
import { storeGraphGateway } from "../../infrastructure/adapters/storeGraphGateway.ts";

export function bootstrapStudio(dependencies = {}) {
  const graphGateway = assertGraphGateway(dependencies.graphGateway || storeGraphGateway);
  const stored = loadGraph();

  if (stored) {
    const graph = buildDomainGraph(stored.nodes || [], stored.edges || []);
    const errors = validateGraph(graph);
    if (!errors.length) {
      graphGateway.hydrateGraph(stored);
      return { ok: true, source: "storage" };
    }
    graphGateway.setError("El grafo guardado contiene conexiones ilegales.");
  }

  loadDemoGraph("generic", { graphGateway });
  return { ok: true, source: "demo" };
}
