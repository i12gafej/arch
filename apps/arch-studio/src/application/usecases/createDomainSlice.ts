import { createNode } from "./createNode.ts";
import { connectNodes } from "./connectNodes.ts";

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function createDomainSlice(input, dependencies = {}) {
  const rawName = normalizeName(input?.name || "feature");
  if (!rawName) {
    return { ok: false, error: "Nombre de feature invalido." };
  }
  const moduleId = input?.moduleId;
  const submoduleId = input?.submoduleId;
  if (!moduleId) {
    return { ok: false, error: "Selecciona primero un modulo o submodulo." };
  }

  const context = {
    moduleId,
    ...(submoduleId ? { submoduleId } : {}),
  };

  const entityResult = createNode("entity", { ...context, name: rawName }, undefined, dependencies);
  if (!entityResult.ok) {
    return entityResult;
  }
  const policyName = `${rawName}_policy`;
  const policyResult = createNode(
    "domain_interface",
    { ...context, name: policyName, interfaceKind: "policy" },
    undefined,
    dependencies
  );
  if (!policyResult.ok) {
    return policyResult;
  }
  const serviceName = `default_${policyName}`;
  const domainServiceResult = createNode(
    "domain_service",
    { ...context, name: serviceName, implements: policyName },
    undefined,
    dependencies
  );
  if (!domainServiceResult.ok) {
    return domainServiceResult;
  }
  const useCaseName = `process_${rawName}`;
  const useCaseResult = createNode(
    "use_case",
    { ...context, name: useCaseName },
    undefined,
    dependencies
  );
  if (!useCaseResult.ok) {
    return useCaseResult;
  }
  const portName = `${rawName}_repository`;
  const portResult = createNode(
    "port",
    { ...context, name: portName, methods: "get_by_id, save" },
    undefined,
    dependencies
  );
  if (!portResult.ok) {
    return portResult;
  }

  connectNodes(policyResult.node.id, domainServiceResult.node.id, "implements", dependencies);
  connectNodes(useCaseResult.node.id, policyResult.node.id, "depends_on", dependencies);
  connectNodes(useCaseResult.node.id, portResult.node.id, "depends_on", dependencies);

  return {
    ok: true,
    created: [
      entityResult.node.id,
      policyResult.node.id,
      domainServiceResult.node.id,
      useCaseResult.node.id,
      portResult.node.id,
    ],
  };
}
