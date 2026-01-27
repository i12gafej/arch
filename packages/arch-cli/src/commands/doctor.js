const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");
const { findProjectRoot, loadProject } = require("../core/project");
const { buildGetterName } = require("../utils/naming");
const { loadCapability } = require("../core/capabilities");

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function toSnake(name) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isAllowed(filePath, ruleId) {
  if (!filePath || !fileExists(filePath)) {
    return false;
  }
  const text = readFile(filePath);
  const re = new RegExp(`arch:allow\\s+rule\\s*=\\s*${escapeRegExp(ruleId)}`);
  return re.test(text);
}

function isExempted(project, ruleId, filePath) {
  if (!project.exemptions || project.exemptions.length === 0) {
    return false;
  }
  return project.exemptions.some((exemption) => {
    if (exemption.rule !== ruleId) {
      return false;
    }
    if (!filePath || !exemption.path) {
      return true;
    }
    return filePath.replace(/\\/g, "/").startsWith(exemption.path);
  });
}

function addIssue(issues, issue, project) {
  if (issue.path && (isAllowed(issue.path, issue.rule) || isExempted(project, issue.rule, issue.path))) {
    if (issue.level === "error") {
      issues.push({ ...issue, level: "warning", message: `${issue.message} (allowed)` });
    }
    return;
  }
  issues.push(issue);
}

function listPythonFiles(rootDir) {
  const results = [];
  const stack = [rootDir];
  while (stack.length) {
    const current = stack.pop();
    if (!fileExists(current)) {
      continue;
    }
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(current);
      entries.forEach((entry) => stack.push(path.join(current, entry)));
    } else if (current.endsWith(".py")) {
      results.push(current);
    }
  }
  return results;
}

function getLayer(relativePath) {
  const parts = relativePath.split(path.sep).filter(Boolean);
  return parts[0] || null;
}

function checkLayering(issues, project, moduleId, moduleRoot) {
  const files = listPythonFiles(moduleRoot);
  files.forEach((filePath) => {
    const rel = path.relative(moduleRoot, filePath);
    const layer = getLayer(rel);
    if (!layer) {
      return;
    }
    const content = readFile(filePath);
    const importRe = new RegExp(`^(from|import)\\s+modules\\.${moduleId}\\.([a-z_]+)`, "gm");
    let match;
    while ((match = importRe.exec(content)) !== null) {
      const importedLayer = match[2];
      if (layer === "domain" && ["infrastructure", "delivery", "bootstrap"].includes(importedLayer)) {
        addIssue(
          issues,
          {
            level: "error",
            rule: `layering.domain_no_${importedLayer}`,
            message: `Domain imports ${importedLayer}: ${filePath}`,
            path: filePath,
          },
          project
        );
      }
      if (layer === "domain" && importedLayer === "application") {
        addIssue(
          issues,
          {
            level: "error",
            rule: "layering.domain_no_application",
            message: `Domain imports application: ${filePath}`,
            path: filePath,
          },
          project
        );
      }
      if (layer === "application" && importedLayer === "delivery") {
        addIssue(
          issues,
          {
            level: "error",
            rule: "layering.application_no_delivery",
            message: `Application imports delivery: ${filePath}`,
            path: filePath,
          },
          project
        );
      }
      if (layer === "application" && importedLayer === "infrastructure") {
        addIssue(
          issues,
          {
            level: "error",
            rule: "layering.application_no_infrastructure",
            message: `Application imports infrastructure: ${filePath}`,
            path: filePath,
          },
          project
        );
      }
      if (layer === "delivery" && ["infrastructure"].includes(importedLayer)) {
        addIssue(
          issues,
          {
            level: "error",
            rule: "layering.delivery_no_infrastructure",
            message: `Delivery imports infrastructure: ${filePath}`,
            path: filePath,
          },
          project
        );
      }
    }
  });
}

function checkPortDependencies(issues, project, moduleId, moduleRoot) {
  const portsDir = path.join(moduleRoot, "application", "ports");
  const files = listPythonFiles(portsDir);
  files.forEach((filePath) => {
    const content = readFile(filePath);
    const importRe = new RegExp(`^(from|import)\\s+modules\\.${moduleId}\\.(infrastructure|delivery)`, "gm");
    if (importRe.test(content)) {
      addIssue(
        issues,
        {
          level: "error",
          rule: "ports.no_infra_delivery",
          message: `Port imports infrastructure/delivery: ${filePath}`,
          path: filePath,
        },
        project
      );
    }
  });
}

function checkDeliveryHeuristics(issues, project, moduleId, moduleRoot) {
  const deliveryDir = path.join(moduleRoot, "delivery", "http", "routes");
  const files = listPythonFiles(deliveryDir);
  files.forEach((filePath) => {
    const content = readFile(filePath);
    const lineCount = content.split(/\\r?\\n/).length;
    if (lineCount > project.settings.maxDeliveryLines) {
      addIssue(
        issues,
        {
          level: "warning",
          rule: "delivery.too_large",
          message: `Delivery file too large (${lineCount} lines): ${filePath}`,
          path: filePath,
        },
        project
      );
    }
    const domainImport = new RegExp(`^(from|import)\\s+modules\\.${moduleId}\\.domain`, "gm");
    if (domainImport.test(content)) {
      addIssue(
        issues,
        {
          level: "warning",
          rule: "delivery.domain_logic",
          message: `Delivery imports domain (potential business logic): ${filePath}`,
          path: filePath,
        },
        project
      );
    }
  });
}

function checkThresholds(issues, project, moduleRoot) {
  const fileMap = new Map();
  const files = listPythonFiles(moduleRoot);
  files.forEach((filePath) => {
    const dir = path.dirname(filePath);
    fileMap.set(dir, (fileMap.get(dir) || 0) + 1);
    const content = readFile(filePath);
    const lineCount = content.split(/\r?\n/).length;
    if (lineCount > project.settings.maxFileLines) {
      addIssue(
        issues,
        {
          level: "warning",
          rule: "scaling.file_too_large",
          message: `File has ${lineCount} lines (>${project.settings.maxFileLines}): ${filePath}`,
          path: filePath,
        },
        project
      );
    }
  });

  fileMap.forEach((count, dir) => {
    if (count > project.settings.maxFilesPerFolder) {
      addIssue(
        issues,
        {
          level: "warning",
          rule: "scaling.too_many_files",
          message: `Folder has ${count} python files (>${project.settings.maxFilesPerFolder}): ${dir}`,
          path: dir,
        },
        project
      );
    }
  });
}

function checkWiring(issues, project, moduleId, moduleEntry, moduleRoot) {
  if (!fileExists(moduleRoot)) {
    addIssue(
      issues,
      {
        level: "error",
        rule: "module.missing_root",
        message: `Missing module root: ${moduleRoot}`,
      },
      project
    );
    return;
  }
  const hasHttpSurface = moduleEntry.apiSurfaces && moduleEntry.apiSurfaces.some((s) => s.type === "http");
  moduleEntry.useCases.forEach((useCase) => {
    const useCasePath = path.join(
      moduleRoot,
      "application",
      "use_cases",
      useCase.submodule || "",
      `${useCase.id}.py`
    );
    const dtoPath = path.join(
      moduleRoot,
      "application",
      "dtos",
      useCase.submodule || "",
      `${useCase.id}.py`
    );
    const routePath = path.join(
      moduleRoot,
      "delivery",
      "http",
      "routes",
      useCase.submodule || "",
      `${useCase.id}.py`
    );

    if (!fileExists(useCasePath)) {
      addIssue(
        issues,
        {
          level: "error",
          rule: "wiring.missing_usecase_file",
          message: `Missing use-case file: ${useCasePath}`,
          path: useCasePath,
        },
        project
      );
    }
    if (!fileExists(dtoPath)) {
      addIssue(
        issues,
        {
          level: "error",
          rule: "wiring.missing_dto_file",
          message: `Missing DTO file: ${dtoPath}`,
          path: dtoPath,
        },
        project
      );
    }
    if (hasHttpSurface && !fileExists(routePath)) {
      addIssue(
        issues,
        {
          level: "error",
          rule: "wiring.missing_route_file",
          message: `Missing route file: ${routePath}`,
          path: routePath,
        },
        project
      );
    }
  });

  moduleEntry.ports.forEach((port) => {
    const portPath = path.join(
      moduleRoot,
      "application",
      "ports",
      port.submodule || "",
      `${port.id}.py`
    );
    if (!fileExists(portPath)) {
      addIssue(
        issues,
        {
          level: "error",
          rule: "wiring.missing_port_file",
          message: `Missing port file: ${portPath}`,
          path: portPath,
        },
        project
      );
    }
  });

  moduleEntry.bindings.forEach((binding) => {
    const adapterFile = binding.adapter.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
    const adapterPath = path.join(
      moduleRoot,
      "infrastructure",
      "adapters",
      binding.submodule || "",
      `${adapterFile}.py`
    );
    if (!fileExists(adapterPath)) {
      addIssue(
        issues,
        {
          level: "error",
          rule: "wiring.missing_adapter_file",
          message: `Missing adapter file: ${adapterPath}`,
          path: adapterPath,
        },
        project
      );
    }
  });

  moduleEntry.ports.forEach((port) => {
    const bound = moduleEntry.bindings.some(
      (binding) => binding.port === port.name && binding.submodule === port.submodule
    );
    if (!bound) {
      addIssue(
        issues,
        {
          level: "error",
          rule: "wiring.port_unbound",
          message: `Port not bound: ${moduleId}.${port.submodule ? `${port.submodule}.` : ""}${port.name}`,
        },
        project
      );
    }
  });

  const containerPath = path.join(moduleRoot, "bootstrap", "container.py");
  if (!fileExists(containerPath)) {
    addIssue(
      issues,
      {
        level: "error",
        rule: "wiring.missing_container",
        message: `Missing container: ${containerPath}`,
      },
      project
    );
  } else {
    const content = readFile(containerPath);
    if (!content.includes("# <arch:bindings>") || !content.includes("# </arch:bindings>")) {
      addIssue(
        issues,
        {
          level: "warning",
          rule: "wiring.missing_bindings_region",
          message: `Missing bindings region in ${containerPath}`,
          path: containerPath,
        },
        project
      );
    }
    if (!content.includes("# <arch:use_cases>") || !content.includes("# </arch:use_cases>")) {
      addIssue(
        issues,
        {
          level: "warning",
          rule: "wiring.missing_use_cases_region",
          message: `Missing use_cases region in ${containerPath}`,
          path: containerPath,
        },
        project
      );
    }

    moduleEntry.useCases.forEach((useCase) => {
      const getterName = buildGetterName(useCase.submodule, useCase.id);
      const getterRe = new RegExp(`def\\s+get_${getterName}\\b`);
      if (!getterRe.test(content)) {
        addIssue(
          issues,
          {
            level: "warning",
            rule: "wiring.use_case_not_registered",
            message: `Use-case not registered in container: ${moduleId}.${getterName}`,
            path: containerPath,
          },
          project
        );
      }
    });

    moduleEntry.bindings.forEach((binding) => {
      const getterName = buildGetterName(binding.submodule, toSnake(binding.port));
      const getterRe = new RegExp(`def\\s+get_${getterName}\\b`);
      if (!getterRe.test(content)) {
        addIssue(
          issues,
          {
            level: "warning",
            rule: "wiring.binding_not_registered",
            message: `Binding not registered in container: ${moduleId}.${binding.port}`,
            path: containerPath,
          },
          project
        );
      }
    });
  }

  if (moduleEntry.apiSurfaces && moduleEntry.apiSurfaces.some((surface) => surface.type === "http")) {
    const routerPath = path.join(moduleRoot, "delivery", "http", "router.py");
    if (!fileExists(routerPath)) {
      addIssue(
        issues,
        {
          level: "warning",
          rule: "wiring.missing_module_router",
          message: `Missing module router: ${routerPath}`,
          path: routerPath,
        },
        project
      );
    } else {
      const routerContent = readFile(routerPath);
      if (!routerContent.includes("# <arch:routes>") || !routerContent.includes("# </arch:routes>")) {
        addIssue(
          issues,
          {
            level: "warning",
            rule: "wiring.missing_module_routes_region",
            message: `Missing routes region in ${routerPath}`,
            path: routerPath,
          },
          project
        );
      }
    }
  }
}

function checkAppMarkers(issues, project, projectRoot) {
  const appPath = path.join(projectRoot, project.paths.deliveryRoot, "app.py");
  if (!fileExists(appPath)) {
    addIssue(
      issues,
      {
        level: "error",
        rule: "wiring.missing_app",
        message: `Missing app: ${appPath}`,
      },
      project
    );
    return;
  }
  const content = readFile(appPath);
  if (!content.includes("# <arch:routes:imports>") || !content.includes("# </arch:routes:imports>")) {
    addIssue(
      issues,
      {
        level: "warning",
        rule: "wiring.missing_routes_imports_region",
        message: `Missing routes imports region in ${appPath}`,
        path: appPath,
      },
      project
    );
  }
  if (!content.includes("# <arch:routes:include>") || !content.includes("# </arch:routes:include>")) {
    addIssue(
      issues,
      {
        level: "warning",
        rule: "wiring.missing_routes_include_region",
        message: `Missing routes include region in ${appPath}`,
        path: appPath,
      },
      project
    );
  }
}

function checkSettingsMarkers(issues, project, moduleRoot) {
  const settingsPath = path.join(moduleRoot, "bootstrap", "settings.py");
  if (!fileExists(settingsPath)) {
    addIssue(
      issues,
      {
        level: "warning",
        rule: "wiring.missing_settings",
        message: `Missing settings: ${settingsPath}`,
        path: settingsPath,
      },
      project
    );
    return;
  }
  const content = readFile(settingsPath);
  if (!content.includes("# <arch:settings>") || !content.includes("# </arch:settings>")) {
    addIssue(
      issues,
      {
        level: "warning",
        rule: "wiring.missing_settings_region",
        message: `Missing settings region in ${settingsPath}`,
        path: settingsPath,
      },
      project
    );
  }
}

function checkEnvComposeMarkers(issues, project, projectRoot) {
  const envPath = path.join(projectRoot, ".env.example");
  if (!fileExists(envPath)) {
    addIssue(
      issues,
      {
        level: "warning",
        rule: "wiring.missing_env_example",
        message: `Missing .env.example: ${envPath}`,
        path: envPath,
      },
      project
    );
  } else {
    const envContent = readFile(envPath);
    if (!envContent.includes("# <arch:env>") || !envContent.includes("# </arch:env>")) {
      addIssue(
        issues,
        {
          level: "warning",
          rule: "wiring.missing_env_region",
          message: `Missing env region in ${envPath}`,
          path: envPath,
        },
        project
      );
    }
  }

  const composePath = path.join(projectRoot, "docker-compose.yml");
  if (!fileExists(composePath)) {
    addIssue(
      issues,
      {
        level: "warning",
        rule: "wiring.missing_compose",
        message: `Missing docker-compose.yml: ${composePath}`,
        path: composePath,
      },
      project
    );
  } else {
    const composeContent = readFile(composePath);
    if (!composeContent.includes("# <arch:compose>") || !composeContent.includes("# </arch:compose>")) {
      addIssue(
        issues,
        {
          level: "warning",
          rule: "wiring.missing_compose_region",
          message: `Missing compose region in ${composePath}`,
          path: composePath,
        },
        project
      );
    }
  }
}

function checkCapabilityChecks(issues, project, projectRoot) {
  const envPath = path.join(projectRoot, ".env");
  const envExamplePath = path.join(projectRoot, ".env.example");
  const envText = fileExists(envPath) ? readFile(envPath) : "";
  const envExampleText = fileExists(envExamplePath) ? readFile(envExamplePath) : "";

  Object.values(project.modules).forEach((moduleEntry) => {
    (moduleEntry.capabilities || []).forEach((cap) => {
      let definition = null;
      try {
        definition = loadCapability(cap.id);
      } catch (error) {
        addIssue(
          issues,
          {
            level: "warning",
            rule: "capability.missing_definition",
            message: `Capability definition not found: ${cap.id}`,
          },
          project
        );
        return;
      }
      (definition.doctorChecks || []).forEach((check) => {
        if (check.type === "env") {
          const key = check.key;
          const hasKey =
            new RegExp(`^${key}=`, "m").test(envText) || new RegExp(`^${key}=`, "m").test(envExampleText);
          if (!hasKey) {
            addIssue(
              issues,
              {
                level: "warning",
                rule: `capability.env_missing_${key}`,
                message: `Missing env key ${key} for capability ${cap.id}`,
                path: envExamplePath,
              },
              project
            );
          }
        }
        if (check.type === "binary") {
          const result = spawnSync(check.command, { shell: true, stdio: "ignore" });
          if (result.status !== 0) {
            addIssue(
              issues,
              {
                level: "warning",
                rule: `capability.binary_${cap.id}`,
                message: `Binary check failed (${cap.id}): ${check.command}`,
              },
              project
            );
          }
        }
      });
    });
  });
}

function doctorCommand() {
  const projectRoot = findProjectRoot(process.cwd());
  if (!projectRoot) {
    throw new Error("No .arch/project.json found. Run arch init first.");
  }

  const project = loadProject(projectRoot);
  const issues = [];

  Object.entries(project.modules).forEach(([moduleId, moduleEntry]) => {
    const moduleRoot = path.join(projectRoot, project.paths.modulesRoot, moduleId);
    checkWiring(issues, project, moduleId, moduleEntry, moduleRoot);
    checkLayering(issues, project, moduleId, moduleRoot);
    checkPortDependencies(issues, project, moduleId, moduleRoot);
    checkDeliveryHeuristics(issues, project, moduleId, moduleRoot);
    checkThresholds(issues, project, moduleRoot);
    checkSettingsMarkers(issues, project, moduleRoot);
  });

  checkAppMarkers(issues, project, projectRoot);
  checkEnvComposeMarkers(issues, project, projectRoot);
  checkCapabilityChecks(issues, project, projectRoot);

  return {
    projectRoot,
    issues,
  };
}

module.exports = {
  doctorCommand,
};
