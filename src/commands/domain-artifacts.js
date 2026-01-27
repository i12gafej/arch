const path = require("path");
const { ensureDir, writeFile } = require("../utils/fs");
const { normalizeQualified, normalizeName } = require("../utils/naming");
const { findProjectRoot, loadProject, saveProject } = require("../core/project");
const { ensureSubmodule, getModule } = require("../core/modules");
const { recordOperation } = require("../core/ops");

function ensurePackageInit(dirPath) {
  ensureDir(dirPath);
  writeFile(path.join(dirPath, "__init__.py"), "", { ifNotExists: true });
}

function addDomainInterfaceCommand(args, flags = {}) {
  const name = args[0];
  if (!name) {
    throw new Error("Domain interface name is required.");
  }
  const kind = flags.kind || "policy";
  const allowed = ["policy", "strategy", "spec", "selector"];
  if (!allowed.includes(kind)) {
    throw new Error("--kind must be policy|strategy|spec|selector");
  }
  const dryRun = flags.dryRun || false;

  const projectRoot = findProjectRoot(process.cwd());
  if (!projectRoot) {
    throw new Error("No .arch/project.json found. Run arch init first.");
  }

  const project = loadProject(projectRoot);
  const qualified = normalizeQualified(name);
  const moduleId = qualified.module ? qualified.module.snake : project.defaultModule;
  const submoduleId = qualified.submodule ? qualified.submodule.snake : null;
  const submoduleLabel = qualified.submodule ? qualified.submodule.pascal : null;

  const moduleEntry = getModule(project, moduleId);
  if (submoduleId) {
    ensureSubmodule(moduleEntry, submoduleId, submoduleLabel);
  }

  moduleEntry.domainInterfaces = moduleEntry.domainInterfaces || [];
  const exists = moduleEntry.domainInterfaces.some(
    (iface) => iface.id === qualified.name.snake && iface.submodule === (submoduleId || null)
  );
  if (!exists) {
    moduleEntry.domainInterfaces.push({
      id: qualified.name.snake,
      name: qualified.name.pascal,
      kind,
      submodule: submoduleId || null,
    });
  }

  const moduleRoot = path.join(projectRoot, project.paths.modulesRoot, moduleId);
  const interfacesDir = path.join(moduleRoot, "domain", "interfaces", submoduleId || "");
  ensurePackageInit(interfacesDir);

  const interfacePath = path.join(interfacesDir, `${qualified.name.snake}.py`);
  const interfaceContent = `from __future__ import annotations\n\nfrom typing import Protocol\n\n\nclass ${qualified.name.pascal}(Protocol):\n    def evaluate(self, *args, **kwargs) -> bool:\n        ...\n`;

  const actions = [
    { type: "create", path: interfacePath },
    { type: "update", path: path.join(projectRoot, ".arch", "project.json") },
  ];

  if (dryRun) {
    return {
      projectRoot,
      plan: actions,
      message: `Plan: add domain-interface ${qualified.name.pascal} in module ${moduleId}`,
    };
  }

  writeFile(interfacePath, interfaceContent, { ifNotExists: true });
  saveProject(projectRoot, project);
  recordOperation(projectRoot, {
    cmd: `add domain-interface ${name} --kind ${kind}`,
    actions,
  });

  return {
    projectRoot,
    message: `Added domain-interface ${qualified.name.pascal} in module ${moduleId}`,
  };
}

function addDomainServiceCommand(args, flags = {}) {
  const name = args[0];
  if (!name) {
    throw new Error("Domain service name is required.");
  }
  const implementsName = flags.implements || null;
  const dryRun = flags.dryRun || false;

  const projectRoot = findProjectRoot(process.cwd());
  if (!projectRoot) {
    throw new Error("No .arch/project.json found. Run arch init first.");
  }

  const project = loadProject(projectRoot);
  const qualified = normalizeQualified(name);
  const moduleId = qualified.module ? qualified.module.snake : project.defaultModule;
  const submoduleId = qualified.submodule ? qualified.submodule.snake : null;
  const submoduleLabel = qualified.submodule ? qualified.submodule.pascal : null;

  const moduleEntry = getModule(project, moduleId);
  if (submoduleId) {
    ensureSubmodule(moduleEntry, submoduleId, submoduleLabel);
  }

  moduleEntry.domainServices = moduleEntry.domainServices || [];
  const exists = moduleEntry.domainServices.some(
    (svc) => svc.id === qualified.name.snake && svc.submodule === (submoduleId || null)
  );
  if (!exists) {
    moduleEntry.domainServices.push({
      id: qualified.name.snake,
      name: qualified.name.pascal,
      submodule: submoduleId || null,
      implements: implementsName || null,
    });
  }

  const moduleRoot = path.join(projectRoot, project.paths.modulesRoot, moduleId);
  const servicesDir = path.join(moduleRoot, "domain", "services", submoduleId || "");
  ensurePackageInit(servicesDir);

  const servicePath = path.join(servicesDir, `${qualified.name.snake}.py`);
  let implementsImport = "";
  let implementsClause = "";
  if (implementsName) {
    const iface = normalizeName(implementsName);
    const ifacePath = submoduleId
      ? `..interfaces.${submoduleId}.${iface.snake}`
      : `..interfaces.${iface.snake}`;
    implementsImport = `from ${ifacePath} import ${iface.pascal}\n\n`;
    implementsClause = `(${iface.pascal})`;
  }
  const serviceContent = `from __future__ import annotations\n\n${implementsImport}class ${qualified.name.pascal}${implementsClause}:\n    def run(self, *args, **kwargs):\n        raise NotImplementedError\n`;

  const actions = [
    { type: "create", path: servicePath },
    { type: "update", path: path.join(projectRoot, ".arch", "project.json") },
  ];

  if (dryRun) {
    return {
      projectRoot,
      plan: actions,
      message: `Plan: add domain-service ${qualified.name.pascal} in module ${moduleId}`,
    };
  }

  writeFile(servicePath, serviceContent, { ifNotExists: true });
  saveProject(projectRoot, project);
  recordOperation(projectRoot, {
    cmd: `add domain-service ${name}`,
    actions,
  });

  return {
    projectRoot,
    message: `Added domain-service ${qualified.name.pascal} in module ${moduleId}`,
  };
}

function addAppServiceCommand(args, flags = {}) {
  const name = args[0];
  if (!name) {
    throw new Error("App service name is required.");
  }
  const uses = flags.uses ? flags.uses.split(",").map((v) => v.trim()).filter(Boolean) : [];
  const dryRun = flags.dryRun || false;

  const projectRoot = findProjectRoot(process.cwd());
  if (!projectRoot) {
    throw new Error("No .arch/project.json found. Run arch init first.");
  }

  const project = loadProject(projectRoot);
  const qualified = normalizeQualified(name);
  const moduleId = qualified.module ? qualified.module.snake : project.defaultModule;
  const submoduleId = qualified.submodule ? qualified.submodule.snake : null;
  const submoduleLabel = qualified.submodule ? qualified.submodule.pascal : null;

  const moduleEntry = getModule(project, moduleId);
  if (submoduleId) {
    ensureSubmodule(moduleEntry, submoduleId, submoduleLabel);
  }

  moduleEntry.appServices = moduleEntry.appServices || [];
  const exists = moduleEntry.appServices.some(
    (svc) => svc.id === qualified.name.snake && svc.submodule === (submoduleId || null)
  );
  if (!exists) {
    moduleEntry.appServices.push({
      id: qualified.name.snake,
      name: qualified.name.pascal,
      submodule: submoduleId || null,
      uses,
    });
  }

  const moduleRoot = path.join(projectRoot, project.paths.modulesRoot, moduleId);
  const servicesDir = path.join(moduleRoot, "application", "services", submoduleId || "");
  ensurePackageInit(servicesDir);

  const servicePath = path.join(servicesDir, `${qualified.name.snake}.py`);
  const portImports = uses
    .map((item) => normalizeName(item))
    .map((port) => {
      const importPath = submoduleId
        ? `..ports.${submoduleId}.${port.snake}`
        : `..ports.${port.snake}`;
      return `from ${importPath} import ${port.pascal}`;
    });

  const initParams = uses
    .map((item) => normalizeName(item))
    .map((port) => `${port.snake}: ${port.pascal}`)
    .join(", ");
  const assigns = uses
    .map((item) => normalizeName(item))
    .map((port) => `        self.${port.snake} = ${port.snake}`)
    .join("\n");

  const initBlock = uses.length
    ? `    def __init__(self, ${initParams}):\n${assigns}\n\n`
    : "";

  const serviceContent = `from __future__ import annotations\n\n${portImports.join("\n")}\n\n\nclass ${qualified.name.pascal}:\n${initBlock}    def run(self, *args, **kwargs):\n        raise NotImplementedError\n`;

  const actions = [
    { type: "create", path: servicePath },
    { type: "update", path: path.join(projectRoot, ".arch", "project.json") },
  ];

  if (dryRun) {
    return {
      projectRoot,
      plan: actions,
      message: `Plan: add app-service ${qualified.name.pascal} in module ${moduleId}`,
    };
  }

  writeFile(servicePath, serviceContent, { ifNotExists: true });
  saveProject(projectRoot, project);
  recordOperation(projectRoot, {
    cmd: `add app-service ${name}`,
    actions,
  });

  return {
    projectRoot,
    message: `Added app-service ${qualified.name.pascal} in module ${moduleId}`,
  };
}

function addEngineCommand(args, flags = {}) {
  const layer = flags.layer || "domain";
  if (!['domain','application'].includes(layer)) {
    throw new Error("--layer must be domain|application");
  }
  if (layer === "domain") {
    return addDomainServiceCommand(args, flags);
  }
  return addAppServiceCommand(args, flags);
}

module.exports = {
  addDomainInterfaceCommand,
  addDomainServiceCommand,
  addAppServiceCommand,
  addEngineCommand,
};
