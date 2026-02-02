import { EdgeKinds } from "./edgeTypes.ts";
import { GraphLayers, getLayerForKind } from "./nodeTypes.ts";

const allowedConnections = [
  { source: "service", target: "module", edge: EdgeKinds.contains, reason: "Services contain modules." },
  { source: "module", target: "submodule", edge: EdgeKinds.contains, reason: "Modules contain submodules." },
  { source: "submodule", target: "use_case", edge: EdgeKinds.contains, reason: "Submodules contain use cases." },
  { source: "submodule", target: "application_service", edge: EdgeKinds.contains, reason: "Submodules contain application services." },
  { source: "submodule", target: "domain_interface", edge: EdgeKinds.contains, reason: "Submodules contain domain interfaces." },
  { source: "submodule", target: "domain_service", edge: EdgeKinds.contains, reason: "Submodules contain domain services." },
  { source: "submodule", target: "entity", edge: EdgeKinds.contains, reason: "Submodules contain entities." },
  { source: "submodule", target: "value_object", edge: EdgeKinds.contains, reason: "Submodules contain value objects." },
  { source: "submodule", target: "port", edge: EdgeKinds.contains, reason: "Submodules contain ports." },
  { source: "submodule", target: "adapter", edge: EdgeKinds.contains, reason: "Submodules contain adapters." },
  { source: "submodule", target: "persistence_model", edge: EdgeKinds.contains, reason: "Submodules contain persistence models." },
  { source: "module", target: "api_surface", edge: EdgeKinds.exposes, reason: "Modules expose API surfaces." },
  { source: "module", target: "capability", edge: EdgeKinds.enabled_by, reason: "Modules enable capabilities." },
  { source: "use_case", target: "port", edge: EdgeKinds.depends_on, reason: "Use cases depend on ports." },
  { source: "use_case", target: "domain_interface", edge: EdgeKinds.depends_on, reason: "Use cases depend on domain interfaces." },
  { source: "use_case", target: "application_service", edge: EdgeKinds.depends_on, reason: "Use cases can call application services." },
  { source: "application_service", target: "port", edge: EdgeKinds.depends_on, reason: "Application services depend on ports." },
  { source: "application_service", target: "domain_interface", edge: EdgeKinds.depends_on, reason: "Application services can use domain abstractions." },
  { source: "application_service", target: "domain_service", edge: EdgeKinds.depends_on, reason: "Application services can use domain services." },
  { source: "domain_interface", target: "domain_service", edge: EdgeKinds.implements, reason: "Domain services implement domain interfaces." },
  { source: "port", target: "adapter", edge: EdgeKinds.implemented_by, reason: "Adapters implement ports." },
];

const forbiddenConnections = [
  { source: "use_case", target: "adapter", reason: "Use cases cannot depend on adapters." },
  { source: "application_service", target: "adapter", reason: "Application services cannot depend on adapters." },
  { source: "domain_interface", target: "adapter", reason: "Domain interfaces cannot depend on adapters." },
  { source: "domain_service", target: "adapter", reason: "Domain services cannot depend on adapters." },
  { source: "api_surface", target: "domain_interface", reason: "Delivery cannot define domain interfaces." },
  { source: "api_surface", target: "domain_service", reason: "Delivery cannot define domain services." },
];

function validateDependencyRule(sourceKind, targetKind, edgeKind) {
  if (edgeKind !== EdgeKinds.depends_on) {
    return null;
  }
  const sourceLayer = getLayerForKind(sourceKind);
  const targetLayer = getLayerForKind(targetKind);

  if (sourceLayer === GraphLayers.domain && targetLayer !== GraphLayers.domain) {
    return "Domain layer can only depend on domain layer.";
  }

  if (
    sourceLayer === GraphLayers.application &&
    (targetLayer === GraphLayers.delivery || targetLayer === GraphLayers.infrastructure)
  ) {
    return "Application layer cannot depend on delivery or infrastructure.";
  }

  return null;
}

export function canConnect(sourceKind, targetKind, edgeKind) {
  const banned = forbiddenConnections.find(
    (rule) => rule.source === sourceKind && rule.target === targetKind
  );
  if (banned) {
    return { allowed: false, reason: banned.reason };
  }

  const dependencyError = validateDependencyRule(sourceKind, targetKind, edgeKind);
  if (dependencyError) {
    return { allowed: false, reason: dependencyError };
  }

  const allowed = allowedConnections.find(
    (rule) => rule.source === sourceKind && rule.target === targetKind && rule.edge === edgeKind
  );
  if (allowed) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "Connection not allowed by the architecture rules.",
  };
}

export function suggestEdgeKind(sourceKind, targetKind) {
  const matches = allowedConnections.filter(
    (rule) => rule.source === sourceKind && rule.target === targetKind
  );
  if (matches.length === 1) {
    return matches[0].edge;
  }
  return null;
}

export function listAllowedConnections() {
  return allowedConnections.map((rule) => ({ ...rule }));
}
