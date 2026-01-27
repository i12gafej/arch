const fs = require("fs");
const path = require("path");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function isDirEmpty(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return true;
  }
  const entries = fs.readdirSync(dirPath);
  return entries.length === 0;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  const payload = JSON.stringify(data, null, 2) + "\n";
  fs.writeFileSync(filePath, payload, "utf8");
}

function writeFile(filePath, content, options = {}) {
  const { ifNotExists = false, overwrite = false } = options;
  if (fs.existsSync(filePath)) {
    if (ifNotExists && !overwrite) {
      return false;
    }
    if (!overwrite) {
      return false;
    }
  }
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf8");
  return true;
}

function upsertRegion(filePath, regionId, content) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file for region update: ${filePath}`);
  }
  const file = fs.readFileSync(filePath, "utf8");
  const escaped = regionId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const startRe = new RegExp(`^([ \\t]*)# <arch:${escaped}>\\s*$`, "m");
  const endRe = new RegExp(`^([ \\t]*)# </arch:${escaped}>\\s*$`, "m");
  const startMatch = startRe.exec(file);
  const endMatch = endRe.exec(file);
  if (!startMatch || !endMatch) {
    throw new Error(`Region markers not found: ${regionId} in ${filePath}`);
  }
  const indent = startMatch[1] || "";
  const startPos = startMatch.index + startMatch[0].length;
  const endPos = endMatch.index;

  const lines = content ? content.split("\n") : [];
  const trimmedLines = lines.length === 1 && lines[0] === "" ? [] : lines;
  const body = trimmedLines.length
    ? `\n${trimmedLines.map((line) => indent + line).join("\n")}\n${indent}`
    : `\n${indent}`;

  const updated = file.slice(0, startPos) + body + file.slice(endPos);
  if (updated !== file) {
    fs.writeFileSync(filePath, updated, "utf8");
  }
}

module.exports = {
  ensureDir,
  isDirEmpty,
  readJson,
  writeJson,
  writeFile,
  upsertRegion,
};

