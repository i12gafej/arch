const { initCommand } = require("./commands/init");
const { addUseCaseCommand } = require("./commands/add-use-case");
const { addPortCommand } = require("./commands/add-port");
const { addRuleCommand } = require("./commands/add-rule");
const { addModuleCommand } = require("./commands/add-module");
const { addSubmoduleCommand } = require("./commands/add-submodule");
const { addServiceCommand } = require("./commands/add-service");
const { addCapabilityCommand } = require("./commands/add-capability");
const {
  addDomainInterfaceCommand,
  addDomainServiceCommand,
  addAppServiceCommand,
  addEngineCommand,
} = require("./commands/domain-artifacts");
const {
  addModelCommand,
  addDtoCommand,
  addMapperCommand,
  addPersistenceModelCommand,
} = require("./commands/models");
const { addApiHttpCommand } = require("./commands/add-api");
const { bindCommand } = require("./commands/bind");
const { doctorCommand } = require("./commands/doctor");
const { fixWiringCommand } = require("./commands/fix");
const { refactorSplitCommand } = require("./commands/refactor-split");
const { graphPlanCommand, graphApplyCommand } = require("./commands/graph");

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function printHelp() {
  const help = `arch - deterministic architecture scaffolding\n\nUsage:\n  arch init --name <name> [--preset python-uv-fastapi] [--dir <path>]\n  arch add module <module>\n  arch add submodule <module>.<submodule>\n  arch add api http --module <module> [--mount /<module>]\n  arch add use-case <module>[.<submodule>].<use_case>\n  arch add rule <module>[.<submodule>].<rule>\n  arch add domain-interface <module>[.<submodule>].<name> --kind policy|strategy|spec|selector\n  arch add domain-service <module>[.<submodule>].<name> [--implements <domain-interface>]\n  arch add app-service <module>[.<submodule>].<name> [--uses <ports...>]\n  arch add engine <module>[.<submodule>].<name> --layer domain|application\n  arch add service <module>[.<submodule>].<service> --layer domain|application|infrastructure\n  arch add policy <module>[.<submodule>].<name>\n  arch add port <module>[.<submodule>].<port> [--methods "method(a)->b; other()"]\n  arch add capability <capability> [--module m] [--submodule s] [--for port]\n  arch add model <module>[.<submodule>].<EntityName> --kind entity|value_object [--fields "..."]\n  arch add dto <module>[.<submodule>].<DtoName> [--fields "..."]\n  arch add mapper <module>[.<submodule>].<name> --from dto|orm --to domain\n  arch add persistence-model <module>[.<submodule>].<EntityName> --orm sqlalchemy --table <name> [--fields "..."] [--fk "a.b -> c.d"]\n  arch bind <module>[.<submodule>].<port> --to <adapter>\n  arch refactor split <module> --into <sub1,sub2,...> [--by prefix]\n  arch graph plan <file>\n  arch graph apply <file>\n  arch doctor\n  arch fix wiring\n  arch plan <command> [...]\n`;
  process.stdout.write(help);
}

function printPlan(result) {
  if (!result.plan || result.plan.length === 0) {
    console.log(result.message || "Plan: no changes");
    return;
  }
  console.log(result.message || "Plan:");
  result.plan.forEach((action) => {
    if (action.from) {
      console.log(`- ${action.type}: ${action.from} -> ${action.to}`);
    } else {
      console.log(`- ${action.type}: ${action.path}`);
    }
  });
}

function run() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return;
  }

  const command = argv[0];
  const rest = argv.slice(1);
  const isPlan = command === "plan";
  const effectiveCommand = isPlan ? rest[0] : command;
  const effectiveArgs = isPlan ? rest.slice(1) : rest;

  try {
    if (effectiveCommand === "init") {
      const { positional, flags } = parseArgs(effectiveArgs);
      flags.dryRun = flags.dryRun || isPlan;
      const result = initCommand(positional, flags);
      if (isPlan) {
        printPlan(result);
      } else {
        console.log(result.message);
      }
      return;
    }
    if (effectiveCommand === "add") {
      const subcommand = effectiveArgs[0];
      const { positional, flags } = parseArgs(effectiveArgs.slice(1));
      flags.dryRun = flags.dryRun || isPlan;
      if (subcommand === "use-case") {
        const result = addUseCaseCommand(positional, flags);
        if (isPlan) {
          printPlan(result);
        } else {
          console.log(result.message);
        }
        return;
      }
      if (subcommand === "port") {
        const result = addPortCommand(positional, flags);
        if (isPlan) {
          printPlan(result);
        } else {
          console.log(result.message);
        }
        return;
      }
      if (subcommand === "rule") {
        const result = addRuleCommand(positional, flags);
        if (isPlan) {
          printPlan(result);
        } else {
          console.log(result.message);
        }
        return;
      }
      if (subcommand === "service") {
        const result = addServiceCommand(positional, flags);
        if (isPlan) {
          printPlan(result);
        } else {
          console.log(result.message);
        }
        return;
      }
      if (subcommand === "policy") {
        const result = addServiceCommand(positional, { ...flags, layer: "domain" });
        if (isPlan) {
          printPlan(result);
        } else {
          console.log(result.message);
        }
        return;
      }
      if (subcommand === "domain-interface") {
        const result = addDomainInterfaceCommand(positional, flags);
        if (isPlan) {
          printPlan(result);
        } else {
          console.log(result.message);
        }
        return;
      }
      if (subcommand === "domain-service") {
        const result = addDomainServiceCommand(positional, flags);
        if (isPlan) {
          printPlan(result);
        } else {
          console.log(result.message);
        }
        return;
      }
      if (subcommand === "app-service") {
        const result = addAppServiceCommand(positional, flags);
        if (isPlan) {
          printPlan(result);
        } else {
          console.log(result.message);
        }
        return;
      }
      if (subcommand === "engine") {
        const result = addEngineCommand(positional, flags);
        if (isPlan) {
          printPlan(result);
        } else {
          console.log(result.message);
        }
        return;
      }
      if (subcommand === "module") {
        const result = addModuleCommand(positional, flags);
        if (isPlan) {
          printPlan(result);
        } else {
          console.log(result.message);
        }
        return;
      }
      if (subcommand === "submodule") {
        const result = addSubmoduleCommand(positional, flags);
        if (isPlan) {
          printPlan(result);
        } else {
          console.log(result.message);
        }
        return;
      }
      if (subcommand === "capability") {
        const result = addCapabilityCommand(positional, flags);
        if (isPlan) {
          printPlan(result);
        } else {
          console.log(result.message);
        }
        return;
      }
      if (subcommand === "api" && positional[0] === "http") {
        const result = addApiHttpCommand(positional.slice(1), flags);
        if (isPlan) {
          printPlan(result);
        } else {
          console.log(result.message);
        }
        return;
      }
      if (subcommand === "model") {
        const result = addModelCommand(positional, flags);
        if (isPlan) {
          printPlan(result);
        } else {
          console.log(result.message);
        }
        return;
      }
      if (subcommand === "dto") {
        const result = addDtoCommand(positional, flags);
        if (isPlan) {
          printPlan(result);
        } else {
          console.log(result.message);
        }
        return;
      }
      if (subcommand === "mapper") {
        const result = addMapperCommand(positional, flags);
        if (isPlan) {
          printPlan(result);
        } else {
          console.log(result.message);
        }
        return;
      }
      if (subcommand === "persistence-model") {
        const result = addPersistenceModelCommand(positional, flags);
        if (isPlan) {
          printPlan(result);
        } else {
          console.log(result.message);
        }
        return;
      }
    }
    if (effectiveCommand === "bind") {
      const { positional, flags } = parseArgs(effectiveArgs);
      flags.dryRun = flags.dryRun || isPlan;
      const result = bindCommand(positional, flags);
      if (isPlan) {
        printPlan(result);
      } else {
        console.log(result.message);
      }
      return;
    }
    if (effectiveCommand === "doctor") {
      const result = doctorCommand();
      if (result.issues.length === 0) {
        console.log("Doctor: clean");
        return;
      }
      const errors = result.issues.filter((issue) => issue.level === "error");
      const warnings = result.issues.filter((issue) => issue.level === "warning");
      if (errors.length) {
        console.error("Doctor errors:");
        errors.forEach((issue) => console.error(`- [${issue.rule}] ${issue.message}`));
      }
      if (warnings.length) {
        console.warn("Doctor warnings:");
        warnings.forEach((issue) => console.warn(`- [${issue.rule}] ${issue.message}`));
      }
      if (errors.length) {
        process.exitCode = 1;
      }
      return;
    }
    if (effectiveCommand === "fix") {
      const subcommand = effectiveArgs[0];
      if (subcommand === "wiring") {
        const result = fixWiringCommand({ dryRun: isPlan });
        if (isPlan) {
          printPlan(result);
        } else {
          console.log(result.message);
        }
        return;
      }
    }
    if (effectiveCommand === "refactor") {
      const subcommand = effectiveArgs[0];
      const { positional, flags } = parseArgs(effectiveArgs.slice(1));
      flags.dryRun = flags.dryRun || isPlan;
      if (subcommand === "split") {
        const result = refactorSplitCommand(positional, flags);
        if (isPlan) {
          printPlan(result);
        } else {
          console.log(result.message);
        }
        return;
      }
    }
    if (effectiveCommand === "graph") {
      const subcommand = effectiveArgs[0];
      const filePath = effectiveArgs[1];
      if (subcommand === "plan") {
        const result = graphPlanCommand(filePath);
        printPlan(result);
        return;
      }
      if (subcommand === "apply") {
        const result = graphApplyCommand(filePath);
        console.log(result.message);
        return;
      }
    }
    printHelp();
  } catch (error) {
    console.error(error.message || String(error));
    process.exitCode = 1;
  }
}

module.exports = {
  run,
};
