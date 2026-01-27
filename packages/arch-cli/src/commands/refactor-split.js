const fs = require("fs");
const path = require("path");
const { ensureDir, writeFile } = require("../utils/fs");
const { normalizeName } = require("../utils/naming");
const { findProjectRoot, loadProject, saveProject } = require("../core/project");
const { ensureSubmodule, getModule } = require("../core/modules");
const { regenerateWiring } = require("../core/wiring");
const { recordOperation } = require("../core/ops");

function ensurePackageInit(dirPath) {
  ensureDir(dirPath);
  writeFile(path.join(dirPath, "__init__.py"), "", { ifNotExists: true });
}

function matchSubmodule(id, submodules) {
  return submodules.find((sub) => id.startsWith(`${sub}_`)) || null;
}

function toKebab(snake) {
  return snake.replace(/_/g, "-");
}

function moveFileIfExists(fromPath, toPath, actions) {
  if (!fs.existsSync(fromPath)) {
    return;
  }
  ensureDir(path.dirname(toPath));
  actions.push({ type: "move", from: fromPath, to: toPath });
}

function applyMoves(actions) {
  actions
    .filter((action) => action.type === "move")
    .forEach((action) => {
      ensureDir(path.dirname(action.to));
      fs.renameSync(action.from, action.to);
    });
}

function refactorSplitCommand(args, flags = {}) {
  const moduleArg = args[0];
  if (!moduleArg) {
    throw new Error("Module is required.");
  }
  const by = flags.by || "prefix";
  const into = flags.into || "";
  if (!into) {
    throw new Error("--into is required. Example: --into auth,users");
  }
  if (by !== "prefix") {
    throw new Error("Only --by prefix is supported in MVP.");
  }

  const dryRun = flags.dryRun || false;

  const projectRoot = findProjectRoot(process.cwd());
  if (!projectRoot) {
    throw new Error("No .arch/project.json found. Run arch init first.");
  }

  const project = loadProject(projectRoot);
  const moduleId = normalizeName(moduleArg).snake;
  const moduleEntry = getModule(project, moduleId);

  const submodules = into
    .split(",")
    .map((part) => normalizeName(part).snake)
    .filter(Boolean);

  submodules.forEach((submoduleId) => {
    ensureSubmodule(moduleEntry, submoduleId, submoduleId);
  });

  const moduleRoot = path.join(projectRoot, project.paths.modulesRoot, moduleId);
  const actions = [];

  moduleEntry.useCases.forEach((useCase) => {
    if (useCase.submodule) {
      return;
    }
    const submoduleId = matchSubmodule(useCase.id, submodules);
    if (!submoduleId) {
      return;
    }
    useCase.submodule = submoduleId;
    useCase.route = `/${submoduleId}/${toKebab(useCase.id)}`;

    const useCaseFrom = path.join(moduleRoot, "application", "use_cases", `${useCase.id}.py`);
    const dtoFrom = path.join(moduleRoot, "application", "dtos", `${useCase.id}.py`);
    const routeFrom = path.join(moduleRoot, "delivery", "http", "routes", `${useCase.id}.py`);
    const testFrom = path.join(projectRoot, "tests", "unit", moduleId, `test_${useCase.id}.py`);

    const useCaseTo = path.join(moduleRoot, "application", "use_cases", submoduleId, `${useCase.id}.py`);
    const dtoTo = path.join(moduleRoot, "application", "dtos", submoduleId, `${useCase.id}.py`);
    const routeTo = path.join(moduleRoot, "delivery", "http", "routes", submoduleId, `${useCase.id}.py`);
    const testTo = path.join(projectRoot, "tests", "unit", moduleId, submoduleId, `test_${useCase.id}.py`);

    ensurePackageInit(path.join(moduleRoot, "application", "use_cases", submoduleId));
    ensurePackageInit(path.join(moduleRoot, "application", "dtos", submoduleId));
    ensurePackageInit(path.join(moduleRoot, "delivery", "http", "routes", submoduleId));
    ensureDir(path.join(projectRoot, "tests", "unit", moduleId, submoduleId));

    moveFileIfExists(useCaseFrom, useCaseTo, actions);
    moveFileIfExists(dtoFrom, dtoTo, actions);
    moveFileIfExists(routeFrom, routeTo, actions);
    moveFileIfExists(testFrom, testTo, actions);
  });

  moduleEntry.ports.forEach((port) => {
    if (port.submodule) {
      return;
    }
    const submoduleId = matchSubmodule(port.id, submodules);
    if (!submoduleId) {
      return;
    }
    port.submodule = submoduleId;

    const portFrom = path.join(moduleRoot, "application", "ports", `${port.id}.py`);
    const portTo = path.join(moduleRoot, "application", "ports", submoduleId, `${port.id}.py`);

    ensurePackageInit(path.join(moduleRoot, "application", "ports", submoduleId));
    moveFileIfExists(portFrom, portTo, actions);
  });

  moduleEntry.rules.forEach((rule) => {
    if (rule.submodule) {
      return;
    }
    const submoduleId = matchSubmodule(rule.id, submodules);
    if (!submoduleId) {
      return;
    }
    rule.submodule = submoduleId;

    const ruleFrom = path.join(moduleRoot, "domain", "rules", `${rule.id}.py`);
    const ruleTo = path.join(moduleRoot, "domain", "rules", submoduleId, `${rule.id}.py`);

    ensurePackageInit(path.join(moduleRoot, "domain", "rules", submoduleId));
    moveFileIfExists(ruleFrom, ruleTo, actions);
  });

  moduleEntry.bindings.forEach((binding) => {
    const portEntry = moduleEntry.ports.find((port) => port.name === binding.port);
    if (!portEntry || !portEntry.submodule) {
      return;
    }
    binding.submodule = portEntry.submodule;

    const adapterFile = binding.adapter.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
    const adapterFrom = path.join(moduleRoot, "infrastructure", "adapters", `${adapterFile}.py`);
    const adapterTo = path.join(
      moduleRoot,
      "infrastructure",
      "adapters",
      binding.submodule,
      `${adapterFile}.py`
    );

    ensurePackageInit(path.join(moduleRoot, "infrastructure", "adapters", binding.submodule));
    moveFileIfExists(adapterFrom, adapterTo, actions);
  });

  actions.push({ type: "update", path: path.join(projectRoot, ".arch", "project.json") });
  actions.push({ type: "update", path: path.join(moduleRoot, "bootstrap", "container.py") });
  actions.push({ type: "update", path: path.join(projectRoot, project.paths.deliveryRoot, "app.py") });

  if (dryRun) {
    return {
      projectRoot,
      plan: actions,
      message: `Plan: refactor split ${moduleId} into ${submodules.join(",")}`,
    };
  }

  applyMoves(actions);
  saveProject(projectRoot, project);
  regenerateWiring(projectRoot, project);
  recordOperation(projectRoot, {
    cmd: `refactor split ${moduleId} --into ${submodules.join(",")}`,
    actions,
  });

  return {
    projectRoot,
    message: `Refactor split completed for ${moduleId}`,
  };
}

module.exports = {
  refactorSplitCommand,
};
