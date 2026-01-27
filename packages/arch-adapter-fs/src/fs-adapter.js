const fs = require("fs");
const path = require("path");

class FsWorkspaceAdapter {
  readFile(filePath) {
    return fs.readFileSync(filePath, "utf8");
  }

  writeFile(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
  }

  listTree(root) {
    const results = [];
    const stack = [root];
    while (stack.length) {
      const current = stack.pop();
      const stat = fs.statSync(current);
      if (stat.isDirectory()) {
        fs.readdirSync(current).forEach((entry) => stack.push(path.join(current, entry)));
      } else {
        results.push(current);
      }
    }
    return results;
  }

  applyActions(actions) {
    actions.forEach((action) => {
      if (action.type === "CreateFile") {
        this.writeFile(action.path, action.content || "");
      }
      if (action.type === "EnsureDir") {
        fs.mkdirSync(action.path, { recursive: true });
      }
      if (action.type === "MovePath") {
        fs.mkdirSync(path.dirname(action.to), { recursive: true });
        fs.renameSync(action.from, action.to);
      }
      if (action.type === "DeletePath") {
        fs.rmSync(action.path, { recursive: true, force: true });
      }
      if (action.type === "UpdateJson") {
        fs.mkdirSync(path.dirname(action.path), { recursive: true });
        fs.writeFileSync(action.path, JSON.stringify(action.value, null, 2) + "\n", "utf8");
      }
      if (action.type === "UpdateFileRegion") {
        const file = fs.readFileSync(action.path, "utf8");
        const escaped = action.regionId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const startRe = new RegExp(`^([ \t]*)# <arch:${escaped}>\\s*$`, "m");
        const endRe = new RegExp(`^([ \t]*)# </arch:${escaped}>\\s*$`, "m");
        const startMatch = startRe.exec(file);
        const endMatch = endRe.exec(file);
        if (!startMatch || !endMatch) {
          throw new Error(`Region markers not found: ${action.regionId} in ${action.path}`);
        }
        const indent = startMatch[1] || "";
        const startPos = startMatch.index + startMatch[0].length;
        const endPos = endMatch.index;
        const lines = action.content ? action.content.split("\n") : [];
        const body = lines.length
          ? `\n${lines.map((line) => indent + line).join("\n")}\n${indent}`
          : `\n${indent}`;
        const updated = file.slice(0, startPos) + body + file.slice(endPos);
        fs.writeFileSync(action.path, updated, "utf8");
      }
    });
  }
}

class FsTemplateProvider {
  constructor(root) {
    this.root = root;
  }

  getTemplate(name) {
    const filePath = path.join(this.root, name);
    return fs.readFileSync(filePath, "utf8");
  }
}

module.exports = {
  FsWorkspaceAdapter,
  FsTemplateProvider,
};
