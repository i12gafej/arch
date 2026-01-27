const path = require("path");
const { ensureDir, writeFile } = require("../utils/fs");
const { normalizeQualified, buildGetterName } = require("../utils/naming");
const { findProjectRoot, loadProject, saveProject } = require("../core/project");
const { ensureSubmodule, getModule } = require("../core/modules");
const { regenerateWiring } = require("../core/wiring");
const { recordOperation } = require("../core/ops");

function ensureUseCase(moduleEntry, normalized, submoduleId) {
  const exists = moduleEntry.useCases.some(
    (uc) => uc.id === normalized.snake && uc.submodule === submoduleId
  );
  if (!exists) {
    const routePrefix = submoduleId ? `/${submoduleId}` : "";
    moduleEntry.useCases.push({
      id: normalized.snake,
      name: normalized.pascal,
      submodule: submoduleId || null,
      route: routePrefix ? `${routePrefix}/${normalized.kebab}` : `/${normalized.kebab}`,
    });
  }
}

function ensurePackageInit(dirPath) {
  ensureDir(dirPath);
  writeFile(path.join(dirPath, "__init__.py"), "", { ifNotExists: true });
}

function addUseCaseCommand(args, flags = {}) {
  const name = args[0];
  if (!name) {
    throw new Error("Use-case name is required.");
  }

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

  moduleEntry.useCases = moduleEntry.useCases || [];
  ensureUseCase(moduleEntry, qualified.name, submoduleId);
  moduleEntry.dtos = moduleEntry.dtos || [];
  const dtoRequestId = `${qualified.name.snake}_request`;
  const dtoResponseId = `${qualified.name.snake}_response`;
  if (!moduleEntry.dtos.some((dto) => dto.id === dtoRequestId && dto.submodule === (submoduleId || null))) {
    moduleEntry.dtos.push({
      id: dtoRequestId,
      name: `${qualified.name.pascal}Request`,
      submodule: submoduleId || null,
    });
  }
  if (!moduleEntry.dtos.some((dto) => dto.id === dtoResponseId && dto.submodule === (submoduleId || null))) {
    moduleEntry.dtos.push({
      id: dtoResponseId,
      name: `${qualified.name.pascal}Response`,
      submodule: submoduleId || null,
    });
  }

  const moduleRoot = path.join(projectRoot, project.paths.modulesRoot, moduleId);
  const useCasesDir = path.join(moduleRoot, "application", "use_cases", submoduleId || "");
  const dtosDir = path.join(moduleRoot, "application", "dtos", submoduleId || "");
  const routesDir = path.join(moduleRoot, "delivery", "http", "routes", submoduleId || "");
  const testsDir = path.join(projectRoot, "tests", "unit", moduleId, submoduleId || "");

  ensurePackageInit(useCasesDir);
  ensurePackageInit(dtosDir);
  ensureDir(testsDir);

  const useCasePath = path.join(useCasesDir, `${qualified.name.snake}.py`);
  const dtoPath = path.join(dtosDir, `${qualified.name.snake}.py`);
  const testPath = path.join(testsDir, `test_${qualified.name.snake}.py`);

  const dtoImport = submoduleId
    ? `..dtos.${submoduleId}.${qualified.name.snake}`
    : `..dtos.${qualified.name.snake}`;

  const dtoContent = `from pydantic import BaseModel\n\n\nclass ${qualified.name.pascal}Request(BaseModel):\n    pass\n\n\nclass ${qualified.name.pascal}Response(BaseModel):\n    pass\n`;

  const useCaseContent = `from __future__ import annotations\n\nfrom ${dtoImport} import ${qualified.name.pascal}Request, ${qualified.name.pascal}Response\n\n\nclass ${qualified.name.pascal}:\n    def execute(self, request: ${qualified.name.pascal}Request) -> ${qualified.name.pascal}Response:\n        raise NotImplementedError\n`;

  const testContent = `from modules.${moduleId}.application.use_cases.${submoduleId ? `${submoduleId}.` : ""}${qualified.name.snake} import ${qualified.name.pascal}\n\n\ndef test_${qualified.name.snake}_stub() -> None:\n    use_case = ${qualified.name.pascal}()\n    assert use_case is not None\n`;

  const actions = [
    { type: "create", path: dtoPath },
    { type: "create", path: useCasePath },
    { type: "create", path: testPath },
    { type: "update", path: path.join(projectRoot, ".arch", "project.json") },
    { type: "update", path: path.join(moduleRoot, "bootstrap", "container.py") },
  ];

  const hasHttpSurface = (moduleEntry.apiSurfaces || []).some((surface) => surface.type === "http");
  let routePath = null;
  if (hasHttpSurface) {
    ensurePackageInit(routesDir);
    routePath = path.join(routesDir, `${qualified.name.snake}.py`);
    actions.push({ type: "create", path: routePath });
    actions.push({
      type: "update",
      path: path.join(moduleRoot, "delivery", "http", "router.py"),
    });
    actions.push({ type: "update", path: path.join(projectRoot, project.paths.deliveryRoot, "app.py") });
  }

  if (flags.dryRun) {
    return {
      projectRoot,
      plan: actions,
      message: `Plan: add use-case ${qualified.name.pascal} in module ${moduleId}`,
    };
  }

  writeFile(dtoPath, dtoContent, { ifNotExists: true });
  writeFile(useCasePath, useCaseContent, { ifNotExists: true });
  writeFile(testPath, testContent, { ifNotExists: true });

  if (hasHttpSurface && routePath) {
    const getterName = buildGetterName(submoduleId, qualified.name.snake);
    const routePathSuffix = submoduleId
      ? `/${submoduleId}/${qualified.name.kebab}`
      : `/${qualified.name.kebab}`;
    const routeDtoImport = submoduleId
      ? `....application.dtos.${submoduleId}.${qualified.name.snake}`
      : `....application.dtos.${qualified.name.snake}`;

    const routeContent = `from fastapi import APIRouter\n\nfrom ....bootstrap.container import get_${getterName}\nfrom ${routeDtoImport} import ${qualified.name.pascal}Request, ${qualified.name.pascal}Response\n\nrouter = APIRouter()\n\n\n@router.post(\"${routePathSuffix}\", response_model=${qualified.name.pascal}Response)\ndef ${qualified.name.snake}(request: ${qualified.name.pascal}Request) -> ${qualified.name.pascal}Response:\n    use_case = get_${getterName}()\n    return use_case.execute(request)\n`;

    writeFile(routePath, routeContent, { ifNotExists: true });
  }

  saveProject(projectRoot, project);
  regenerateWiring(projectRoot, project);
  recordOperation(projectRoot, {
    cmd: `add use-case ${name}`,
    actions,
  });

  return {
    projectRoot,
    message: `Added use-case ${qualified.name.pascal} in module ${moduleId}`,
  };
}

module.exports = {
  addUseCaseCommand,
};
