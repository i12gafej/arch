const path = require("path");
const { ensureDir, writeFile } = require("../utils/fs");

function createPythonUvFastapiSkeleton(targetDir, project) {
  const modulesRoot = path.join(targetDir, project.paths.modulesRoot);
  const moduleRoot = path.join(modulesRoot, project.defaultModule);
  const deliveryRoot = path.join(targetDir, project.paths.deliveryRoot);

  const dirs = [
    path.join(targetDir, ".arch"),
    modulesRoot,
    moduleRoot,
    path.join(moduleRoot, "domain"),
    path.join(moduleRoot, "domain", "interfaces"),
    path.join(moduleRoot, "domain", "rules"),
    path.join(moduleRoot, "domain", "services"),
    path.join(moduleRoot, "domain", "value_objects"),
    path.join(moduleRoot, "domain", "entities"),
    path.join(moduleRoot, "application", "use_cases"),
    path.join(moduleRoot, "application", "dtos"),
    path.join(moduleRoot, "application", "ports"),
    path.join(moduleRoot, "application", "services"),
    path.join(moduleRoot, "application", "mappers"),
    path.join(moduleRoot, "infrastructure", "adapters"),
    path.join(moduleRoot, "infrastructure", "services"),
    path.join(moduleRoot, "infrastructure", "db", "sqlalchemy", "models"),
    path.join(moduleRoot, "infrastructure", "db", "sqlalchemy", "mappers"),
    path.join(moduleRoot, "delivery", "http", "routes"),
    path.join(moduleRoot, "bootstrap"),
    deliveryRoot,
    path.join(deliveryRoot, "routes"),
    path.join(targetDir, "tests", "unit"),
  ];

  dirs.forEach((dirPath) => ensureDir(dirPath));

  const gitignore = "__pycache__/\n*.pyc\n.env\n.venv\n";
  writeFile(path.join(targetDir, ".gitignore"), gitignore, { ifNotExists: true });

  const readme = `# ${project.name}\n\nArquitectura Clean/Hexagonal con crecimiento por modulos.\n\n## Inicio rapido\n\n- Crear proyecto: arch init --name ${project.name}\n- Agregar caso de uso: arch add use-case ${project.defaultModule}.change_password\n- Agregar puerto: arch add port ${project.defaultModule}.user_repository --methods \"get_user(id); save(user)\"\n- Bind: arch bind ${project.defaultModule}.user_repository --to sql_user_repository\n- Doctor: arch doctor\n- Fix: arch fix wiring\n- Plan: arch plan add use-case ${project.defaultModule}.change_password\n\n## Donde va la logica\n\n- Validacion de entrada: delivery/ + DTOs\n- Reglas de negocio: domain/rules + domain/interfaces + domain/services\n- Orquestacion e IO: application/use_cases + ports/adapters\n\n## Escalado\n\n- Mono-modulo (default): modules/${project.defaultModule}\n- Nuevo modulo: arch add module billing\n- Submodulo: arch add submodule ${project.defaultModule}.auth\n\nSugerencias automaticas:\n- Si un folder tiene demasiados archivos -> crear submodulo\n- Si un archivo crece demasiado -> dividir en reglas o servicios\n`;
  writeFile(path.join(targetDir, "README.md"), readme, { ifNotExists: true });

  const envExample = "# <arch:env>\n# </arch:env>\n";
  writeFile(path.join(targetDir, ".env.example"), envExample, { ifNotExists: true });

  const compose = "version: \"3.9\"\nservices:\n  # <arch:compose>\n  # </arch:compose>\n";
  writeFile(path.join(targetDir, "docker-compose.yml"), compose, { ifNotExists: true });

  const pyproject = `[project]\nname = \"${project.name}\"\nversion = \"0.1.0\"\ndescription = \"\"\nrequires-python = \">=3.11\"\ndependencies = [\n  \"fastapi>=0.110\",\n  \"uvicorn>=0.27\",\n  \"pydantic>=2.0\",\n]\n\n[project.optional-dependencies]\ndev = [\n  \"pytest>=8\",\n  \"ruff>=0.1\",\n]\n\n[tool.ruff]\nline-length = 100\n`;
  writeFile(path.join(targetDir, "pyproject.toml"), pyproject, { ifNotExists: true });

  const moduleInit = "__all__ = [\"domain\", \"application\", \"infrastructure\", \"delivery\", \"bootstrap\"]\n";
  writeFile(path.join(moduleRoot, "__init__.py"), moduleInit, { ifNotExists: true });

  const moduleReadme = `# Module ${project.defaultModule}\n\nDominio principal del servicio.\n\n## Capas\n\n- domain/: reglas, value objects, interfaces, servicios de dominio\n- application/: casos de uso, puertos, mappers, services\n- infrastructure/: adapters, db, services\n- delivery/: rutas HTTP\n- bootstrap/: wiring del modulo\n`;
  writeFile(path.join(moduleRoot, "README.md"), moduleReadme, { ifNotExists: true });

  const packageInits = [
    path.join(modulesRoot, "__init__.py"),
    path.join(moduleRoot, "domain", "__init__.py"),
    path.join(moduleRoot, "domain", "interfaces", "__init__.py"),
    path.join(moduleRoot, "domain", "rules", "__init__.py"),
    path.join(moduleRoot, "domain", "services", "__init__.py"),
    path.join(moduleRoot, "domain", "value_objects", "__init__.py"),
    path.join(moduleRoot, "domain", "entities", "__init__.py"),
    path.join(moduleRoot, "application", "__init__.py"),
    path.join(moduleRoot, "application", "use_cases", "__init__.py"),
    path.join(moduleRoot, "application", "dtos", "__init__.py"),
    path.join(moduleRoot, "application", "ports", "__init__.py"),
    path.join(moduleRoot, "application", "services", "__init__.py"),
    path.join(moduleRoot, "application", "mappers", "__init__.py"),
    path.join(moduleRoot, "infrastructure", "__init__.py"),
    path.join(moduleRoot, "infrastructure", "adapters", "__init__.py"),
    path.join(moduleRoot, "infrastructure", "services", "__init__.py"),
    path.join(moduleRoot, "infrastructure", "db", "sqlalchemy", "models", "__init__.py"),
    path.join(moduleRoot, "infrastructure", "db", "sqlalchemy", "mappers", "__init__.py"),
    path.join(moduleRoot, "delivery", "__init__.py"),
    path.join(moduleRoot, "delivery", "http", "__init__.py"),
    path.join(moduleRoot, "delivery", "http", "routes", "__init__.py"),
    path.join(moduleRoot, "bootstrap", "__init__.py"),
    path.join(deliveryRoot, "__init__.py"),
    path.join(deliveryRoot, "routes", "__init__.py"),
  ];
  packageInits.forEach((filePath) => writeFile(filePath, "", { ifNotExists: true }));

  const appPy = `from fastapi import FastAPI\nfrom .routes.health import router as health_router\n# <arch:routes:imports>\n# </arch:routes:imports>\n\n\ndef create_app() -> FastAPI:\n    app = FastAPI()\n    app.include_router(health_router)\n    # <arch:routes:include>\n    # </arch:routes:include>\n    return app\n`;
  writeFile(path.join(deliveryRoot, "app.py"), appPy, { ifNotExists: true });

  const healthPy = "from fastapi import APIRouter\n\nrouter = APIRouter()\n\n\n@router.get(\"/health\")\ndef health() -> dict:\n    return {\"status\": \"ok\"}\n";
  writeFile(path.join(deliveryRoot, "routes", "health.py"), healthPy, { ifNotExists: true });

  const moduleRouterPy = "from fastapi import APIRouter\n\nrouter = APIRouter()\n\n# <arch:routes>\n# </arch:routes>\n";
  writeFile(path.join(moduleRoot, "delivery", "http", "router.py"), moduleRouterPy, {
    ifNotExists: true,
  });

  const containerPy = "from __future__ import annotations\n\n# <arch:bindings>\n# </arch:bindings>\n\n# <arch:use_cases>\n# </arch:use_cases>\n";
  writeFile(path.join(moduleRoot, "bootstrap", "container.py"), containerPy, { ifNotExists: true });

  const settingsPy = "from __future__ import annotations\n\n# <arch:settings>\n# </arch:settings>\n";
  writeFile(path.join(moduleRoot, "bootstrap", "settings.py"), settingsPy, { ifNotExists: true });

  const testHealth = "from delivery.http.app import create_app\n\n\ndef test_health_route() -> None:\n    app = create_app()\n    assert app is not None\n";
  writeFile(path.join(targetDir, "tests", "unit", "test_health.py"), testHealth, { ifNotExists: true });
}

module.exports = {
  createPythonUvFastapiSkeleton,
};
