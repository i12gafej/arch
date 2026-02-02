import { validateGraph } from "../../domain/graph/validators.ts";
import { importGraph } from "../../infrastructure/adapters/persistenceAdapter.ts";
import { buildDomainGraph } from "./graphSnapshot.ts";
import { assertGraphGateway } from "../ports/graphGateway.ts";
import { storeGraphGateway } from "../../infrastructure/adapters/storeGraphGateway.ts";

export function importStudioGraph(jsonText, dependencies = {}) {
  const graphGateway = assertGraphGateway(dependencies.graphGateway || storeGraphGateway);
  const imported = importGraph(jsonText);
  if (!imported.ok) {
    return imported;
  }
  const payload = imported.payload || {};
  const graph = buildDomainGraph(payload.nodes || [], payload.edges || []);
  const errors = validateGraph(graph);
  if (errors.length) {
    return { ok: false, error: "El grafo importado contiene conexiones ilegales.", errors };
  }
  graphGateway.hydrateGraph(payload);
  return { ok: true, payload };
}
