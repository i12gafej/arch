const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const ARCH = path.join(ROOT, "bin", "arch.js");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function run(args, cwd) {
  const result = spawnSync("node", [ARCH, ...args], {
    cwd,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    const msg = `Command failed: node ${args.join(" ")}\n${result.stdout}\n${result.stderr}`;
    throw new Error(msg);
  }
  return result.stdout.trim();
}

function withTempDir(fn) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "arch-tests-"));
  try {
    return fn(base);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
}

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}`);
    console.error(error.message || error);
    process.exitCode = 1;
  }
}

function initProject(tmpDir) {
  run(["init", "--name", "demo_service", "--dir", tmpDir], ROOT);
}

function projectPaths(tmpDir) {
  return {
    projectJson: path.join(tmpDir, ".arch", "project.json"),
    appPy: path.join(tmpDir, "delivery", "http", "app.py"),
    moduleRoot: path.join(tmpDir, "modules", "demo_service"),
    moduleRouter: path.join(tmpDir, "modules", "demo_service", "delivery", "http", "router.py"),
    container: path.join(tmpDir, "modules", "demo_service", "bootstrap", "container.py"),
  };
}

// Unit: naming engine
const { normalizeName, normalizeQualified, buildGetterName } = require("../src/utils/naming");
const { normalizeProject } = require("../src/core/project");

test("naming engine", () => {
  const out = normalizeName("Change Password");
  assert(out.snake === "change_password", "snake");
  assert(out.pascal === "ChangePassword", "pascal");
  assert(out.kebab === "change-password", "kebab");

  const q = normalizeQualified("identity.auth.change_password");
  assert(q.module.snake === "identity", "module");
  assert(q.submodule.snake === "auth", "submodule");
  assert(q.name.snake === "change_password", "name");

  assert(buildGetterName("auth", "change_password") === "auth_change_password", "getter");
});

test("normalizeProject backward compatibility", () => {
  const legacy = {
    moduleName: "legacy",
    useCases: [{ id: "ping", name: "Ping" }],
    ports: [{ id: "repo", name: "Repo" }],
    bindings: [{ port: "Repo", adapter: "SqlRepo" }],
  };
  const normalized = normalizeProject(legacy);
  assert(normalized.modules.legacy, "module created");
  assert(normalized.modules.legacy.useCases.length === 1, "useCases preserved");
  assert(normalized.modules.legacy.apiSurfaces.length === 1, "apiSurfaces default");
});

// Integration tests

test("init creates base layout + router + settings", () => {
  withTempDir((tmpDir) => {
    initProject(tmpDir);
    const paths = projectPaths(tmpDir);
    assert(exists(paths.projectJson), "project.json");
    assert(exists(paths.appPy), "app.py");
    assert(exists(paths.moduleRouter), "module router");
    assert(exists(path.join(paths.moduleRoot, "bootstrap", "settings.py")), "settings.py");
    assert(exists(path.join(tmpDir, ".env.example")), ".env.example");
    assert(exists(path.join(tmpDir, "docker-compose.yml")), "docker-compose.yml");
  });
});

test("plan does not create files", () => {
  withTempDir((tmpDir) => {
    initProject(tmpDir);
    run(["plan", "add", "use-case", "demo_service.auth.reset_password"], tmpDir);
    const route = path.join(tmpDir, "modules", "demo_service", "delivery", "http", "routes", "auth", "reset_password.py");
    assert(!exists(route), "route should not exist in plan");
  });
});

test("add use-case generates route + wiring when api surface exists", () => {
  withTempDir((tmpDir) => {
    initProject(tmpDir);
    run(["add", "use-case", "demo_service.auth.change_password"], tmpDir);
    const route = path.join(tmpDir, "modules", "demo_service", "delivery", "http", "routes", "auth", "change_password.py");
    const router = path.join(tmpDir, "modules", "demo_service", "delivery", "http", "router.py");
    const appPy = path.join(tmpDir, "delivery", "http", "app.py");
    assert(exists(route), "route file");
    const routerText = read(router);
    assert(routerText.includes("include_router"), "module router wiring");
    const appText = read(appPy);
    assert(appText.includes("demo_service_router"), "app includes module router");
  });
});

test("domain interface + domain service + app service", () => {
  withTempDir((tmpDir) => {
    initProject(tmpDir);
    run(["add", "domain-interface", "demo_service.auth.password_policy", "--kind", "policy"], tmpDir);
    run(["add", "domain-service", "demo_service.auth.default_password_policy", "--implements", "password_policy"], tmpDir);
    run(["add", "port", "demo_service.auth.user_repository"], tmpDir);
    run(["add", "app-service", "demo_service.auth.password_normalizer", "--uses", "user_repository"], tmpDir);
    const iface = path.join(tmpDir, "modules", "demo_service", "domain", "interfaces", "auth", "password_policy.py");
    const svc = path.join(tmpDir, "modules", "demo_service", "domain", "services", "auth", "default_password_policy.py");
    const appSvc = path.join(tmpDir, "modules", "demo_service", "application", "services", "auth", "password_normalizer.py");
    assert(exists(iface), "domain interface");
    assert(exists(svc), "domain service");
    assert(exists(appSvc), "app service");
  });
});

test("ports + bind + capability create adapters and env/settings", () => {
  withTempDir((tmpDir) => {
    initProject(tmpDir);
    run(["add", "port", "demo_service.user_repository"], tmpDir);
    run(["add", "capability", "db_postgres", "--module", "demo_service", "--for", "user_repository"], tmpDir);
    const adapter = path.join(tmpDir, "modules", "demo_service", "infrastructure", "adapters", "sql_user_repository.py");
    assert(exists(adapter), "adapter file");
    const envExample = read(path.join(tmpDir, ".env.example"));
    assert(envExample.includes("DATABASE_URL"), "env includes DATABASE_URL");
    const compose = read(path.join(tmpDir, "docker-compose.yml"));
    assert(compose.includes("postgres"), "compose includes postgres");
    const settings = read(path.join(tmpDir, "modules", "demo_service", "bootstrap", "settings.py"));
    assert(settings.includes("DATABASE_URL"), "settings includes DATABASE_URL");
  });
});

test("models and persistence models generate files + relations", () => {
  withTempDir((tmpDir) => {
    initProject(tmpDir);
    run(["add", "model", "demo_service.auth.User", "--kind", "entity", "--fields", "id:int, email:str"], tmpDir);
    run([
      "add",
      "persistence-model",
      "demo_service.auth.User",
      "--orm",
      "sqlalchemy",
      "--table",
      "users",
      "--fields",
      "id:int, email:str",
      "--fk",
      "users.account_id -> accounts.id",
    ], tmpDir);
    const entity = path.join(tmpDir, "modules", "demo_service", "domain", "entities", "auth", "user.py");
    const ormModel = path.join(
      tmpDir,
      "modules",
      "demo_service",
      "infrastructure",
      "db",
      "sqlalchemy",
      "models",
      "auth",
      "user.py"
    );
    assert(exists(entity), "entity file");
    assert(exists(ormModel), "orm model file");
    const project = JSON.parse(read(path.join(tmpDir, ".arch", "project.json")));
    assert(project.modules.demo_service.relations.length > 0, "relations recorded");
  });
});

test("graph plan/apply", () => {
  withTempDir((tmpDir) => {
    initProject(tmpDir);
    const graph = [
      "module gateway",
      "submodule gateway.pagination",
      "api http gateway mount /gateway",
      "use_case gateway.pagination.list_contents",
      "policy gateway.pagination.pagination_strategy",
      "port gateway.pagination.content_service",
      "capability gateway trackql_graphql for gateway.pagination.content_service",
    ].join("\n");
    const graphPath = path.join(tmpDir, "architecture.graph");
    fs.writeFileSync(graphPath, graph, "utf8");
    run(["graph", "plan", graphPath], tmpDir);
    run(["graph", "apply", graphPath], tmpDir);
    const useCase = path.join(
      tmpDir,
      "modules",
      "gateway",
      "application",
      "use_cases",
      "pagination",
      "list_contents.py"
    );
    assert(exists(useCase), "graph applied use case");
  });
});

test("refactor split moves prefixed artifacts", () => {
  withTempDir((tmpDir) => {
    initProject(tmpDir);
    run(["add", "use-case", "demo_service.auth_change_password"], tmpDir);
    run(["refactor", "split", "demo_service", "--into", "auth", "--by", "prefix"], tmpDir);
    const moved = path.join(
      tmpDir,
      "modules",
      "demo_service",
      "application",
      "use_cases",
      "auth",
      "auth_change_password.py"
    );
    assert(exists(moved), "use case moved into submodule");
  });
});

if (process.exitCode) {
  process.exit(process.exitCode);
}
