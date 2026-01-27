import React from "react";
import { ReactFlow, Background, Controls, MiniMap } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useGraphStore } from "../../../application/store/graphStore.ts";
import { connectNodes } from "../../../application/usecases/connectNodes.ts";
import { filterGraphByViewMode } from "../../../domain/graph/validators.ts";

const CONTAINER_KINDS = new Set(["service", "module", "submodule"]);
const NODE_SIZE = { width: 160, height: 60 };
const CONTAINER_DEFAULT = {
  service: { width: 520, height: 320, padding: 48 },
  module: { width: 420, height: 260, padding: 36 },
  submodule: { width: 320, height: 220, padding: 28 },
};

function buildGroupedNodes(nodes) {
  const moduleByName = new Map();
  const submoduleByKey = new Map();
  const serviceByName = new Map();
  const absPositions = new Map();
  const sizes = new Map();

  nodes.forEach((node) => {
    const kind = node.data?.kind;
    const name = node.data?.name || node.id;
    if (kind === "module") {
      moduleByName.set(name, node.id);
    }
    if (kind === "submodule") {
      const moduleId = node.data?.moduleId || "root";
      submoduleByKey.set(`${moduleId}:${name}`, node.id);
    }
    if (kind === "service") {
      serviceByName.set(name, node.id);
    }
    absPositions.set(node.id, { ...(node.position || { x: 0, y: 0 }) });
  });

  const parentById = new Map();
  nodes.forEach((node) => {
    const kind = node.data?.kind;
    if (kind === "submodule") {
      const moduleId = node.data?.moduleId;
      if (moduleId && moduleByName.has(moduleId)) {
        parentById.set(node.id, moduleByName.get(moduleId));
      }
      return;
    }
    if (kind === "module") {
      const serviceId = node.data?.serviceId;
      if (serviceId && serviceByName.has(serviceId)) {
        parentById.set(node.id, serviceByName.get(serviceId));
      }
      return;
    }

    const moduleId = node.data?.moduleId;
    const submoduleId = node.data?.submoduleId;
    if (moduleId && submoduleId && submoduleByKey.has(`${moduleId}:${submoduleId}`)) {
      parentById.set(node.id, submoduleByKey.get(`${moduleId}:${submoduleId}`));
    } else if (moduleId && moduleByName.has(moduleId)) {
      parentById.set(node.id, moduleByName.get(moduleId));
    }
  });

  function getNodeSize(nodeId) {
    if (sizes.has(nodeId)) {
      return sizes.get(nodeId);
    }
    return NODE_SIZE;
  }

  function computeContainerLayout(kind) {
    const containers = nodes.filter((node) => node.data?.kind === kind);
    containers.forEach((container) => {
      const children = nodes.filter((node) => parentById.get(node.id) === container.id);
      if (!children.length) {
        const defaults = CONTAINER_DEFAULT[kind];
        sizes.set(container.id, { width: defaults.width, height: defaults.height });
        return;
      }
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      children.forEach((child) => {
        const abs = absPositions.get(child.id);
        const size = getNodeSize(child.id);
        minX = Math.min(minX, abs.x);
        minY = Math.min(minY, abs.y);
        maxX = Math.max(maxX, abs.x + size.width);
        maxY = Math.max(maxY, abs.y + size.height);
      });
      const padding = CONTAINER_DEFAULT[kind].padding;
      const width = Math.max(CONTAINER_DEFAULT[kind].width, maxX - minX + padding * 2);
      const height = Math.max(CONTAINER_DEFAULT[kind].height, maxY - minY + padding * 2);
      const position = { x: minX - padding, y: minY - padding };
      absPositions.set(container.id, position);
      sizes.set(container.id, { width, height });
    });
  }

  computeContainerLayout("submodule");
  computeContainerLayout("module");
  computeContainerLayout("service");

  return nodes.map((node) => {
    const kind = node.data?.kind;
    const parentId = parentById.get(node.id);
    const abs = absPositions.get(node.id) || { x: 0, y: 0 };
    const parentAbs = parentId ? absPositions.get(parentId) : null;
    const position = parentAbs ? { x: abs.x - parentAbs.x, y: abs.y - parentAbs.y } : abs;
    const size = sizes.get(node.id);
    const style = size
      ? { width: size.width, height: size.height, padding: 12 }
      : undefined;

    const className = CONTAINER_KINDS.has(kind)
      ? `node-group node-group--${kind}`
      : node.className;

    return {
      ...node,
      position,
      parentNode: parentId || undefined,
      extent: parentId ? "parent" : undefined,
      className,
      style: style || node.style,
    };
  });
}

export default function Canvas() {
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const viewMode = useGraphStore((state) => state.viewMode);
  const applyNodeChanges = useGraphStore((state) => state.applyNodeChanges);
  const applyEdgeChanges = useGraphStore((state) => state.applyEdgeChanges);
  const selectNode = useGraphStore((state) => state.selectNode);
  const selectEdge = useGraphStore((state) => state.selectEdge);
  const clearSelection = useGraphStore((state) => state.clearSelection);
  const setError = useGraphStore((state) => state.setError);
  const clearError = useGraphStore((state) => state.clearError);

  const filtered = filterGraphByViewMode(nodes, edges, viewMode);
  const groupedNodes = buildGroupedNodes(filtered.nodes);

  function handleConnect(connection) {
    clearError();
    const result = connectNodes(connection.source, connection.target);
    if (!result.ok) {
      setError(result.error);
    }
  }

  function handleEdgeClick(_, edge) {
    selectEdge(edge.id);
  }

  function handleNodeClick(_, node) {
    selectNode(node.id);
  }

  function handlePaneClick() {
    clearSelection();
  }

  return (
    <section className="canvas">
      <ReactFlow
        nodes={groupedNodes}
        edges={filtered.edges}
        onNodesChange={applyNodeChanges}
        onEdgesChange={applyEdgeChanges}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        fitView
      >
        <MiniMap pannable zoomable />
        <Controls />
        <Background gap={24} />
      </ReactFlow>
    </section>
  );
}
