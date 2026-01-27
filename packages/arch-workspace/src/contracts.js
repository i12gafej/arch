class WorkspaceAdapter {
  readFile(path) {
    throw new Error("Not implemented");
  }

  writeFile(path, content) {
    throw new Error("Not implemented");
  }

  listTree(root) {
    throw new Error("Not implemented");
  }

  applyActions(actions) {
    throw new Error("Not implemented");
  }
}

class TemplateProvider {
  getTemplate(name) {
    throw new Error("Not implemented");
  }
}

module.exports = {
  WorkspaceAdapter,
  TemplateProvider,
};
