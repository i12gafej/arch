function ensureModule(project, moduleId, moduleLabel) {
  if (!project.modules[moduleId]) {
    project.modules[moduleId] = {
      id: moduleId,
      name: moduleLabel || moduleId,
      submodules: {},
      useCases: [],
      rules: [],
      ports: [],
      bindings: [],
      capabilities: [],
    };
  }
  return project.modules[moduleId];
}

function getModule(project, moduleId) {
  const moduleEntry = project.modules[moduleId];
  if (!moduleEntry) {
    throw new Error(`Module not found: ${moduleId}`);
  }
  return moduleEntry;
}

function ensureSubmodule(moduleEntry, submoduleId, submoduleLabel) {
  if (!moduleEntry.submodules[submoduleId]) {
    moduleEntry.submodules[submoduleId] = {
      id: submoduleId,
      name: submoduleLabel || submoduleId,
    };
  }
  return moduleEntry.submodules[submoduleId];
}

module.exports = {
  ensureModule,
  getModule,
  ensureSubmodule,
};
