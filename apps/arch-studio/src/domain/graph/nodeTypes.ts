export const NodeKinds = {
  service: {
    kind: "service",
    label: "Service",
    layer: "distributed",
    category: "Structure",
    fields: [{ key: "name", label: "Name", placeholder: "billing" }],
  },
  module: {
    kind: "module",
    label: "Module",
    layer: "distributed",
    category: "Structure",
    fields: [{ key: "name", label: "Name", placeholder: "identity" }],
  },
  submodule: {
    kind: "submodule",
    label: "Submodule",
    layer: "distributed",
    category: "Structure",
    fields: [
      { key: "name", label: "Name", placeholder: "auth" },
      { key: "moduleId", label: "Module", placeholder: "identity" },
    ],
  },
  api_surface: {
    kind: "api_surface",
    label: "API Surface",
    layer: "delivery",
    category: "API",
    fields: [
      { key: "name", label: "Name", placeholder: "http" },
      { key: "mount", label: "Mount", placeholder: "/identity" },
    ],
  },
  use_case: {
    kind: "use_case",
    label: "Use Case",
    layer: "application",
    category: "Core",
    fields: [
      { key: "name", label: "Name", placeholder: "change_password" },
      { key: "moduleId", label: "Module", placeholder: "identity" },
      { key: "submoduleId", label: "Submodule", placeholder: "auth" },
      { key: "route", label: "Route", placeholder: "/users/{id}/password" },
    ],
  },
  domain_interface: {
    kind: "domain_interface",
    label: "Domain Interface",
    layer: "domain",
    category: "Core",
    fields: [
      { key: "name", label: "Name", placeholder: "password_policy" },
      { key: "interfaceKind", label: "Kind", placeholder: "policy" },
    ],
  },
  domain_service: {
    kind: "domain_service",
    label: "Domain Service",
    layer: "domain",
    category: "Core",
    fields: [
      { key: "name", label: "Name", placeholder: "default_password_policy" },
      { key: "implements", label: "Implements", placeholder: "password_policy" },
    ],
  },
  application_service: {
    kind: "application_service",
    label: "Application Service",
    layer: "application",
    category: "Core",
    fields: [
      { key: "name", label: "Name", placeholder: "pagination_service" },
      { key: "uses", label: "Uses Ports", placeholder: "content_repository" },
    ],
  },
  port: {
    kind: "port",
    label: "Port",
    layer: "application",
    category: "Boundary",
    fields: [
      { key: "name", label: "Name", placeholder: "user_repository" },
      { key: "methods", label: "Methods", placeholder: "get_by_id, save" },
    ],
  },
  adapter: {
    kind: "adapter",
    label: "Adapter",
    layer: "infrastructure",
    category: "Infra",
    fields: [
      { key: "name", label: "Name", placeholder: "sql_user_repository" },
      { key: "implements", label: "Implements Port", placeholder: "user_repository" },
    ],
  },
  capability: {
    kind: "capability",
    label: "Capability",
    layer: "infrastructure",
    category: "Infra",
    fields: [
      { key: "name", label: "Name", placeholder: "db_postgres" },
      { key: "moduleId", label: "Module", placeholder: "identity" },
    ],
  },
};

export const NodeKindList = Object.values(NodeKinds);

export function getLayerForKind(kind) {
  return NodeKinds[kind]?.layer || "distributed";
}

export function getNodeFields(kind) {
  return NodeKinds[kind]?.fields || [];
}

export function getNodeCategory(kind) {
  return NodeKinds[kind]?.category || "Other";
}
