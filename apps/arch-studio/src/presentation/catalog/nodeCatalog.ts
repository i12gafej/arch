import { NodeKindList } from "../../domain/graph/nodeTypes.ts";

const catalog = {
  service: {
    label: "Service",
    category: "Structure",
    fields: [{ key: "name", label: "Name", placeholder: "demo_service" }],
  },
  module: {
    label: "Module",
    category: "Structure",
    fields: [{ key: "name", label: "Name", placeholder: "identity" }],
  },
  submodule: {
    label: "Submodule",
    category: "Structure",
    fields: [
      { key: "name", label: "Name", placeholder: "auth" },
      { key: "moduleId", label: "Module", placeholder: "identity" },
    ],
  },
  entity: {
    label: "Entity",
    category: "Domain",
    fields: [{ key: "name", label: "Name", placeholder: "user" }],
  },
  value_object: {
    label: "Value Object",
    category: "Domain",
    fields: [{ key: "name", label: "Name", placeholder: "email" }],
  },
  domain_interface: {
    label: "Domain Interface",
    category: "Domain",
    fields: [
      { key: "name", label: "Name", placeholder: "password_policy" },
      { key: "interfaceKind", label: "Kind", placeholder: "policy" },
    ],
  },
  domain_service: {
    label: "Domain Service",
    category: "Domain",
    fields: [
      { key: "name", label: "Name", placeholder: "default_password_policy" },
      { key: "implements", label: "Implements", placeholder: "password_policy" },
    ],
  },
  use_case: {
    label: "Use Case",
    category: "Application",
    fields: [
      { key: "name", label: "Name", placeholder: "change_password" },
      { key: "moduleId", label: "Module", placeholder: "identity" },
      { key: "submoduleId", label: "Submodule", placeholder: "auth" },
      { key: "route", label: "Route", placeholder: "/users/{id}/password" },
    ],
  },
  application_service: {
    label: "Application Service",
    category: "Application",
    fields: [
      { key: "name", label: "Name", placeholder: "pagination_service" },
      { key: "uses", label: "Uses Ports", placeholder: "content_repository" },
    ],
  },
  port: {
    label: "Port",
    category: "Boundary",
    fields: [
      { key: "name", label: "Name", placeholder: "user_repository" },
      { key: "methods", label: "Methods", placeholder: "get_by_id, save" },
    ],
  },
  adapter: {
    label: "Adapter",
    category: "Infrastructure",
    fields: [
      { key: "name", label: "Name", placeholder: "sql_user_repository" },
      { key: "implements", label: "Implements Port", placeholder: "user_repository" },
    ],
  },
  capability: {
    label: "Capability",
    category: "Infrastructure",
    fields: [
      { key: "name", label: "Name", placeholder: "db_postgres" },
      { key: "moduleId", label: "Module", placeholder: "identity" },
    ],
  },
  persistence_model: {
    label: "Persistence Model",
    category: "Infrastructure",
    fields: [
      { key: "name", label: "Name", placeholder: "user_record" },
      { key: "table", label: "Table", placeholder: "users" },
    ],
  },
  api_surface: {
    label: "API Surface",
    category: "Delivery",
    fields: [
      { key: "name", label: "Name", placeholder: "http" },
      { key: "mount", label: "Mount", placeholder: "/identity" },
    ],
  },
};

export const paletteCategoryOrder = [
  "Structure",
  "Domain",
  "Application",
  "Boundary",
  "Infrastructure",
  "Delivery",
];

export function getNodeLabel(kind) {
  return catalog[kind]?.label || kind;
}

export function getNodeFields(kind) {
  return catalog[kind]?.fields || [];
}

export function getNodeCategory(kind) {
  return catalog[kind]?.category || "Other";
}

export function getPaletteEntries() {
  return NodeKindList.map((node) => ({
    kind: node.kind,
    label: getNodeLabel(node.kind),
    category: getNodeCategory(node.kind),
  }));
}
