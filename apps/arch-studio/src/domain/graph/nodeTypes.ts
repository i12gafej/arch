export const GraphLayers = {
  domain: "domain",
  application: "application",
  delivery: "delivery",
  infrastructure: "infrastructure",
  distributed: "distributed",
};

export const NodeKinds = {
  service: { kind: "service", layer: GraphLayers.distributed, role: "system" },
  module: { kind: "module", layer: GraphLayers.distributed, role: "bounded_context" },
  submodule: { kind: "submodule", layer: GraphLayers.distributed, role: "feature_area" },
  api_surface: { kind: "api_surface", layer: GraphLayers.delivery, role: "driver_adapter" },
  use_case: { kind: "use_case", layer: GraphLayers.application, role: "orchestrator" },
  application_service: { kind: "application_service", layer: GraphLayers.application, role: "app_service" },
  domain_interface: { kind: "domain_interface", layer: GraphLayers.domain, role: "domain_abstraction" },
  domain_service: { kind: "domain_service", layer: GraphLayers.domain, role: "domain_implementation" },
  entity: { kind: "entity", layer: GraphLayers.domain, role: "entity" },
  value_object: { kind: "value_object", layer: GraphLayers.domain, role: "value_object" },
  port: { kind: "port", layer: GraphLayers.application, role: "boundary" },
  adapter: { kind: "adapter", layer: GraphLayers.infrastructure, role: "driven_adapter" },
  capability: { kind: "capability", layer: GraphLayers.infrastructure, role: "infra_capability" },
  persistence_model: { kind: "persistence_model", layer: GraphLayers.infrastructure, role: "orm_model" },
};

export const NodeKindList = Object.values(NodeKinds);

export function isNodeKind(kind) {
  return Boolean(NodeKinds[kind]);
}

export function getLayerForKind(kind) {
  return NodeKinds[kind]?.layer || GraphLayers.distributed;
}

export function isContainerKind(kind) {
  return kind === "service" || kind === "module" || kind === "submodule";
}
