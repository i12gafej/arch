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

function addSubmoduleCommand(args, flags = {}) {
  const name = args[0];
  if (!name) {
    throw new Error("Submodule name is required (module.submodule).");
  }

  const projectRoot = findProjectRoot(process.cwd());
  if (!projectRoot) {
    throw new Error("No .arch/project.json found. Run arch init first.");
  }

  const project = loadProject(projectRoot);
  const qualified = normalizeQualified(name);

  if (!qualified.module || qualified.submodule) {
    throw new Error("Submodule must be in the form <module>.<submodule>.");
  }

  const moduleId = qualified.module.snake;
  const submoduleId = qualified.name.snake;
  const submoduleLabel = qualified.name.pascal;

  const moduleEntry = getModule(project, moduleId);
  ensureSubmodule(moduleEntry, submoduleId, submoduleLabel);

  const moduleRoot = path.join(projectRoot, project.paths.modulesRoot, moduleId);

  const dirs = [
    path.join(moduleRoot, "application", "use_cases", submoduleId),
    path.join(moduleRoot, "application", "dtos", submoduleId),
    path.join(moduleRoot, "application", "ports", submoduleId),
    path.join(moduleRoot, "application", "services", submoduleId),
    path.join(moduleRoot, "application", "mappers", submoduleId),
    path.join(moduleRoot, "domain", "interfaces", submoduleId),
    path.join(moduleRoot, "domain", "rules", submoduleId),
    path.join(moduleRoot, "domain", "services", submoduleId),
    path.join(moduleRoot, "domain", "value_objects", submoduleId),
    path.join(moduleRoot, "domain", "entities", submoduleId),
    path.join(moduleRoot, "delivery", "http", "routes", submoduleId),
    path.join(moduleRoot, "infrastructure", "adapters", submoduleId),
    path.join(moduleRoot, "infrastructure", "services", submoduleId),
    path.join(moduleRoot, "infrastructure", "db", "sqlalchemy", "models", submoduleId),
    path.join(moduleRoot, "infrastructure", "db", "sqlalchemy", "mappers", submoduleId),
    path.join(moduleRoot, "submodules", submoduleId),
  ];

  const actions = [
    ...dirs.map((dirPath) => ({ type: "create", path: dirPath })),
    { type: "create", path: path.join(moduleRoot, "submodules", submoduleId, "README.md") },
    { type: "update", path: path.join(projectRoot, ".arch", "project.json") },
  ];

  if (flags.dryRun) {
    return {
      projectRoot,
      plan: actions,
      message: `Plan: add submodule ${moduleId}.${submoduleId}`,
    };
  }

  dirs.forEach((dirPath) => ensureDir(dirPath));

  ensurePackageInit(path.join(moduleRoot, "application", "use_cases", submoduleId));
  ensurePackageInit(path.join(moduleRoot, "application", "dtos", submoduleId));
  ensurePackageInit(path.join(moduleRoot, "application", "ports", submoduleId));
  ensurePackageInit(path.join(moduleRoot, "application", "services", submoduleId));
  ensurePackageInit(path.join(moduleRoot, "application", "mappers", submoduleId));
  ensurePackageInit(path.join(moduleRoot, "domain", "interfaces", submoduleId));
  ensurePackageInit(path.join(moduleRoot, "domain", "rules", submoduleId));
  ensurePackageInit(path.join(moduleRoot, "domain", "services", submoduleId));
  ensurePackageInit(path.join(moduleRoot, "domain", "value_objects", submoduleId));
  ensurePackageInit(path.join(moduleRoot, "domain", "entities", submoduleId));
  ensurePackageInit(path.join(moduleRoot, "delivery", "http", "routes", submoduleId));
  ensurePackageInit(path.join(moduleRoot, "infrastructure", "adapters", submoduleId));
  ensurePackageInit(path.join(moduleRoot, "infrastructure", "services", submoduleId));
  ensurePackageInit(path.join(moduleRoot, "infrastructure", "db", "sqlalchemy", "models", submoduleId));
  ensurePackageInit(path.join(moduleRoot, "infrastructure", "db", "sqlalchemy", "mappers", submoduleId));

  const submoduleReadme = `# Submodule ${submoduleLabel}\n\nFeature-area within module ${moduleEntry.name}.\n`;
  writeFile(
    path.join(moduleRoot, "submodules", submoduleId, "README.md"),
    submoduleReadme,
    { ifNotExists: true }
  );

  saveProject(projectRoot, project);
  recordOperation(projectRoot, {
    cmd: `add submodule ${moduleId}.${submoduleId}`,
    actions,
  });

  return {
    projectRoot,
    message: `Added submodule ${moduleId}.${submoduleId}`,
  };
}

module.exports = {
  addSubmoduleCommand,
};
