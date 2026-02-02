import React, { useRef } from "react";
import { useGraphStore } from "../../../application/store/graphStore.ts";
import { applyLayout } from "../../../application/usecases/applyLayout.ts";
import { clearStudioGraph } from "../../../application/usecases/clearStudioGraph.ts";
import { exportStudioGraph } from "../../../application/usecases/exportStudioGraph.ts";
import { importStudioGraph } from "../../../application/usecases/importStudioGraph.ts";
import { loadDemoGraph } from "../../../application/usecases/loadDemoGraph.ts";
import { saveStudioSnapshot } from "../../../application/usecases/saveStudioSnapshot.ts";
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
  const setError = useGraphStore((state) => state.setError);
  const clearError = useGraphStore((state) => state.clearError);

  function runLayout(mode) {
    applyLayout((layoutNodes, layoutEdges) => layoutGraph(mode, layoutNodes, layoutEdges));
  }

  function handleExport() {
    clearError();
    const payload = exportStudioGraph();
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
    const result = saveStudioSnapshot();
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
      const result = importStudioGraph(content);
      if (!result.ok) {
        setError(result.error || "Importacion invalida.");
        return;
      }
      runLayout(useGraphStore.getState().viewMode);
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function handleLoadDemo() {
    clearError();
    const confirmed = window.confirm("Esto reemplazara el grafo actual. Continuar?");
    if (!confirmed) {
      return;
    }
    loadDemoGraph("generic");
    runLayout("onion");
  }

  function handleReset() {
    clearError();
    const confirmed = window.confirm(
      "Esto eliminara TODO el grafo actual. Esta accion no se puede deshacer. Continuar?"
    );
    if (!confirmed) {
      return;
    }
    clearStudioGraph();
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
        <p>Design from domain to infrastructure with guided layers</p>
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
          <button className="danger" onClick={handleReset}>
            Clear
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
