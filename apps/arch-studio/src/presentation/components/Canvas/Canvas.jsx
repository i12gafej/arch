import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGraphStore } from "../../../application/store/graphStore.ts";
import { filterGraphByViewMode } from "../../../domain/graph/validators.ts";
import { NodeKinds } from "../../../domain/graph/nodeTypes.ts";

const GROUP_KINDS = new Set(["service", "module", "submodule"]);
const NODE_SIZES = {
  use_case: { w: 200, h: 52 },
  domain_interface: { w: 200, h: 52 },
  domain_service: { w: 200, h: 52 },
  application_service: { w: 200, h: 52 },
  port: { w: 210, h: 44 },
  adapter: { w: 200, h: 52 },
  capability: { w: 180, h: 48 },
  api_surface: { w: 200, h: 52 },
  service: { w: 1100, h: 640 },
  module: { w: 540, h: 360 },
  submodule: { w: 420, h: 220 },
  fallback: { w: 180, h: 44 },
};

const HEADER_HEIGHT = 44;
const PADDING = 14;

function getKind(node) {
  return node?.data?.kind || node?.kind || "unknown";
}

function getLabel(node) {
  return node?.data?.label || node?.data?.name || node?.id || "";
}

function getNodeSize(node) {
  if (node?.style?.width && node?.style?.height) {
    return { w: node.style.width, h: node.style.height };
  }
  const kind = getKind(node);
  return NODE_SIZES[kind] || NODE_SIZES.fallback;
}

function getMeta(node) {
  const kind = getKind(node);
  if (kind === "port") {
    return node.data?.methods || "";
  }
  if (kind === "adapter") {
    return node.data?.implements || "";
  }
  if (kind === "domain_interface") {
    return node.data?.interfaceKind || "";
  }
  if (kind === "domain_service") {
    return node.data?.implements || "";
  }
  if (kind === "use_case") {
    return node.data?.route || "";
  }
  if (kind === "api_surface") {
    return node.data?.mount || "";
  }
  return "";
}

function buildTree(nodes) {
  const childrenByParent = new Map();
  nodes.forEach((node) => {
    const parentId = node.parentNode || "root";
    if (!childrenByParent.has(parentId)) {
      childrenByParent.set(parentId, []);
    }
    childrenByParent.get(parentId).push(node);
  });
  childrenByParent.forEach((list) => {
    list.sort((a, b) => {
      const kindA = getKind(a);
      const kindB = getKind(b);
      if (kindA !== kindB) {
        return kindA.localeCompare(kindB);
      }
      const nameA = a.data?.name || a.id;
      const nameB = b.data?.name || b.id;
      return nameA.localeCompare(nameB);
    });
  });
  return childrenByParent;
}

export default function Canvas() {
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const viewMode = useGraphStore((state) => state.viewMode);
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const selectNode = useGraphStore((state) => state.selectNode);
  const clearSelection = useGraphStore((state) => state.clearSelection);
  const setNodes = useGraphStore((state) => state.setNodes);

  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const filtered = useMemo(
    () => filterGraphByViewMode(nodes, edges, viewMode),
    [nodes, edges, viewMode]
  );

  const childrenByParent = useMemo(
    () => buildTree(filtered.nodes),
    [filtered.nodes]
  );

  const nodeById = useMemo(() => {
    const map = new Map();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodes]);

  const [view, setView] = useState({ zoom: 1, panX: 80, panY: 60 });
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const viewportRef = useRef(null);
  const spaceDown = useRef(false);
  const panState = useRef(null);
  const dragState = useRef(null);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.code === "Space") {
        spaceDown.current = true;
      }
    }
    function handleKeyUp(event) {
      if (event.code === "Space") {
        spaceDown.current = false;
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const setViewSafe = useCallback((next) => {
    viewRef.current = next;
    setView(next);
  }, []);

  const handleWheel = useCallback((event) => {
    event.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const { zoom, panX, panY } = viewRef.current;
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    if (event.ctrlKey || event.metaKey) {
      const delta = -event.deltaY;
      const factor = Math.exp(delta * 0.0012);
      const nextZoom = Math.min(3, Math.max(0.25, zoom * factor));
      const worldX = (offsetX - panX) / zoom;
      const worldY = (offsetY - panY) / zoom;
      const nextPanX = offsetX - worldX * nextZoom;
      const nextPanY = offsetY - worldY * nextZoom;
      setViewSafe({ zoom: nextZoom, panX: nextPanX, panY: nextPanY });
      return;
    }
    setViewSafe({
      zoom,
      panX: panX - event.deltaX,
      panY: panY - event.deltaY,
    });
  }, [setViewSafe]);

  const startPan = useCallback((event) => {
    const isLeft = event.button === 0;
    const isMiddle = event.button === 1;
    const isRight = event.button === 2;
    const target = event.target;
    const isDragHandle = target?.closest?.("[data-drag-handle]");
    if (isDragHandle) {
      return;
    }
    const wantsPan =
      (isLeft && spaceDown.current) ||
      isMiddle ||
      isRight;
    if (!wantsPan) {
      return;
    }
    panState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: viewRef.current.panX,
      panY: viewRef.current.panY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  const handlePointerMove = useCallback((event) => {
    if (panState.current && panState.current.pointerId === event.pointerId) {
      const dx = event.clientX - panState.current.startX;
      const dy = event.clientY - panState.current.startY;
      setViewSafe({
        zoom: viewRef.current.zoom,
        panX: panState.current.panX + dx,
        panY: panState.current.panY + dy,
      });
      return;
    }
  }, [setViewSafe]);

  const stopPan = useCallback((event) => {
    if (panState.current && panState.current.pointerId === event.pointerId) {
      panState.current = null;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  }, []);

  function updateNodePosition(nodeId, nextPosition) {
    const nextNodes = nodesRef.current.map((node) => {
      if (node.id !== nodeId) {
        return node;
      }
      return { ...node, position: nextPosition };
    });
    nodesRef.current = nextNodes;
    setNodes(nextNodes);
  }

  function clampToParent(nodeId, next) {
    const node = nodeById.get(nodeId);
    if (!node?.parentNode) {
      return next;
    }
    const parent = nodeById.get(node.parentNode);
    if (!parent) {
      return next;
    }
    const parentSize = getNodeSize(parent);
    const nodeSize = getNodeSize(node);
    const minX = PADDING;
    const minY = HEADER_HEIGHT + PADDING;
    const maxX = Math.max(minX, parentSize.w - nodeSize.w - PADDING);
    const maxY = Math.max(minY, parentSize.h - nodeSize.h - PADDING);
    return {
      x: Math.min(maxX, Math.max(minX, next.x)),
      y: Math.min(maxY, Math.max(minY, next.y)),
    };
  }

  const startDrag = useCallback(
    (event, nodeId) => {
      if (event.button !== 0) {
        return;
      }
      event.stopPropagation();
      const node = nodeById.get(nodeId);
      if (!node) {
        return;
      }
      dragState.current = {
        nodeId,
        startX: event.clientX,
        startY: event.clientY,
        originX: node.position?.x || 0,
        originY: node.position?.y || 0,
      };

      function handleMove(moveEvent) {
        if (!dragState.current || dragState.current.nodeId !== nodeId) {
          return;
        }
        const { zoom } = viewRef.current;
        const dx = (moveEvent.clientX - dragState.current.startX) / zoom;
        const dy = (moveEvent.clientY - dragState.current.startY) / zoom;
        const nextPos = clampToParent(nodeId, {
          x: dragState.current.originX + dx,
          y: dragState.current.originY + dy,
        });
        updateNodePosition(nodeId, nextPos);
      }

      function handleUp() {
        dragState.current = null;
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        window.removeEventListener("pointercancel", handleUp);
      }

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      window.addEventListener("pointercancel", handleUp);
    },
    [nodeById]
  );

  function handleViewportClick(event) {
    if (event.target === event.currentTarget) {
      clearSelection();
    }
  }

  function renderNode(node) {
    const kind = getKind(node);
    const isGroup = GROUP_KINDS.has(kind);
    const size = getNodeSize(node);
    const children = childrenByParent.get(node.id) || [];
    const label = getLabel(node);
    const meta = getMeta(node);
    const className = [
      "bb-node",
      isGroup ? "bb-group" : "bb-card",
      node.className || "",
      selectedNodeId === node.id ? "is-selected" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const style = {
      width: size.w,
      height: size.h,
      left: node.position?.x || 0,
      top: node.position?.y || 0,
    };

    if (isGroup) {
      const groupLabel = `${NodeKinds[kind]?.label || kind}: ${node.data?.name || ""}`;
      return (
        <div key={node.id} className={className} style={style} data-kind={kind}>
          <div
            className="bb-header"
            data-drag-handle
            onPointerDown={(event) => startDrag(event, node.id)}
            onClick={() => selectNode(node.id)}
          >
            <span className="bb-title">{groupLabel}</span>
          </div>
          <div className="bb-body">
            {kind === "module" && <div className="bb-zone bb-zone--infra" />}
            {(kind === "module" || kind === "submodule") && (
              <div className="bb-zone bb-zone--ports" />
            )}
            <div className="bb-children">
              {children.map((child) => renderNode(child))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={node.id}
        className={className}
        style={style}
        data-kind={kind}
        onClick={() => selectNode(node.id)}
      >
        <div className="bb-k">{NodeKinds[kind]?.label || kind}</div>
        <div className="bb-name">{label}</div>
        {meta ? <div className="bb-meta">{meta}</div> : null}
      </div>
    );
  }

  const rootNodes = childrenByParent.get("root") || [];

  return (
    <section className="canvas">
      <div
        className="bb-viewport"
        ref={viewportRef}
        onWheel={handleWheel}
        onPointerDown={startPan}
        onPointerMove={handlePointerMove}
        onPointerUp={stopPan}
        onPointerCancel={stopPan}
        onClick={handleViewportClick}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div
          className="bb-canvas"
          style={{
            transform: `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`,
          }}
        >
          {rootNodes.map((node) => renderNode(node))}
        </div>
      </div>
    </section>
  );
}
