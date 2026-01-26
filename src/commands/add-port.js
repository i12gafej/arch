const path = require("path");
const { ensureDir, writeFile } = require("../utils/fs");
const { normalizeQualified } = require("../utils/naming");
const { findProjectRoot, loadProject, saveProject } = require("../core/project");
const { ensureSubmodule, getModule } = require("../core/modules");
const { regenerateWiring } = require("../core/wiring");
const { recordOperation } = require("../core/ops");

function parseMethods(raw) {
  if (!raw) {
    return [];
  }
  const parts = raw
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.map((part) => {
    const nameMatch = part.match(/^([a-zA-Z0-9_]+)\s*\(/) || part.match(/^([a-zA-Z0-9_]+)/);
    return nameMatch ? nameMatch[1] : part;
  });
}

function ensurePort(moduleEntry, normalized, submoduleId, methods) {
  const exists = moduleEntry.ports.some(
    (port) => port.id === normalized.snake && port.submodule === submoduleId
  );
  if (!exists) {
    moduleEntry.ports.push({
      id: normalized.snake,
      name: normalized.pascal,
      submodule: submoduleId || null,
      methods,
    });
  }
}

function ensurePackageInit(dirPath) {
  ensureDir(dirPath);
  writeFile(path.join(dirPath, "__init__.py"), "", { ifNotExists: true });
}

function addPortCommand(args, flags = {}) {
  const name = args[0];
  if (!name) {
    throw new Error("Port name is required.");
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

  const methods = parseMethods(flags.methods);
  ensurePort(moduleEntry, qualified.name, submoduleId, methods);

  const moduleRoot = path.join(projectRoot, project.paths.modulesRoot, moduleId);
  const portsDir = path.join(moduleRoot, "application", "ports", submoduleId || "");
  ensurePackageInit(portsDir);

  const portPath = path.join(portsDir, `${qualified.name.snake}.py`);

  const methodLines = methods.length
    ? methods.map((method) => `    def ${method}(self, *args, **kwargs):\n        ...`).join("\n\n")
    : "    def execute(self, *args, **kwargs):\n        ...";

  const portContent = `from __future__ import annotations\n\nfrom typing import Protocol\n\n\nclass ${qualified.name.pascal}(Protocol):\n${methodLines}\n`;

  const actions = [
    { type: "create", path: portPath },
    { type: "update", path: path.join(projectRoot, ".arch", "project.json") },
    { type: "update", path: path.join(moduleRoot, "bootstrap", "container.py") },
  ];

  if (dryRun) {
    return {
      projectRoot,
      plan: actions,
      message: `Plan: add port ${qualified.name.pascal} in module ${moduleId}`,
    };
  }

  writeFile(portPath, portContent, { ifNotExists: true });

  saveProject(projectRoot, project);
  regenerateWiring(projectRoot, project);
  recordOperation(projectRoot, {
    cmd: `add port ${name}`,
    actions,
  });

  return {
    projectRoot,
    message: `Added port ${qualified.name.pascal} in module ${moduleId}`,
  };
}

module.exports = {
  addPortCommand,
};
