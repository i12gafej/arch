import { EdgeKinds } from "./edgeTypes.ts";
import { getLayerForKind } from "./nodeTypes.ts";

const allowedConnections = [
  { source: "service", target: "module", edge: EdgeKinds.contains, reason: "Services contain modules." },
  { source: "module", target: "submodule", edge: EdgeKinds.contains, reason: "Modules contain submodules." },
  { source: "submodule", target: "use_case", edge: EdgeKinds.contains, reason: "Submodules contain use cases." },
  { source: "module", target: "api_surface", edge: EdgeKinds.exposes, reason: "Modules expose API surfaces." },
  { source: "use_case", target: "port", edge: EdgeKinds.depends_on, reason: "Use cases depend on ports." },
  { source: "use_case", target: "domain_interface", edge: EdgeKinds.depends_on, reason: "Use cases depend on domain interfaces." },
  { source: "domain_interface", target: "domain_service", edge: EdgeKinds.implements, reason: "Domain services implement domain interfaces." },
  { source: "port", target: "adapter", edge: EdgeKinds.implemented_by, reason: "Adapters implement ports." },
  { source: "module", target: "capability", edge: EdgeKinds.enabled_by, reason: "Modules enable capabilities." },
];

const forbiddenConnections = [
  { source: "use_case", target: "adapter", reason: "Use cases cannot depend on adapters." },
  { source: "domain_interface", target: "adapter", reason: "Domain interfaces cannot depend on adapters." },
  { source: "api_surface", target: "domain_interface", reason: "Delivery cannot define domain interfaces." },
];

export function canConnect(sourceKind, targetKind, edgeKind) {
  const banned = forbiddenConnections.find(
    (rule) => rule.source === sourceKind && rule.target === targetKind
  );
  if (banned) {
    return { allowed: false, reason: banned.reason };
  }

  const allowed = allowedConnections.find(
    (rule) => rule.source === sourceKind && rule.target === targetKind && rule.edge === edgeKind
  );
  if (allowed) {
    return { allowed: true };
  }

  const layerSource = getLayerForKind(sourceKind);
  const layerTarget = getLayerForKind(targetKind);
  if (layerSource === "domain" && (layerTarget === "delivery" || layerTarget === "infrastructure")) {
    return {
      allowed: false,
      reason: "Domain layer cannot depend on delivery or infrastructure.",
    };
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
