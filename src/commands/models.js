const path = require("path");
const { ensureDir, writeFile } = require("../utils/fs");
const { normalizeQualified, normalizeName } = require("../utils/naming");
const { findProjectRoot, loadProject, saveProject } = require("../core/project");
const { ensureSubmodule, getModule } = require("../core/modules");
const { recordOperation } = require("../core/ops");

function ensurePackageInit(dirPath) {
  ensureDir(dirPath);
  writeFile(path.join(dirPath, "__init__.py"), "", { ifNotExists: true });
}

function parseFields(raw) {
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [name, type] = part.split(":").map((v) => v.trim());
      return { name, type: type || "str" };
    });
}

function addModelCommand(args, flags = {}) {
  const name = args[0];
  if (!name) {
    throw new Error("Model name is required.");
  }
  const kind = flags.kind || "entity";
  if (!['entity','value_object'].includes(kind)) {
    throw new Error("--kind must be entity|value_object");
  }
  const fields = parseFields(flags.fields || "");
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

  moduleEntry.models = moduleEntry.models || [];
  const exists = moduleEntry.models.some(
    (model) => model.id === qualified.name.snake && model.submodule === (submoduleId || null)
  );
  if (!exists) {
    moduleEntry.models.push({
      id: qualified.name.snake,
      name: qualified.name.pascal,
      kind,
      fields,
      submodule: submoduleId || null,
    });
  }

  const moduleRoot = path.join(projectRoot, project.paths.modulesRoot, moduleId);
  const targetDir = path.join(
    moduleRoot,
    "domain",
    kind === "entity" ? "entities" : "value_objects",
    submoduleId || ""
  );
  ensurePackageInit(targetDir);

  const modelPath = path.join(targetDir, `${qualified.name.snake}.py`);
  const params = fields.map((field) => `${field.name}: ${field.type}`).join(", ");
  const assigns = fields.map((field) => `        self.${field.name} = ${field.name}`).join("\n");
  const initBlock = fields.length
    ? `    def __init__(self, ${params}) -> None:\n${assigns}\n\n`
    : "";
  const modelContent = `from __future__ import annotations\n\n\nclass ${qualified.name.pascal}:\n${initBlock}    pass\n`;

  const actions = [
    { type: "create", path: modelPath },
    { type: "update", path: path.join(projectRoot, ".arch", "project.json") },
  ];

  if (dryRun) {
    return {
      projectRoot,
      plan: actions,
      message: `Plan: add ${kind} ${qualified.name.pascal} in module ${moduleId}`,
    };
  }

  writeFile(modelPath, modelContent, { ifNotExists: true });
  saveProject(projectRoot, project);
  recordOperation(projectRoot, {
    cmd: `add model ${name} --kind ${kind}`,
    actions,
  });

  return {
    projectRoot,
    message: `Added ${kind} ${qualified.name.pascal} in module ${moduleId}`,
  };
}

function addDtoCommand(args, flags = {}) {
  const name = args[0];
  if (!name) {
    throw new Error("DTO name is required.");
  }
  const fields = parseFields(flags.fields || "");
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

  moduleEntry.dtos = moduleEntry.dtos || [];
  const exists = moduleEntry.dtos.some(
    (dto) => dto.id === qualified.name.snake && dto.submodule === (submoduleId || null)
  );
  if (!exists) {
    moduleEntry.dtos.push({
      id: qualified.name.snake,
      name: qualified.name.pascal,
      fields,
      submodule: submoduleId || null,
    });
  }

  const moduleRoot = path.join(projectRoot, project.paths.modulesRoot, moduleId);
  const dtosDir = path.join(moduleRoot, "application", "dtos", submoduleId || "");
  ensurePackageInit(dtosDir);

  const dtoPath = path.join(dtosDir, `${qualified.name.snake}.py`);
  const fieldLines = fields.length
    ? fields.map((field) => `    ${field.name}: ${field.type}`).join("\n")
    : "    pass";
  const dtoContent = `from pydantic import BaseModel\n\n\nclass ${qualified.name.pascal}(BaseModel):\n${fieldLines}\n`;

  const actions = [
    { type: "create", path: dtoPath },
    { type: "update", path: path.join(projectRoot, ".arch", "project.json") },
  ];

  if (dryRun) {
    return {
      projectRoot,
      plan: actions,
      message: `Plan: add dto ${qualified.name.pascal} in module ${moduleId}`,
    };
  }

  writeFile(dtoPath, dtoContent, { ifNotExists: true });
  saveProject(projectRoot, project);
  recordOperation(projectRoot, {
    cmd: `add dto ${name}`,
    actions,
  });

  return {
    projectRoot,
    message: `Added dto ${qualified.name.pascal} in module ${moduleId}`,
  };
}

function addMapperCommand(args, flags = {}) {
  const name = args[0];
  if (!name) {
    throw new Error("Mapper name is required.");
  }
  const from = flags.from || "dto";
  const to = flags.to || "domain";
  if (!['dto','orm'].includes(from) || to !== 'domain') {
    throw new Error("--from must be dto|orm and --to must be domain");
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

  const moduleRoot = path.join(projectRoot, project.paths.modulesRoot, moduleId);
  const mapperDir = from === "dto"
    ? path.join(moduleRoot, "application", "mappers", submoduleId || "")
    : path.join(moduleRoot, "infrastructure", "db", "sqlalchemy", "mappers", submoduleId || "");
  ensurePackageInit(mapperDir);

  const mapperPath = path.join(mapperDir, `${qualified.name.snake}.py`);
  const mapperContent = `from __future__ import annotations\n\n\ndef to_domain(source):\n    raise NotImplementedError\n\n\ndef from_domain(entity):\n    raise NotImplementedError\n`;

  const actions = [
    { type: "create", path: mapperPath },
    { type: "update", path: path.join(projectRoot, ".arch", "project.json") },
  ];

  if (dryRun) {
    return {
      projectRoot,
      plan: actions,
      message: `Plan: add mapper ${qualified.name.pascal} in module ${moduleId}`,
    };
  }

  writeFile(mapperPath, mapperContent, { ifNotExists: true });
  saveProject(projectRoot, project);
  recordOperation(projectRoot, {
    cmd: `add mapper ${name} --from ${from} --to ${to}`,
    actions,
  });

  return {
    projectRoot,
    message: `Added mapper ${qualified.name.pascal} in module ${moduleId}`,
  };
}

function parseFk(raw) {
  if (!raw) {
    return null;
  }
  const parts = raw.split("->").map((v) => v.trim());
  if (parts.length !== 2) {
    return null;
  }
  return { from: parts[0], to: parts[1] };
}

function addPersistenceModelCommand(args, flags = {}) {
  const name = args[0];
  if (!name) {
    throw new Error("Persistence model name is required.");
  }
  const orm = flags.orm || "sqlalchemy";
  if (orm !== "sqlalchemy") {
    throw new Error("--orm only supports sqlalchemy in MVP");
  }
  const table = flags.table || normalizeName(name).snake;
  const fields = parseFields(flags.fields || "");
  const fk = parseFk(flags.fk || "");
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

  moduleEntry.persistenceModels = moduleEntry.persistenceModels || [];
  const exists = moduleEntry.persistenceModels.some(
    (model) => model.id === qualified.name.snake && model.submodule === (submoduleId || null)
  );
  if (!exists) {
    moduleEntry.persistenceModels.push({
      id: qualified.name.snake,
      name: qualified.name.pascal,
      table,
      orm,
      fields,
      fk,
      submodule: submoduleId || null,
    });
  }
  moduleEntry.relations = moduleEntry.relations || [];
  if (fk) {
    moduleEntry.relations.push({
      from: fk.from,
      to: fk.to,
      type: "fk",
      model: qualified.name.snake,
      submodule: submoduleId || null,
    });
  }

  const moduleRoot = path.join(projectRoot, project.paths.modulesRoot, moduleId);
  const modelsDir = path.join(
    moduleRoot,
    "infrastructure",
    "db",
    "sqlalchemy",
    "models",
    submoduleId || ""
  );
  ensurePackageInit(modelsDir);

  const modelPath = path.join(modelsDir, `${qualified.name.snake}.py`);
  const columnLines = fields.map((field) => {
    if (fk && fk.from.endsWith(field.name)) {
      return `    ${field.name} = mapped_column(ForeignKey(\"${fk.to}\"))`;
    }
    return `    ${field.name} = mapped_column()`;
  });
  const modelContent = `from __future__ import annotations\n\nfrom sqlalchemy import ForeignKey\nfrom sqlalchemy.orm import Mapped, mapped_column\n\n\nclass ${qualified.name.pascal}:\n    __tablename__ = \"${table}\"\n${columnLines.length ? columnLines.join("\n") : "    pass"}\n`;

  const mapperDir = path.join(
    moduleRoot,
    "infrastructure",
    "db",
    "sqlalchemy",
    "mappers",
    submoduleId || ""
  );
  ensurePackageInit(mapperDir);
  const mapperPath = path.join(mapperDir, `${qualified.name.snake}_mapper.py`);
  const mapperContent = `from __future__ import annotations\n\n\ndef to_domain(model):\n    raise NotImplementedError\n\n\ndef from_domain(entity):\n    raise NotImplementedError\n`;

  const actions = [
    { type: "create", path: modelPath },
    { type: "create", path: mapperPath },
    { type: "update", path: path.join(projectRoot, ".arch", "project.json") },
  ];

  if (dryRun) {
    return {
      projectRoot,
      plan: actions,
      message: `Plan: add persistence-model ${qualified.name.pascal} in module ${moduleId}`,
    };
  }

  writeFile(modelPath, modelContent, { ifNotExists: true });
  writeFile(mapperPath, mapperContent, { ifNotExists: true });
  saveProject(projectRoot, project);
  recordOperation(projectRoot, {
    cmd: `add persistence-model ${name} --orm ${orm}`,
    actions,
  });

  return {
    projectRoot,
    message: `Added persistence-model ${qualified.name.pascal} in module ${moduleId}`,
  };
}

module.exports = {
  addModelCommand,
  addDtoCommand,
  addMapperCommand,
  addPersistenceModelCommand,
};
