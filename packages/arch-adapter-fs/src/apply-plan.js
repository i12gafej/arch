const path = require("path");
const fs = require("fs");

function applyCommandPlan(commands, projectRoot) {
  const cliRoot = path.resolve(__dirname, "..", "..", "..", "packages", "arch-cli");
  const cli = path.join(cliRoot, "bin", "arch.js");
  commands.forEach((cmd) => {
    if (cmd.type !== "cmd") {
      return;
    }
    const parts = cmd.path.split(" ").slice(1);
    const { spawnSync } = require("child_process");
    const result = spawnSync("node", [cli, ...parts], { cwd: projectRoot, encoding: "utf8" });
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || "Command failed");
    }
  });
}

module.exports = {
  applyCommandPlan,
};
