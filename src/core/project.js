const fs = require("fs");
const path = require("path");
const { writeJson, readJson } = require("../utils/fs");

const PROJECT_FILE = path.join(".arch", "project.json");

function findProjectRoot(startDir) {
  let current = path.resolve(startDir);
  while (true) {
    const candidate = path.join(current, PROJECT_FILE);
    if (fs.existsSync(candidate)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function loadProject(projectRoot) {
  const filePath = path.join(projectRoot, PROJECT_FILE);
  const project = readJson(filePath);
  if (!project) {
    throw new Error(".arch/project.json not found. Run arch init first.");
  }
  return normalizeProject(project);
}

function saveProject(projectRoot, project) {
  const filePath = path.join(projectRoot, PROJECT_FILE);
  writeJson(filePath, project);
}

function createProject({ name, preset, defaultModule, defaultModuleLabel }) {
  const moduleId = defaultModule;
  return {
    name,
    preset,
    defaultModule: moduleId,
    paths: {
      modulesRoot: "modules",
      deliveryRoot: path.join("delivery", "http").replace(/\\/g, "/"),
    },
    modules: {
      [moduleId]: {
        id: moduleId,
        name: defaultModuleLabel || moduleId,
        submodules: {},
        useCases: [],
        rules: [],
        services: [],
        ports: [],
        bindings: [],
        capabilities: [],
      },
    },
    exemptions: [],
    settings: {
      maxFilesPerFolder: 20,
      maxFileLines: 400,
    },
    createdAt: new Date().toISOString(),
  };
}

function normalizeProject(project) {
  const normalized = { ...project };
  normalized.paths = normalized.paths || {};
  normalized.paths.modulesRoot = normalized.paths.modulesRoot || "modules";
  normalized.paths.deliveryRoot = normalized.paths.deliveryRoot || "delivery/http";
  if (!normalized.modules || Object.keys(normalized.modules).length === 0) {
    normalized.modules = {};
    if (normalized.moduleName) {
      normalized.modules[normalized.moduleName] = {
        id: normalized.moduleName,
        name: normalized.moduleName,
        submodules: {},
        useCases: normalized.useCases || [],
        rules: [],
        services: [],
        ports: normalized.ports || [],
        bindings: normalized.bindings || [],
        capabilities: [],
      };
      normalized.defaultModule = normalized.moduleName;
    }
  }
  normalized.modules = normalized.modules || {};
  normalized.exemptions = normalized.exemptions || [];
  normalized.settings = normalized.settings || { maxFilesPerFolder: 20, maxFileLines: 400 };

  if (!normalized.defaultModule) {
    const moduleKeys = Object.keys(normalized.modules);
    normalized.defaultModule = moduleKeys.length ? moduleKeys[0] : "core";
  }

  Object.values(normalized.modules).forEach((moduleEntry) => {
    moduleEntry.submodules = moduleEntry.submodules || {};
    moduleEntry.useCases = moduleEntry.useCases || [];
    moduleEntry.rules = moduleEntry.rules || [];
    moduleEntry.services = moduleEntry.services || [];
    moduleEntry.ports = moduleEntry.ports || [];
    moduleEntry.bindings = moduleEntry.bindings || [];
    moduleEntry.capabilities = moduleEntry.capabilities || [];
    moduleEntry.name = moduleEntry.name || moduleEntry.id;
  });

  return normalized;
}

module.exports = {
  PROJECT_FILE,
  findProjectRoot,
  loadProject,
  saveProject,
  createProject,
  normalizeProject,
};

