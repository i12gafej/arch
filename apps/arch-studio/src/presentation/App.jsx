import React, { useEffect, useRef } from "react";
import Canvas from "./components/Canvas/Canvas.jsx";
import NodePalette from "./components/NodePalette/NodePalette.jsx";
import Inspector from "./components/Inspector/Inspector.jsx";
import PlanPanel from "./components/PlanPanel/PlanPanel.jsx";
import TopBar from "./components/TopBar/TopBar.jsx";
import { useGraphStore } from "../application/store/graphStore.ts";
import { applyLayout } from "../application/usecases/applyLayout.ts";
import { bootstrapStudio } from "../application/usecases/bootstrapStudio.ts";
import { saveStudioSnapshot } from "../application/usecases/saveStudioSnapshot.ts";
import { layoutGraph } from "./layout/layoutEngine.ts";

export default function App() {
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const viewMode = useGraphStore((state) => state.viewMode);
  const hasHydrated = useRef(false);

  function runLayout(mode) {
    applyLayout((layoutNodes, layoutEdges) => layoutGraph(mode, layoutNodes, layoutEdges));
  }

  useEffect(() => {
    bootstrapStudio();
    runLayout(useGraphStore.getState().viewMode);
    hasHydrated.current = true;
  }, []);

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
    saveStudioSnapshot();
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
