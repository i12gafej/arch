const path = require("path");
const { findProjectRoot, loadProject } = require("../core/project");
const { regenerateWiring } = require("../core/wiring");
const { recordOperation } = require("../core/ops");

function fixWiringCommand(flags = {}) {
  const projectRoot = findProjectRoot(process.cwd());
  if (!projectRoot) {
    throw new Error("No .arch/project.json found. Run arch init first.");
  }
  const project = loadProject(projectRoot);
  const dryRun = flags.dryRun || false;
  const actions = [];
  Object.keys(project.modules).forEach((moduleId) => {
    actions.push({
      type: "update",
      path: path.join(projectRoot, project.paths.modulesRoot, moduleId, "bootstrap", "container.py"),
    });
  });
  actions.push({
    type: "update",
    path: path.join(projectRoot, project.paths.deliveryRoot, "app.py"),
  });

  if (dryRun) {
    return {
      projectRoot,
      plan: actions,
      message: "Plan: fix wiring",
    };
  }

  regenerateWiring(projectRoot, project);
  recordOperation(projectRoot, {
    cmd: "fix wiring",
    actions,
  });
  return {
    projectRoot,
    message: "Wiring regenerated",
  };
}

module.exports = {
  fixWiringCommand,
};

