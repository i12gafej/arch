import { createNodeId, ensureUniqueNodeId } from "../../domain/graph/factories.ts";
import { getLayerForKind } from "../../domain/graph/nodeTypes.ts";
import { buildNodeLabel } from "./nodeLabel.ts";
import { assertGraphGateway } from "../ports/graphGateway.ts";
import { storeGraphGateway } from "../../infrastructure/adapters/storeGraphGateway.ts";

function normalizeNodeData(kind, initial = {}) {
  const next = { ...initial };
  const metadata = { ...(initial.metadata || {}) };

  if (next.moduleId && !metadata.moduleId) {
    metadata.moduleId = next.moduleId;
  }
  if (next.submoduleId && !metadata.submoduleId) {
    metadata.submoduleId = next.submoduleId;
  }
  if (Object.keys(metadata).length > 0) {
    next.metadata = metadata;
  }

  return next;
}

function validateContainer(kind, initial) {
  const hasModule = Boolean(initial?.moduleId);
  if (kind === "submodule" && !hasModule) {
    return "Selecciona primero el modulo donde quieres insertar el submodulo.";
  }
  const needsModule = !["service", "module", "submodule"].includes(kind);
  if (needsModule && !hasModule) {
    return "Selecciona un modulo o submodulo antes de crear este artefacto.";
  }
  return null;
}

export function createNode(kind, initial = {}, position, dependencies = {}) {
  const graphGateway = assertGraphGateway(dependencies.graphGateway || storeGraphGateway);
  const containerError = validateContainer(kind, initial);
  if (containerError) {
    return { ok: false, error: containerError };
  }

  const state = graphGateway.getState();
  const existingIds = state.nodes.map((node) => node.id);
  const normalized = normalizeNodeData(kind, initial);
  const name = normalized.name || "";
  const baseId = createNodeId(kind, name || kind);
  const id = ensureUniqueNodeId(baseId, existingIds);

  const node = {
    id,
    position: position || { x: 200, y: 200 },
    data: {
      kind,
      layer: getLayerForKind(kind),
      name,
      label: buildNodeLabel(kind, name),
      ...normalized,
    },
  };

  graphGateway.addNode(node);
  return { ok: true, node };
}
