const path = require("path");
const { writeFile } = require("../utils/fs");
const { findProjectRoot, loadProject, saveProject } = require("../core/project");
const { getModule } = require("../core/modules");
const { regenerateWiring } = require("../core/wiring");
const { recordOperation } = require("../core/ops");

function addApiHttpCommand(args, flags = {}) {
  const moduleId = flags.module || args[0];
  if (!moduleId) {
    throw new Error("--module is required for add api http");
  }
  const mount = flags.mount || `/${moduleId}`;
  const dryRun = flags.dryRun || false;

  const projectRoot = findProjectRoot(process.cwd());
  if (!projectRoot) {
    throw new Error("No .arch/project.json found. Run arch init first.");
  }
  const project = loadProject(projectRoot);
  const moduleEntry = getModule(project, moduleId);

  moduleEntry.apiSurfaces = moduleEntry.apiSurfaces || [];
  const exists = moduleEntry.apiSurfaces.some((surface) => surface.type === "http");
  if (!exists) {
    moduleEntry.apiSurfaces.push({
      type: "http",
      mount,
      routerFile: "delivery/http/router.py",
    });
  }

  const moduleRoot = path.join(projectRoot, project.paths.modulesRoot, moduleId);
  const routerPath = path.join(moduleRoot, "delivery", "http", "router.py");
  const routerContent = "from fastapi import APIRouter\n\nrouter = APIRouter()\n\n# <arch:routes>\n# </arch:routes>\n";

  const actions = [
    { type: "create", path: routerPath },
    { type: "update", path: path.join(projectRoot, project.paths.deliveryRoot, "app.py") },
    { type: "update", path: path.join(projectRoot, ".arch", "project.json") },
  ];

  if (dryRun) {
    return {
      projectRoot,
      plan: actions,
      message: `Plan: add api http for module ${moduleId}`,
    };
  }

  writeFile(routerPath, routerContent, { ifNotExists: true });
  saveProject(projectRoot, project);
  regenerateWiring(projectRoot, project);
  recordOperation(projectRoot, {
    cmd: `add api http --module ${moduleId}`,
    actions,
  });

  return {
    projectRoot,
    message: `Added api http for module ${moduleId}`,
  };
}

module.exports = {
  addApiHttpCommand,
};
