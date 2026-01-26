const path = require("path");
const { ensureDir, writeFile } = require("../utils/fs");
const { normalizeQualified } = require("../utils/naming");
const { findProjectRoot, loadProject, saveProject } = require("../core/project");
const { ensureSubmodule, getModule } = require("../core/modules");
const { recordOperation } = require("../core/ops");

function ensurePackageInit(dirPath) {
  ensureDir(dirPath);
  writeFile(path.join(dirPath, "__init__.py"), "", { ifNotExists: true });
}

function getLayerDir(layer) {
  if (layer === "domain") {
    return path.join("domain", "services");
  }
  if (layer === "application") {
    return path.join("application", "services");
  }
  if (layer === "infrastructure") {
    return path.join("infrastructure", "services");
  }
  throw new Error("Layer must be domain|application|infrastructure");
}

function addServiceCommand(args, flags = {}) {
  const name = args[0];
  if (!name) {
    throw new Error("Service name is required.");
  }

  const layer = flags.layer || "domain";
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

  moduleEntry.services = moduleEntry.services || [];
  const exists = moduleEntry.services.some(
    (service) =>
      service.id === qualified.name.snake &&
      service.submodule === (submoduleId || null) &&
      service.layer === layer
  );
  if (!exists) {
    moduleEntry.services.push({
      id: qualified.name.snake,
      name: qualified.name.pascal,
      submodule: submoduleId || null,
      layer,
    });
  }

  const moduleRoot = path.join(projectRoot, project.paths.modulesRoot, moduleId);
  const layerDir = getLayerDir(layer);
  const servicesDir = path.join(moduleRoot, layerDir, submoduleId || "");
  ensurePackageInit(servicesDir);

  const servicePath = path.join(servicesDir, `${qualified.name.snake}.py`);
  const serviceContent = `from __future__ import annotations\n\n\nclass ${qualified.name.pascal}:\n    def run(self, *args, **kwargs):\n        raise NotImplementedError\n`;

  const actions = [
    { type: "create", path: servicePath },
    { type: "update", path: path.join(projectRoot, ".arch", "project.json") },
  ];

  if (dryRun) {
    return {
      projectRoot,
      plan: actions,
      message: `Plan: add ${layer} service ${qualified.name.pascal} in module ${moduleId}`,
    };
  }

  writeFile(servicePath, serviceContent, { ifNotExists: true });
  saveProject(projectRoot, project);
  recordOperation(projectRoot, {
    cmd: `add service ${name} --layer ${layer}`,
    actions,
  });

  return {
    projectRoot,
    message: `Added ${layer} service ${qualified.name.pascal} in module ${moduleId}`,
  };
}

module.exports = {
  addServiceCommand,
};
