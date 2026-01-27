const path = require("path");
const { ensureDir, writeFile } = require("../utils/fs");
const { normalizeQualified, normalizeName } = require("../utils/naming");
const { findProjectRoot, loadProject, saveProject } = require("../core/project");
const { ensureSubmodule, getModule } = require("../core/modules");
const { regenerateWiring } = require("../core/wiring");
const { recordOperation } = require("../core/ops");

function ensureBinding(moduleEntry, portName, adapterName, submoduleId) {
  const exists = moduleEntry.bindings.some(
    (binding) =>
      binding.port === portName && binding.adapter === adapterName && binding.submodule === submoduleId
  );
  if (!exists) {
    moduleEntry.bindings.push({
      port: portName,
      adapter: adapterName,
      submodule: submoduleId || null,
    });
  }
}

function ensurePackageInit(dirPath) {
  ensureDir(dirPath);
  writeFile(path.join(dirPath, "__init__.py"), "", { ifNotExists: true });
}

function bindCommand(args, flags = {}) {
  const portArg = args[0];
  const adapterArg = flags.to || args[1];
  if (!portArg || !adapterArg) {
    throw new Error("Usage: arch bind <module>[.<submodule>].<port> --to <adapter>");
  }
  const dryRun = flags.dryRun || false;

  const projectRoot = findProjectRoot(process.cwd());
  if (!projectRoot) {
    throw new Error("No .arch/project.json found. Run arch init first.");
  }

  const project = loadProject(projectRoot);
  const qualifiedPort = normalizeQualified(portArg);
  const moduleId = qualifiedPort.module ? qualifiedPort.module.snake : project.defaultModule;
  const submoduleId = qualifiedPort.submodule ? qualifiedPort.submodule.snake : null;
  const submoduleLabel = qualifiedPort.submodule ? qualifiedPort.submodule.pascal : null;

  const moduleEntry = getModule(project, moduleId);

  if (submoduleId) {
    ensureSubmodule(moduleEntry, submoduleId, submoduleLabel);
  }

  const portEntry = moduleEntry.ports.find(
    (port) => port.id === qualifiedPort.name.snake && port.submodule === submoduleId
  );
  if (!portEntry) {
    throw new Error(
      `Port not found in module ${moduleId}: ${qualifiedPort.name.pascal}${
        submoduleId ? ` (${submoduleId})` : ""
      }`
    );
  }

  const adapterNormalized = normalizeName(adapterArg);
  ensureBinding(moduleEntry, portEntry.name, adapterNormalized.pascal, submoduleId);

  const moduleRoot = path.join(projectRoot, project.paths.modulesRoot, moduleId);
  const adaptersDir = path.join(moduleRoot, "infrastructure", "adapters", submoduleId || "");
  ensurePackageInit(adaptersDir);

  const adapterPath = path.join(adaptersDir, `${adapterNormalized.snake}.py`);

  const methods = portEntry.methods && portEntry.methods.length ? portEntry.methods : ["execute"];
  const methodLines = methods
    .map((method) => `    def ${method}(self, *args, **kwargs):\n        raise NotImplementedError`)
    .join("\n\n");

  const portImport = submoduleId
    ? `...application.ports.${submoduleId}.${portEntry.id}`
    : `...application.ports.${portEntry.id}`;

  const adapterContent = `from __future__ import annotations\n\nfrom ${portImport} import ${portEntry.name}\n\n\nclass ${adapterNormalized.pascal}(${portEntry.name}):\n    def __init__(self) -> None:\n        pass\n\n${methodLines}\n`;

  const actions = [
    { type: "create", path: adapterPath },
    { type: "update", path: path.join(projectRoot, ".arch", "project.json") },
    { type: "update", path: path.join(moduleRoot, "bootstrap", "container.py") },
  ];

  if (dryRun) {
    return {
      projectRoot,
      plan: actions,
      message: `Plan: bind ${qualifiedPort.name.pascal} to ${adapterNormalized.pascal}`,
    };
  }

  writeFile(adapterPath, adapterContent, { ifNotExists: true });

  saveProject(projectRoot, project);
  regenerateWiring(projectRoot, project);
  recordOperation(projectRoot, {
    cmd: `bind ${portArg} --to ${adapterArg}`,
    actions,
  });

  return {
    projectRoot,
    message: `Bound ${portEntry.name} to ${adapterNormalized.pascal} in module ${moduleId}`,
  };
}

module.exports = {
  bindCommand,
};
