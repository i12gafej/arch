const path = require("path");
const { ensureDir, writeJson } = require("../utils/fs");

function recordOperation(projectRoot, entry) {
  const opsDir = path.join(projectRoot, ".arch", "ops");
  ensureDir(opsDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeCmd = entry.cmd.replace(/[^a-zA-Z0-9_-]+/g, "_");
  const fileName = `${timestamp}_${safeCmd}.json`;
  const filePath = path.join(opsDir, fileName);
  writeJson(filePath, {
    id: entry.id || `OP-${timestamp}`,
    cmd: entry.cmd,
    at: new Date().toISOString(),
    actions: entry.actions || [],
  });
}

module.exports = {
  recordOperation,
};
