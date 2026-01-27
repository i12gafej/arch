const path = require("path");
const { ensureDir, writeFile } = require("../utils/fs");
const { normalizeQualified, normalizeName } = require("../utils/naming");
const { findProjectRoot, loadProject, saveProject } = require("../core/project");
const { ensureSubmodule, getModule } = require("../core/modules");
const { loadCapability, renderTemplate, applyCapabilities } = require("../core/capabilities");
const { regenerateWiring } = require("../core/wiring");
const { recordOperation } = require("../core/ops");

function toSnake(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

function ensurePackageInit(dirPath) {
  ensureDir(dirPath);
  writeFile(path.join(dirPath, "__init__.py"), "", { ifNotExists: true });
}

function ensureCapabilityEntry(moduleEntry, payload) {
  moduleEntry.capabilities = moduleEntry.capabilities || [];
  const exists = moduleEntry.capabilities.some(
    (cap) => cap.id === payload.id && cap.submodule === payload.submodule && cap.port === payload.port
  );
  if (!exists) {
    moduleEntry.capabilities.push(payload);
  }
}

function ensureBinding(moduleEntry, portName, adapterName, submoduleId) {
  moduleEntry.bindings = moduleEntry.bindings || [];
  const exists = moduleEntry.bindings.some(
    (binding) =>
      binding.port === portName && binding.adapter === adapterName && binding.submodule === submoduleId
  );
  if (!exists) {
    moduleEntry.bindings.push({ port: portName, adapter: adapterName, submodule: submoduleId });
  }
}

function addCapabilityCommand(args, flags = {}) {
  const capabilityId = args[0];
  if (!capabilityId) {
    throw new Error("Capability id is required.");
  }
  const dryRun = flags.dryRun || false;

  const projectRoot = findProjectRoot(process.cwd());
  if (!projectRoot) {
    throw new Error("No .arch/project.json found. Run arch init first.");
  }

  const project = loadProject(projectRoot);
  const definition = loadCapability(capabilityId);

  let moduleId = flags.module || project.defaultModule;
  let submoduleId = flags.submodule || null;
  let portQualified = null;

  if (flags.for) {
    portQualified = normalizeQualified(flags.for);
    if (portQualified.module) {
      moduleId = portQualified.module.snake;
    }
    if (portQualified.submodule) {
      submoduleId = portQualified.submodule.snake;
    }
  }

  const moduleEntry = getModule(project, moduleId);
  if (submoduleId) {
    ensureSubmodule(moduleEntry, submoduleId, submoduleId);
  }

  if (definition.adapter && definition.adapter.requiresPort && !flags.for) {
    throw new Error(`Capability ${capabilityId} requires --for <port>`);
  }

  let adapterPath = null;
  let adapterName = null;
  let portEntry = null;
  if (flags.for) {
    const portName = portQualified ? portQualified.name : normalizeName(flags.for);
    portEntry = moduleEntry.ports.find(
      (port) => port.id === portName.snake && port.submodule === (submoduleId || null)
    );
    if (!portEntry) {
      throw new Error(`Port not found in module ${moduleId}: ${portName.pascal}`);
    }

    adapterName = `${definition.adapter.prefix}${portEntry.name}`;
    const adapterFile = toSnake(adapterName);
    const moduleRoot = path.join(projectRoot, project.paths.modulesRoot, moduleId);
    const adaptersDir = path.join(moduleRoot, "infrastructure", "adapters", submoduleId || "");
    ensurePackageInit(adaptersDir);
    adapterPath = path.join(adaptersDir, `${adapterFile}.py`);
  }

  const actions = [];
  if (adapterPath) {
    actions.push({ type: "create", path: adapterPath });
  }
  actions.push({ type: "update", path: path.join(projectRoot, ".arch", "project.json") });
  actions.push({ type: "update", path: path.join(projectRoot, ".env.example") });
  actions.push({ type: "update", path: path.join(projectRoot, "docker-compose.yml") });
  actions.push({ type: "update", path: path.join(projectRoot, project.paths.modulesRoot, moduleId, "bootstrap", "settings.py") });
  actions.push({ type: "update", path: path.join(projectRoot, project.paths.modulesRoot, moduleId, "bootstrap", "container.py") });
  actions.push({ type: "update", path: path.join(projectRoot, project.paths.deliveryRoot, "app.py") });

  if (dryRun) {
    return {
      projectRoot,
      plan: actions,
      message: `Plan: add capability ${capabilityId} to module ${moduleId}`,
    };
  }

  if (adapterPath && portEntry) {
    const moduleRoot = path.join(projectRoot, project.paths.modulesRoot, moduleId);
    const portImport = submoduleId
      ? `...application.ports.${submoduleId}.${portEntry.id}`
      : `...application.ports.${portEntry.id}`;
    const methods = portEntry.methods && portEntry.methods.length ? portEntry.methods : ["execute"];
    const methodLines = methods
      .map((method) => `    def ${method}(self, *args, **kwargs):\n        raise NotImplementedError`)
      .join("\n\n");

    const templatePath = path.join(definition._root, definition.adapter.template);
    const adapterContent = renderTemplate(templatePath, {
      port_import: portImport,
      port_pascal: portEntry.name,
      adapter_pascal: adapterName,
      methods: methodLines,
    });
    writeFile(adapterPath, adapterContent, { ifNotExists: true });

    ensureBinding(moduleEntry, portEntry.name, adapterName, submoduleId || null);
  }

  ensureCapabilityEntry(moduleEntry, {
    id: capabilityId,
    submodule: submoduleId || null,
    port: portEntry ? portEntry.name : null,
    adapter: adapterName,
  });

  saveProject(projectRoot, project);
  applyCapabilities(projectRoot, project);
  regenerateWiring(projectRoot, project);
  recordOperation(projectRoot, {
    cmd: `add capability ${capabilityId}`,
    actions,
  });

  return {
    projectRoot,
    message: `Added capability ${capabilityId} to module ${moduleId}`,
  };
}

module.exports = {
  addCapabilityCommand,
};
