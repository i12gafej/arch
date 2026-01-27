const path = require("path");
const { ensureDir, writeFile } = require("../utils/fs");
const { normalizeName } = require("../utils/naming");
const { findProjectRoot, loadProject, saveProject } = require("../core/project");
const { ensureModule } = require("../core/modules");
const { regenerateWiring } = require("../core/wiring");
const { recordOperation } = require("../core/ops");

function ensurePackageInit(dirPath) {
  ensureDir(dirPath);
  writeFile(path.join(dirPath, "__init__.py"), "", { ifNotExists: true });
}

function addModuleCommand(args, flags = {}) {
  const name = args[0];
  if (!name) {
    throw new Error("Module name is required.");
  }

  const projectRoot = findProjectRoot(process.cwd());
  if (!projectRoot) {
    throw new Error("No .arch/project.json found. Run arch init first.");
  }

  const project = loadProject(projectRoot);
  const normalized = normalizeName(name);
  const moduleEntry = ensureModule(project, normalized.snake, normalized.pascal);
  moduleEntry.apiSurfaces = moduleEntry.apiSurfaces || [];
  if (!moduleEntry.apiSurfaces.some((surface) => surface.type === "http")) {
    moduleEntry.apiSurfaces.push({
      type: "http",
      mount: `/${moduleEntry.id}`,
      routerFile: "delivery/http/router.py",
    });
  }

  const moduleRoot = path.join(projectRoot, project.paths.modulesRoot, moduleEntry.id);
  const dirs = [
    path.join(projectRoot, project.paths.modulesRoot),
    path.join(moduleRoot, "domain"),
    path.join(moduleRoot, "domain", "interfaces"),
    path.join(moduleRoot, "domain", "rules"),
    path.join(moduleRoot, "domain", "services"),
    path.join(moduleRoot, "domain", "value_objects"),
    path.join(moduleRoot, "domain", "entities"),
    path.join(moduleRoot, "application", "use_cases"),
    path.join(moduleRoot, "application", "dtos"),
    path.join(moduleRoot, "application", "ports"),
    path.join(moduleRoot, "application", "services"),
    path.join(moduleRoot, "application", "mappers"),
    path.join(moduleRoot, "infrastructure", "adapters"),
    path.join(moduleRoot, "infrastructure", "services"),
    path.join(moduleRoot, "infrastructure", "db", "sqlalchemy", "models"),
    path.join(moduleRoot, "infrastructure", "db", "sqlalchemy", "mappers"),
    path.join(moduleRoot, "delivery", "http", "routes"),
    path.join(moduleRoot, "bootstrap"),
  ];

  const actions = [
    ...dirs.map((dirPath) => ({ type: "create", path: dirPath })),
    { type: "create", path: path.join(moduleRoot, "README.md") },
    { type: "create", path: path.join(moduleRoot, "bootstrap", "container.py") },
    { type: "create", path: path.join(moduleRoot, "bootstrap", "settings.py") },
    { type: "create", path: path.join(moduleRoot, "delivery", "http", "router.py") },
    { type: "update", path: path.join(projectRoot, ".arch", "project.json") },
    { type: "update", path: path.join(projectRoot, project.paths.deliveryRoot, "app.py") },
  ];

  if (flags.dryRun) {
    return {
      projectRoot,
      plan: actions,
      message: `Plan: add module ${moduleEntry.id}`,
    };
  }

  dirs.forEach((dirPath) => ensureDir(dirPath));

  ensurePackageInit(path.join(projectRoot, project.paths.modulesRoot));
  ensurePackageInit(path.join(moduleRoot));
  ensurePackageInit(path.join(moduleRoot, "domain"));
  ensurePackageInit(path.join(moduleRoot, "domain", "interfaces"));
  ensurePackageInit(path.join(moduleRoot, "domain", "rules"));
  ensurePackageInit(path.join(moduleRoot, "domain", "services"));
  ensurePackageInit(path.join(moduleRoot, "domain", "value_objects"));
  ensurePackageInit(path.join(moduleRoot, "domain", "entities"));
  ensurePackageInit(path.join(moduleRoot, "application"));
  ensurePackageInit(path.join(moduleRoot, "application", "use_cases"));
  ensurePackageInit(path.join(moduleRoot, "application", "dtos"));
  ensurePackageInit(path.join(moduleRoot, "application", "ports"));
  ensurePackageInit(path.join(moduleRoot, "application", "services"));
  ensurePackageInit(path.join(moduleRoot, "application", "mappers"));
  ensurePackageInit(path.join(moduleRoot, "infrastructure"));
  ensurePackageInit(path.join(moduleRoot, "infrastructure", "adapters"));
  ensurePackageInit(path.join(moduleRoot, "infrastructure", "services"));
  ensurePackageInit(path.join(moduleRoot, "infrastructure", "db", "sqlalchemy", "models"));
  ensurePackageInit(path.join(moduleRoot, "infrastructure", "db", "sqlalchemy", "mappers"));
  ensurePackageInit(path.join(moduleRoot, "delivery"));
  ensurePackageInit(path.join(moduleRoot, "delivery", "http"));
  ensurePackageInit(path.join(moduleRoot, "delivery", "http", "routes"));
  ensurePackageInit(path.join(moduleRoot, "bootstrap"));

  const moduleReadme = `# Module ${moduleEntry.name}\n\nClean Architecture module.\n`;
  writeFile(path.join(moduleRoot, "README.md"), moduleReadme, { ifNotExists: true });

  const containerPy = "from __future__ import annotations\n\n# <arch:bindings>\n# </arch:bindings>\n\n# <arch:use_cases>\n# </arch:use_cases>\n";
  writeFile(path.join(moduleRoot, "bootstrap", "container.py"), containerPy, { ifNotExists: true });

  const settingsPy = "from __future__ import annotations\n\n# <arch:settings>\n# </arch:settings>\n";
  writeFile(path.join(moduleRoot, "bootstrap", "settings.py"), settingsPy, { ifNotExists: true });

  const moduleRouterPy = "from fastapi import APIRouter\n\nrouter = APIRouter()\n\n# <arch:routes>\n# </arch:routes>\n";
  writeFile(path.join(moduleRoot, "delivery", "http", "router.py"), moduleRouterPy, {
    ifNotExists: true,
  });

  saveProject(projectRoot, project);
  regenerateWiring(projectRoot, project);
  recordOperation(projectRoot, {
    cmd: `add module ${name}`,
    actions,
  });

  return {
    projectRoot,
    message: `Added module ${moduleEntry.id}`,
  };
}

module.exports = {
  addModuleCommand,
};
