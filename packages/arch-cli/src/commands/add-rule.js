const path = require("path");
const { ensureDir, writeFile } = require("../utils/fs");
const { normalizeQualified } = require("../utils/naming");
const { findProjectRoot, loadProject, saveProject } = require("../core/project");
const { ensureSubmodule, getModule } = require("../core/modules");
const { recordOperation } = require("../core/ops");

function ensureRule(moduleEntry, normalized, submoduleId) {
  const exists = moduleEntry.rules.some(
    (rule) => rule.id === normalized.snake && rule.submodule === submoduleId
  );
  if (!exists) {
    moduleEntry.rules.push({
      id: normalized.snake,
      name: normalized.pascal,
      submodule: submoduleId || null,
    });
  }
}

function ensurePackageInit(dirPath) {
  ensureDir(dirPath);
  writeFile(path.join(dirPath, "__init__.py"), "", { ifNotExists: true });
}

function addRuleCommand(args, flags = {}) {
  const name = args[0];
  if (!name) {
    throw new Error("Rule name is required.");
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

  ensureRule(moduleEntry, qualified.name, submoduleId);

  const moduleRoot = path.join(projectRoot, project.paths.modulesRoot, moduleId);
  const rulesDir = path.join(moduleRoot, "domain", "rules", submoduleId || "");
  ensurePackageInit(rulesDir);

  const rulePath = path.join(rulesDir, `${qualified.name.snake}.py`);

  const ruleContent = `from __future__ import annotations\n\n\nclass ${qualified.name.pascal}:\n    def validate(self, *args, **kwargs) -> None:\n        raise NotImplementedError\n`;

  const actions = [
    { type: "create", path: rulePath },
    { type: "update", path: path.join(projectRoot, ".arch", "project.json") },
  ];

  if (dryRun) {
    return {
      projectRoot,
      plan: actions,
      message: `Plan: add rule ${qualified.name.pascal} in module ${moduleId}`,
    };
  }

  writeFile(rulePath, ruleContent, { ifNotExists: true });

  saveProject(projectRoot, project);
  recordOperation(projectRoot, {
    cmd: `add rule ${name}`,
    actions,
  });

  return {
    projectRoot,
    message: `Added rule ${qualified.name.pascal} in module ${moduleId}`,
  };
}

module.exports = {
  addRuleCommand,
};
