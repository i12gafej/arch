const path = require("path");
const { upsertRegion } = require("../utils/fs");
const { buildGetterName } = require("../utils/naming");

function toSnake(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

function buildBindingsRegion(moduleEntry) {
  if (!moduleEntry.bindings || moduleEntry.bindings.length === 0) {
    return "";
  }
  const lines = [];
  moduleEntry.bindings.forEach((binding) => {
    const adapterFile = toSnake(binding.adapter);
    const adapterPath = binding.submodule
      ? `..infrastructure.adapters.${binding.submodule}.${adapterFile}`
      : `..infrastructure.adapters.${adapterFile}`;
    lines.push(`from ${adapterPath} import ${binding.adapter}`);
    lines.push("");
    const fnName = buildGetterName(binding.submodule, toSnake(binding.port));
    lines.push(`def get_${fnName}() -> ${binding.adapter}:`);
    lines.push(`    return ${binding.adapter}()`);
    lines.push("");
  });
  return lines.join("\n").trimEnd();
}

function buildUseCasesRegion(moduleEntry) {
  if (!moduleEntry.useCases || moduleEntry.useCases.length === 0) {
    return "";
  }
  const lines = [];
  moduleEntry.useCases.forEach((useCase) => {
    const useCasePath = useCase.submodule
      ? `..application.use_cases.${useCase.submodule}.${useCase.id}`
      : `..application.use_cases.${useCase.id}`;
    lines.push(`from ${useCasePath} import ${useCase.name}`);
    lines.push("");
    const fnName = buildGetterName(useCase.submodule, useCase.id);
    lines.push(`def get_${fnName}() -> ${useCase.name}:`);
    lines.push(`    return ${useCase.name}()`);
    lines.push("");
  });
  return lines.join("\n").trimEnd();
}

function buildModuleRoutesRegion(moduleId, moduleEntry) {
  if (!moduleEntry.useCases || moduleEntry.useCases.length === 0) {
    return "";
  }
  const lines = [];
  moduleEntry.useCases.forEach((useCase) => {
    if (!useCase.route) {
      return;
    }
    const routePath = useCase.submodule
      ? `.routes.${useCase.submodule}.${useCase.id}`
      : `.routes.${useCase.id}`;
    const aliasParts = [moduleId, useCase.submodule, useCase.id].filter(Boolean);
    const alias = `${aliasParts.join("_")}_router`;
    lines.push(`from ${routePath} import router as ${alias}`);
    lines.push(`router.include_router(${alias})`);
    lines.push("");
  });
  return lines.join("\n").trimEnd();
}

function buildRoutesImports(project) {
  const lines = [];
  Object.entries(project.modules).forEach(([moduleId, moduleEntry]) => {
    (moduleEntry.apiSurfaces || []).forEach((surface) => {
      if (surface.type !== "http") {
        return;
      }
      const routerFile = surface.routerFile || "delivery/http/router.py";
      const importPath = `modules.${moduleId}.${routerFile.replace(/\.py$/, "").replace(/[\\/]/g, ".")}`;
      const alias = `${moduleId}_router`;
      lines.push(`from ${importPath} import router as ${alias}`);
    });
  });
  return lines.join("\n");
}

function buildRoutesIncludes(project) {
  const lines = [];
  Object.entries(project.modules).forEach(([moduleId, moduleEntry]) => {
    (moduleEntry.apiSurfaces || []).forEach((surface) => {
      if (surface.type !== "http") {
        return;
      }
      const alias = `${moduleId}_router`;
      const mount = surface.mount || `/${moduleId}`;
      lines.push(`app.include_router(${alias}, prefix="${mount}")`);
    });
  });
  return lines.join("\n");
}

function regenerateWiring(projectRoot, project) {
  const modulesRoot = path.join(projectRoot, project.paths.modulesRoot);
  Object.entries(project.modules).forEach(([moduleId, moduleEntry]) => {
    const moduleRoot = path.join(modulesRoot, moduleId);
    const containerPath = path.join(moduleRoot, "bootstrap", "container.py");
    upsertRegion(containerPath, "bindings", buildBindingsRegion(moduleEntry));
    upsertRegion(containerPath, "use_cases", buildUseCasesRegion(moduleEntry));

    const routerPath = path.join(moduleRoot, "delivery", "http", "router.py");
    if (moduleEntry.apiSurfaces && moduleEntry.apiSurfaces.some((s) => s.type === "http")) {
      upsertRegion(routerPath, "routes", buildModuleRoutesRegion(moduleId, moduleEntry));
    }
  });

  const appPath = path.join(projectRoot, project.paths.deliveryRoot, "app.py");
  upsertRegion(appPath, "routes:imports", buildRoutesImports(project));
  upsertRegion(appPath, "routes:include", buildRoutesIncludes(project));
}

module.exports = {
  regenerateWiring,
};
