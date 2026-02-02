import React from "react";
import { createNode } from "../../../application/usecases/createNode.ts";
import { applyLayout } from "../../../application/usecases/applyLayout.ts";
import { createDomainSlice } from "../../../application/usecases/createDomainSlice.ts";
import { useGraphStore } from "../../../application/store/graphStore.ts";
import { layoutGraph } from "../../layout/layoutEngine.ts";
import {
  getNodeLabel,
  getPaletteEntries,
  paletteCategoryOrder,
} from "../../catalog/nodeCatalog.ts";

function groupByCategory() {
  const entries = getPaletteEntries();
  const grouped = {};
  for (const node of entries) {
    if (!grouped[node.category]) {
      grouped[node.category] = [];
    }
    grouped[node.category].push(node);
  }
  return grouped;
}

export default function NodePalette() {
  const nodesCount = useGraphStore((state) => state.nodes.length);
  const nodes = useGraphStore((state) => state.nodes);
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const viewMode = useGraphStore((state) => state.viewMode);
  const clearError = useGraphStore((state) => state.clearError);
  const setError = useGraphStore((state) => state.setError);

  const grouped = groupByCategory();

  function getNodeById(id) {
    return nodes.find((node) => node.id === id);
  }

  function getSelectedContext() {
    const selected = getNodeById(selectedNodeId);
    if (!selected) {
      return null;
    }
    const kind = selected.data?.kind;
    const name = selected.data?.name || "";
    const moduleId = selected.data?.moduleId || "";
    const submoduleId = selected.data?.submoduleId || "";
    const serviceId = selected.data?.serviceId || "";

    if (kind === "service") {
      return { kind, serviceId: name };
    }
    if (kind === "module") {
      return { kind, moduleId: name, serviceId };
    }
    if (kind === "submodule") {
      return { kind, moduleId, submoduleId: name, serviceId };
    }
    if (moduleId || submoduleId) {
      return { kind, moduleId, submoduleId, serviceId };
    }
    return { kind };
  }

  function requiresModuleSelection(kind) {
    return !["service", "module", "submodule"].includes(kind);
  }

  function buildInsertInitial(kind, context) {
    if (kind === "service") {
      return {};
    }

    if (kind === "module") {
      if (context?.kind === "service") {
        return { serviceId: context.serviceId };
      }
      if (context?.serviceId) {
        return { serviceId: context.serviceId };
      }
      return {};
    }

    if (kind === "submodule") {
      if (context?.kind === "module") {
        return { moduleId: context.moduleId };
      }
      if (context?.kind === "submodule") {
        return { moduleId: context.moduleId };
      }
      return {};
    }

    if (context?.kind === "submodule") {
      return { moduleId: context.moduleId, submoduleId: context.submoduleId };
    }
    if (context?.kind === "module") {
      return { moduleId: context.moduleId };
    }
    return {};
  }

  function handleAdd(kind) {
    clearError();
    const label = getNodeLabel(kind);
    const context = getSelectedContext();

    if (requiresModuleSelection(kind)) {
      const validTarget =
        context?.kind === "module" || context?.kind === "submodule";
      if (!validTarget) {
        setError(
          `Selecciona/pulsa el modulo o submodulo donde quieres insertar ${label}.`
        );
        return;
      }
    }

    if (kind === "submodule" && context?.kind !== "module" && context?.kind !== "submodule") {
      setError("Selecciona/pulsa primero un modulo donde insertar el submodulo.");
      return;
    }

    const initial = buildInsertInitial(kind, context);
    const result = createNode(
      kind,
      initial,
      { x: 180 + nodesCount * 24, y: 140 + nodesCount * 32 }
    );
    if (!result.ok) {
      setError(result.error || `No se pudo crear ${label}.`);
      return;
    }
    applyLayout((layoutNodes, layoutEdges) =>
      layoutGraph(viewMode, layoutNodes, layoutEdges)
    );
  }

  function resolveTargetContext(context) {
    if (context?.kind === "submodule") {
      return { moduleId: context.moduleId, submoduleId: context.submoduleId };
    }
    if (context?.kind === "module") {
      return { moduleId: context.moduleId };
    }
    return null;
  }

  function handleCreateDomainSlice() {
    clearError();
    const context = resolveTargetContext(getSelectedContext());
    if (!context?.moduleId) {
      setError("Selecciona/pulsa el modulo o submodulo donde quieres crear la feature de dominio.");
      return;
    }
    const featureName = window.prompt("Nombre base de la feature (ej: account):", "account");
    if (!featureName) {
      return;
    }
    const result = createDomainSlice({ ...context, name: featureName });
    if (!result.ok) {
      setError(result.error || "No se pudo crear la feature de dominio.");
      return;
    }
    applyLayout((layoutNodes, layoutEdges) =>
      layoutGraph(viewMode, layoutNodes, layoutEdges)
    );
  }

  return (
    <section className="panel panel--left">
      <div className="panel__header">
        <h2>Nodos</h2>
        <p>Diseña por capas: dominio -&gt; aplicacion -&gt; boundary -&gt; infraestructura</p>
      </div>
      <div className="panel__section">
        <h3>Guided</h3>
        <div className="palette">
          <button className="pill" onClick={handleCreateDomainSlice}>
            Domain Slice (guided)
          </button>
        </div>
      </div>
      {paletteCategoryOrder.map((category) => (
        <div className="panel__section" key={category}>
          <h3>{category}</h3>
          <div className="palette">
            {(grouped[category] || []).map((node) => (
              <button key={node.kind} className="pill" onClick={() => handleAdd(node.kind)}>
                {node.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
