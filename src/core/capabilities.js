const fs = require("fs");
const path = require("path");
const { writeFile, upsertRegion, ensureDir } = require("../utils/fs");

const CAPABILITIES_ROOT = path.join(__dirname, "..", "..", "capabilities");

function listCapabilities() {
  if (!fs.existsSync(CAPABILITIES_ROOT)) {
    return [];
  }
  return fs
    .readdirSync(CAPABILITIES_ROOT)
    .filter((entry) => fs.statSync(path.join(CAPABILITIES_ROOT, entry)).isDirectory());
}

function loadCapability(id) {
  const filePath = path.join(CAPABILITIES_ROOT, id, "capability.json");
  if (!fs.existsSync(filePath)) {
    throw new Error(`Capability not found: ${id}`);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const capability = JSON.parse(raw);
  capability._root = path.join(CAPABILITIES_ROOT, id);
  return capability;
}

function renderTemplate(templatePath, data) {
  const raw = fs.readFileSync(templatePath, "utf8");
  return raw.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => {
    if (data[key] === undefined || data[key] === null) {
      return "";
    }
    return String(data[key]);
  });
}

function ensureSettingsFile(moduleRoot) {
  const filePath = path.join(moduleRoot, "bootstrap", "settings.py");
  if (!fs.existsSync(filePath)) {
    const content = "from __future__ import annotations\n\n# <arch:settings>\n# </arch:settings>\n";
    writeFile(filePath, content, { ifNotExists: true });
  }
  return filePath;
}

function ensureEnvFile(projectRoot) {
  const filePath = path.join(projectRoot, ".env.example");
  if (!fs.existsSync(filePath)) {
    const content = "# <arch:env>\n# </arch:env>\n";
    writeFile(filePath, content, { ifNotExists: true });
  }
  return filePath;
}

function ensureComposeFile(projectRoot) {
  const filePath = path.join(projectRoot, "docker-compose.yml");
  if (!fs.existsSync(filePath)) {
    const content = "version: \"3.9\"\nservices:\n  # <arch:compose>\n  # </arch:compose>\n";
    writeFile(filePath, content, { ifNotExists: true });
  }
  return filePath;
}

function collectCapabilityIds(project) {
  const ids = new Set();
  Object.values(project.modules).forEach((moduleEntry) => {
    (moduleEntry.capabilities || []).forEach((cap) => ids.add(cap.id));
  });
  return Array.from(ids);
}

function updateSettingsFromCapabilities(projectRoot, project) {
  Object.entries(project.modules).forEach(([moduleId, moduleEntry]) => {
    const moduleRoot = path.join(projectRoot, project.paths.modulesRoot, moduleId);
    const settingsFile = ensureSettingsFile(moduleRoot);
    const lines = [];
    const seen = new Set();
    (moduleEntry.capabilities || []).forEach((cap) => {
      const definition = loadCapability(cap.id);
      (definition.settings || []).forEach((line) => {
        if (!seen.has(line)) {
          seen.add(line);
          lines.push(line);
        }
      });
    });
    upsertRegion(settingsFile, "settings", lines.join("\n"));
  });
}

function updateEnvFromCapabilities(projectRoot, project) {
  const envFile = ensureEnvFile(projectRoot);
  const lines = [];
  const seen = new Set();
  collectCapabilityIds(project).forEach((capId) => {
    const definition = loadCapability(capId);
    (definition.env || []).forEach((envEntry) => {
      const line = `${envEntry.key}=${envEntry.value}`;
      if (!seen.has(line)) {
        seen.add(line);
        lines.push(line);
      }
    });
  });
  upsertRegion(envFile, "env", lines.join("\n"));
}

function updateComposeFromCapabilities(projectRoot, project) {
  const composeFile = ensureComposeFile(projectRoot);
  const lines = [];
  const seen = new Set();
  collectCapabilityIds(project).forEach((capId) => {
    const definition = loadCapability(capId);
    (definition.compose || []).forEach((line) => {
      if (!seen.has(line)) {
        seen.add(line);
        lines.push(line);
      }
    });
    if ((definition.compose || []).length > 0) {
      lines.push("");
    }
  });
  upsertRegion(composeFile, "compose", lines.join("\n").trimEnd());
}

function applyCapabilities(projectRoot, project) {
  ensureDir(path.join(projectRoot, project.paths.modulesRoot));
  updateSettingsFromCapabilities(projectRoot, project);
  updateEnvFromCapabilities(projectRoot, project);
  updateComposeFromCapabilities(projectRoot, project);
}

module.exports = {
  listCapabilities,
  loadCapability,
  renderTemplate,
  applyCapabilities,
  ensureSettingsFile,
  ensureEnvFile,
  ensureComposeFile,
};
