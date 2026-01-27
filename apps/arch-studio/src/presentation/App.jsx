import React, { useEffect, useRef } from "react";
import Canvas from "./components/Canvas/Canvas.jsx";
import NodePalette from "./components/NodePalette/NodePalette.jsx";
import Inspector from "./components/Inspector/Inspector.jsx";
import PlanPanel from "./components/PlanPanel/PlanPanel.jsx";
import TopBar from "./components/TopBar/TopBar.jsx";
import { useGraphStore } from "../application/store/graphStore.ts";
import { applyLayout } from "../application/usecases/applyLayout.ts";
import { buildDomainGraph, buildGraphSnapshot } from "../application/usecases/graphSnapshot.ts";
import { loadDemoGraph } from "../application/usecases/loadDemoGraph.ts";
import { validateGraph } from "../domain/graph/validators.ts";
import { loadGraph, saveGraph } from "../infrastructure/adapters/persistenceAdapter.ts";
import { layoutGraph } from "./layout/index.ts";

export default function App() {
  const hydrateGraph = useGraphStore((state) => state.hydrateGraph);
  const setError = useGraphStore((state) => state.setError);
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const viewMode = useGraphStore((state) => state.viewMode);
  const hasHydrated = useRef(false);

  function runLayout(mode) {
    applyLayout((layoutNodes, layoutEdges) => layoutGraph(mode, layoutNodes, layoutEdges));
  }

  useEffect(() => {
    const stored = loadGraph();
    if (stored) {
      const domainGraph = buildDomainGraph(stored.nodes || [], stored.edges || []);
      const errors = validateGraph(domainGraph);
      if (errors.length) {
        setError("El grafo guardado contiene conexiones ilegales.");
      } else {
        hydrateGraph(stored);
      }
    } else {
      loadDemoGraph("generic");
    }
    runLayout(useGraphStore.getState().viewMode);
    hasHydrated.current = true;
  }, [hydrateGraph, setError]);

  useEffect(() => {
    if (!hasHydrated.current) {
      return;
    }
    runLayout(viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (!hasHydrated.current) {
      return;
    }
    const snapshot = buildGraphSnapshot(nodes, edges, viewMode);
    saveGraph(snapshot);
  }, [nodes, edges, viewMode]);

  return (
    <div className="studio" data-view={viewMode}>
      <TopBar />
      <NodePalette />
      <Canvas />
      <Inspector />
      <PlanPanel />
    </div>
  );
}
