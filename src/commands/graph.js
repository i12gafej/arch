const fs = require("fs");
const path = require("path");
const { addModuleCommand } = require("./add-module");
const { addSubmoduleCommand } = require("./add-submodule");
const { addApiHttpCommand } = require("./add-api");
const { addUseCaseCommand } = require("./add-use-case");
const { addPortCommand } = require("./add-port");
const { bindCommand } = require("./bind");
const { addCapabilityCommand } = require("./add-capability");
const { addRuleCommand } = require("./add-rule");
const {
  addDomainInterfaceCommand,
  addDomainServiceCommand,
  addAppServiceCommand,
  addEngineCommand,
} = require("./domain-artifacts");
const {
  addModelCommand,
  addDtoCommand,
  addMapperCommand,
  addPersistenceModelCommand,
} = require("./models");
const { doctorCommand } = require("./doctor");

function parseGraph(text) {
  const lines = text.split(/\r?\n/);
  const statements = [];
  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) {
      return;
    }
    const parts = line.split(/\s+/);
    const keyword = parts[0];
    statements.push({ keyword, parts });
  });
  return statements;
}

function parseKeyValue(parts, key) {
  const idx = parts.findIndex((part) => part === key);
  if (idx === -1 || idx + 1 >= parts.length) {
    return null;
  }
  return parts[idx + 1];
}

function buildCommands(statements) {
  const commands = [];
  statements.forEach(({ keyword, parts }) => {
    if (keyword === "module") {
      commands.push({ fn: addModuleCommand, args: [parts[1]], flags: {} });
      return;
    }
    if (keyword === "submodule") {
      commands.push({ fn: addSubmoduleCommand, args: [parts[1]], flags: {} });
      return;
    }
    if (keyword === "api" && parts[1] === "http") {
      const moduleId = parts[2];
      const mount = parseKeyValue(parts, "mount") || null;
      commands.push({
        fn: addApiHttpCommand,
        args: [],
        flags: { module: moduleId, mount },
      });
      return;
    }
    if (keyword === "use_case") {
      commands.push({ fn: addUseCaseCommand, args: [parts[1]], flags: {} });
      return;
    }
    if (["policy", "strategy", "spec", "selector"].includes(keyword)) {
      commands.push({
        fn: addDomainInterfaceCommand,
        args: [parts[1]],
        flags: { kind: keyword },
      });
      return;
    }
    if (keyword === "domain_service") {
      const implementsName = parseKeyValue(parts, "implements");
      commands.push({
        fn: addDomainServiceCommand,
        args: [parts[1]],
        flags: implementsName ? { implements: implementsName } : {},
      });
      return;
    }
    if (keyword === "app_service") {
      const uses = parseKeyValue(parts, "uses");
      commands.push({
        fn: addAppServiceCommand,
        args: [parts[1]],
        flags: uses ? { uses } : {},
      });
      return;
    }
    if (keyword === "engine") {
      const layer = parseKeyValue(parts, "layer");
      commands.push({
        fn: addEngineCommand,
        args: [parts[1]],
        flags: layer ? { layer } : {},
      });
      return;
    }
    if (keyword === "port") {
      commands.push({ fn: addPortCommand, args: [parts[1]], flags: {} });
      return;
    }
    if (keyword === "adapter") {
      const portName = parseKeyValue(parts, "for");
      commands.push({ fn: bindCommand, args: [portName, parts[1]], flags: { to: parts[1] } });
      return;
    }
    if (keyword === "capability") {
      const moduleId = parts[1];
      const capId = parts[2];
      const forPort = parseKeyValue(parts, "for");
      const submodule = parseKeyValue(parts, "submodule");
      commands.push({
        fn: addCapabilityCommand,
        args: [capId],
        flags: { module: moduleId, submodule, for: forPort },
      });
      return;
    }
    if (keyword === "rule") {
      commands.push({ fn: addRuleCommand, args: [parts[1]], flags: {} });
      return;
    }
    if (keyword === "model") {
      const kind = parseKeyValue(parts, "kind") || "entity";
      const fields = parseKeyValue(parts, "fields");
      commands.push({ fn: addModelCommand, args: [parts[1]], flags: { kind, fields } });
      return;
    }
    if (keyword === "dto") {
      const fields = parseKeyValue(parts, "fields");
      commands.push({ fn: addDtoCommand, args: [parts[1]], flags: { fields } });
      return;
    }
    if (keyword === "mapper") {
      const from = parseKeyValue(parts, "from") || "dto";
      const to = parseKeyValue(parts, "to") || "domain";
      commands.push({ fn: addMapperCommand, args: [parts[1]], flags: { from, to } });
      return;
    }
    if (keyword === "persistence_model") {
      const orm = parseKeyValue(parts, "orm") || "sqlalchemy";
      const table = parseKeyValue(parts, "table") || null;
      const fields = parseKeyValue(parts, "fields") || "";
      const fk = parseKeyValue(parts, "fk") || "";
      commands.push({
        fn: addPersistenceModelCommand,
        args: [parts[1]],
        flags: { orm, table, fields, fk },
      });
      return;
    }
  });
  return commands;
}

function buildCommandStrings(statements) {
  const commands = [];
  statements.forEach(({ keyword, parts }) => {
    const line = parts.join(" ");
    commands.push({ type: "cmd", path: `arch ${line}` });
  });
  return commands;
}

function runCommands(commands, dryRun) {
  const plan = [];
  commands.forEach((cmd) => {
    const result = cmd.fn(cmd.args, { ...cmd.flags, dryRun });
    if (result && result.plan) {
      plan.push(...result.plan);
    }
  });
  return plan;
}

function graphPlanCommand(filePath) {
  if (!filePath) {
    throw new Error("Graph file is required.");
  }
  const fullPath = path.resolve(process.cwd(), filePath);
  const text = fs.readFileSync(fullPath, "utf8");
  const statements = parseGraph(text);
  const plan = buildCommandStrings(statements);
  return {
    plan,
    message: `Plan: graph ${filePath}`,
  };
}

function graphApplyCommand(filePath) {
  if (!filePath) {
    throw new Error("Graph file is required.");
  }
  const fullPath = path.resolve(process.cwd(), filePath);
  const text = fs.readFileSync(fullPath, "utf8");
  const statements = parseGraph(text);
  const commands = buildCommands(statements);
  runCommands(commands, false);
  const doctor = doctorCommand();
  if (doctor.issues.length) {
    return { message: `Graph applied with ${doctor.issues.length} doctor issues` };
  }
  return { message: "Graph applied successfully" };
}

module.exports = {
  graphPlanCommand,
  graphApplyCommand,
};
