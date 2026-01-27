const { validateGraph, validateIR } = require("./rules");

function compileGraphToAST(graph) {
  return {
    nodes: graph.nodes,
    edges: graph.edges,
  };
}

function compileASTToIR(ast, baseIR) {
  const ir = baseIR ? JSON.parse(JSON.stringify(baseIR)) : { modules: {} };

  ast.nodes.forEach((node) => {
    if (node.kind === "module") {
      if (!ir.modules[node.id]) {
        ir.modules[node.id] = {
          id: node.id,
          name: node.metadata?.name || node.id,
          submodules: {},
          apiSurfaces: [],
          useCases: [],
          rules: [],
          domainInterfaces: [],
          domainServices: [],
          appServices: [],
          models: [],
          dtos: [],
          persistenceModels: [],
          relations: [],
          ports: [],
          bindings: [],
          capabilities: [],
        };
      }
    }
  });

  ast.nodes.forEach((node) => {
    if (node.kind === "submodule") {
      const moduleEntry = ir.modules[node.module];
      if (moduleEntry) {
        moduleEntry.submodules[node.id] = { id: node.id, name: node.metadata?.name || node.id };
      }
    }
    if (node.kind === "api_surface" && node.metadata?.type === "http") {
      const moduleEntry = ir.modules[node.module];
      if (moduleEntry) {
        moduleEntry.apiSurfaces.push({
          type: "http",
          mount: node.metadata?.mount || `/${node.module}`,
          routerFile: "delivery/http/router.py",
        });
      }
    }
    if (node.kind === "use_case") {
      const moduleEntry = ir.modules[node.module];
      if (moduleEntry) {
        moduleEntry.useCases.push({
          id: node.id,
          name: node.metadata?.name || node.id,
          submodule: node.submodule || null,
          route: node.metadata?.route || null,
        });
      }
    }
    if (node.kind === "domain_interface") {
      const moduleEntry = ir.modules[node.module];
      if (moduleEntry) {
        moduleEntry.domainInterfaces.push({
          id: node.id,
          name: node.metadata?.name || node.id,
          kind: node.metadata?.kind || "policy",
          submodule: node.submodule || null,
        });
      }
    }
    if (node.kind === "domain_service") {
      const moduleEntry = ir.modules[node.module];
      if (moduleEntry) {
        moduleEntry.domainServices.push({
          id: node.id,
          name: node.metadata?.name || node.id,
          submodule: node.submodule || null,
          implements: node.metadata?.implements || null,
        });
      }
    }
    if (node.kind === "application_service") {
      const moduleEntry = ir.modules[node.module];
      if (moduleEntry) {
        moduleEntry.appServices.push({
          id: node.id,
          name: node.metadata?.name || node.id,
          submodule: node.submodule || null,
          uses: node.metadata?.uses || [],
        });
      }
    }
    if (node.kind === "port") {
      const moduleEntry = ir.modules[node.module];
      if (moduleEntry) {
        moduleEntry.ports.push({
          id: node.id,
          name: node.metadata?.name || node.id,
          submodule: node.submodule || null,
          methods: node.metadata?.methods || [],
        });
      }
    }
    if (node.kind === "adapter") {
      const moduleEntry = ir.modules[node.module];
      if (moduleEntry) {
        moduleEntry.bindings.push({
          port: node.metadata?.port || "",
          adapter: node.metadata?.name || node.id,
          submodule: node.submodule || null,
        });
      }
    }
    if (node.kind === "capability") {
      const moduleEntry = ir.modules[node.module];
      if (moduleEntry) {
        moduleEntry.capabilities.push({
          id: node.id,
          submodule: node.submodule || null,
          port: node.metadata?.port || null,
        });
      }
    }
  });

  return ir;
}

function compileGraph(graph, baseIR) {
  const errors = validateGraph(graph);
  if (errors.length) {
    return { errors };
  }
  const ast = compileGraphToAST(graph);
  const ir = compileASTToIR(ast, baseIR);
  const irErrors = validateIR(ir);
  if (irErrors.length) {
    return { errors: irErrors };
  }
  return { ast, ir, errors: [] };
}

function planFromGraph(graph) {
  const errors = validateGraph(graph);
  if (errors.length) {
    return { errors };
  }
  const plan = graph.nodes.map((node) => ({
    type: "create_node",
    node,
  }));
  return { plan, errors: [] };
}

module.exports = {
  compileGraph,
  compileGraphToAST,
  compileASTToIR,
  planFromGraph,
};
