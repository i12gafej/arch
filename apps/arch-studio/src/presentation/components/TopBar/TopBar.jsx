import React, { useRef } from "react";
import { useGraphStore } from "../../../application/store/graphStore.ts";
import { applyLayout } from "../../../application/usecases/applyLayout.ts";
import { buildDomainGraph, buildGraphSnapshot } from "../../../application/usecases/graphSnapshot.ts";
import { loadDemoGraph } from "../../../application/usecases/loadDemoGraph.ts";
import { validateGraph } from "../../../domain/graph/validators.ts";
import { exportGraph, importGraph, saveGraph } from "../../../infrastructure/adapters/persistenceAdapter.ts";
import { layoutGraph } from "../../layout/layoutEngine.ts";

const viewModes = [
  { id: "onion", label: "Onion" },
  { id: "hex", label: "Hex" },
  { id: "infra", label: "Infra" },
  { id: "distributed", label: "Distributed" },
];

export default function TopBar() {
  const fileInputRef = useRef(null);
  const viewMode = useGraphStore((state) => state.viewMode);
  const setViewMode = useGraphStore((state) => state.setViewMode);
  const hydrateGraph = useGraphStore((state) => state.hydrateGraph);
  const setError = useGraphStore((state) => state.setError);
  const clearError = useGraphStore((state) => state.clearError);
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);

  function runLayout(mode) {
    applyLayout((layoutNodes, layoutEdges) => layoutGraph(mode, layoutNodes, layoutEdges));
  }

  function handleExport() {
    clearError();
    const snapshot = buildGraphSnapshot(nodes, edges, viewMode);
    const payload = exportGraph(snapshot);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "archstudio-graph.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleSave() {
    clearError();
    const snapshot = buildGraphSnapshot(nodes, edges, viewMode);
    const result = saveGraph(snapshot);
    if (!result.ok) {
      setError(result.error || "No se pudo guardar el grafo.");
    }
  }

  function handleImport(event) {
    clearError();
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const content = loadEvent.target?.result;
      const result = importGraph(content);
      if (!result.ok) {
        setError(result.error || "Importacion invalida.");
        return;
      }
      const domainGraph = buildDomainGraph(result.payload.nodes || [], result.payload.edges || []);
      const errors = validateGraph(domainGraph);
      if (errors.length) {
        setError("El grafo importado contiene conexiones ilegales.");
        return;
      }
      hydrateGraph(result.payload);
      runLayout(viewMode);
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function handleLoadDemo() {
    clearError();
    const confirmed = window.confirm("Esto reemplazara el grafo actual. ¿Continuar?");
    if (!confirmed) {
      return;
    }
    loadDemoGraph("generic");
    runLayout("onion");
  }

  function handleReset() {
    clearError();
    const confirmed = window.confirm("Se reiniciara el demo desde cero. ¿Continuar?");
    if (!confirmed) {
      return;
    }
    loadDemoGraph("generic");
    runLayout("onion");
  }

  function handleAutoArrange() {
    clearError();
    runLayout(viewMode);
  }

  function openImport() {
    fileInputRef.current?.click();
  }

  return (
    <header className="topbar">
      <div>
        <h1>Arch Studio</h1>
        <p>Visual Architecture Compiler</p>
      </div>
      <div className="topbar__controls">
        <div className="toggle-group">
          {viewModes.map((mode) => (
            <button
              key={mode.id}
              className={viewMode === mode.id ? "pill pill--active" : "pill"}
              onClick={() => setViewMode(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <div className="topbar__actions">
          <button className="ghost" onClick={handleLoadDemo}>
            Load Demo
          </button>
          <button className="ghost" onClick={handleReset}>
            Reset Demo
          </button>
          <button className="ghost" onClick={handleAutoArrange}>
            Auto Arrange
          </button>
          <button className="ghost" onClick={handleSave}>
            Guardar
          </button>
          <button className="ghost" onClick={handleExport}>
            Exportar JSON
          </button>
          <button className="ghost" onClick={openImport}>
            Importar
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden-input"
            onChange={handleImport}
          />
        </div>
      </div>
    </header>
  );
}
