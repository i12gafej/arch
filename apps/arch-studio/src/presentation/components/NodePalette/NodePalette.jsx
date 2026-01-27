import React from "react";
import { NodeKindList } from "../../../domain/graph/nodeTypes.ts";
import { createNode } from "../../../application/usecases/createNode.ts";
import { useGraphStore } from "../../../application/store/graphStore.ts";

const categoryOrder = ["Structure", "Core", "Boundary", "Infra", "API"];

function groupByCategory() {
  const grouped = {};
  for (const node of NodeKindList) {
    if (!grouped[node.category]) {
      grouped[node.category] = [];
    }
    grouped[node.category].push(node);
  }
  return grouped;
}

export default function NodePalette() {
  const nodesCount = useGraphStore((state) => state.nodes.length);
  const clearError = useGraphStore((state) => state.clearError);

  const grouped = groupByCategory();

  function handleAdd(kind) {
    clearError();
    createNode(
      kind,
      {},
      { x: 180 + nodesCount * 24, y: 140 + nodesCount * 32 }
    );
  }

  return (
    <section className="panel panel--left">
      <div className="panel__header">
        <h2>Nodos</h2>
        <p>Arrastra la arquitectura por tipo</p>
      </div>
      {categoryOrder.map((category) => (
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
