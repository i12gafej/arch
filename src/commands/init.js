const path = require("path");
const { isDirEmpty } = require("../utils/fs");
const { normalizeName } = require("../utils/naming");
const { createProject, saveProject } = require("../core/project");
const { recordOperation } = require("../core/ops");
const { createPythonUvFastapiSkeleton } = require("../presets/python-uv-fastapi");

function initCommand(args, flags) {
  const name = flags.name || args[0];
  if (!name) {
    throw new Error("--name is required for init");
  }
  const preset = flags.preset || "python-uv-fastapi";
  const dryRun = flags.dryRun || false;
  const dir = flags.dir ? path.resolve(flags.dir) : process.cwd();

  if (!isDirEmpty(dir)) {
    throw new Error(`Target directory is not empty: ${dir}`);
  }

  const normalized = normalizeName(name);
  const project = createProject({
    name,
    preset,
    defaultModule: normalized.snake,
    defaultModuleLabel: normalized.pascal,
  });

  if (preset !== "python-uv-fastapi") {
    throw new Error(`Preset not supported yet: ${preset}`);
  }

  const plannedActions = [
    { type: "create", path: path.join(dir, ".arch", "project.json") },
    { type: "create", path: path.join(dir, project.paths.modulesRoot, normalized.snake) },
    { type: "create", path: path.join(dir, project.paths.deliveryRoot, "app.py") },
    { type: "create", path: path.join(dir, project.paths.deliveryRoot, "routes", "health.py") },
    { type: "create", path: path.join(dir, "README.md") },
    { type: "create", path: path.join(dir, "pyproject.toml") },
    { type: "create", path: path.join(dir, ".env.example") },
    { type: "create", path: path.join(dir, "docker-compose.yml") },
    {
      type: "create",
      path: path.join(
        dir,
        project.paths.modulesRoot,
        normalized.snake,
        "bootstrap",
        "settings.py"
      ),
    },
    {
      type: "create",
      path: path.join(
        dir,
        project.paths.modulesRoot,
        normalized.snake,
        "delivery",
        "http",
        "router.py"
      ),
    },
  ];

  if (dryRun) {
    return {
      projectRoot: dir,
      plan: plannedActions,
      message: `Plan: init ${name} at ${dir}`,
    };
  }

  createPythonUvFastapiSkeleton(dir, project);
  saveProject(dir, project);
  recordOperation(dir, {
    cmd: `init ${name}`,
    actions: plannedActions,
  });

  return {
    projectRoot: dir,
    message: `Initialized ${name} at ${dir}`,
  };
}

module.exports = {
  initCommand,
};
