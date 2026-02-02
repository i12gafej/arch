import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGraphStore } from "../../../application/store/graphStore.ts";
import { filterGraphByViewMode } from "../../../domain/graph/validators.ts";
import { getNodeLabel } from "../../catalog/nodeCatalog.ts";

const GROUP_KINDS = new Set(["service", "module", "submodule"]);
const COLLISION_LOCK_KINDS = new Set(["module", "submodule"]);
const MIN_SIBLING_GAP = 18;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.1;
const NODE_SIZES = {
  use_case: { w: 260, h: 86 },
  domain_interface: { w: 260, h: 86 },
  domain_service: { w: 260, h: 86 },
  entity: { w: 260, h: 86 },
  value_object: { w: 260, h: 86 },
  application_service: { w: 260, h: 86 },
  port: { w: 280, h: 84 },
  adapter: { w: 260, h: 86 },
  persistence_model: { w: 260, h: 86 },
  capability: { w: 240, h: 68 },
  api_surface: { w: 260, h: 86 },
  service: { w: 1800, h: 1000 },
  module: { w: 1400, h: 700 },
  submodule: { w: 1000, h: 450 },
  fallback: { w: 240, h: 68 },
};

const HEADER_HEIGHT = 52;
const PADDING = 18;

function getKind(node) {
  return node?.data?.kind || node?.kind || "unknown";
}

function getLabel(node) {
  return node?.data?.name || node?.data?.label || node?.id || "";
}

function getNodeSize(node) {
  if (node?.style?.width && node?.style?.height) {
    return { w: node.style.width, h: node.style.height };
  }
  const kind = getKind(node);
  return NODE_SIZES[kind] || NODE_SIZES.fallback;
}

function intersects(a, b) {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

function inflate(rect, padding) {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    w: rect.w + padding * 2,
    h: rect.h + padding * 2,
  };
}

function clampZoom(value) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
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
  const suppressClickRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);

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

  const setZoomFromViewportCenter = useCallback(
    (nextZoom) => {
      const rect = viewportRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const { zoom, panX, panY } = viewRef.current;
      const targetZoom = clampZoom(nextZoom);
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const worldX = (centerX - panX) / zoom;
      const worldY = (centerY - panY) / zoom;
      const nextPanX = centerX - worldX * targetZoom;
      const nextPanY = centerY - worldY * targetZoom;
      setViewSafe({ zoom: targetZoom, panX: nextPanX, panY: nextPanY });
    },
    [setViewSafe]
  );

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
      const nextZoom = clampZoom(zoom * factor);
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
    const isOnNode = Boolean(target?.closest?.(".bb-node"));
    if (isDragHandle) {
      return;
    }
    const wantsPan =
      (isLeft && (!isOnNode || spaceDown.current || event.pointerType === "touch")) ||
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
      moved: false,
    };
    setIsPanning(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  const handlePointerMove = useCallback((event) => {
    if (panState.current && panState.current.pointerId === event.pointerId) {
      const dx = event.clientX - panState.current.startX;
      const dy = event.clientY - panState.current.startY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        panState.current.moved = true;
      }
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
      suppressClickRef.current = panState.current.moved;
      panState.current = null;
      setIsPanning(false);
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

  function collidesWithSibling(nodeId, nextPosition) {
    const currentNodes = nodesRef.current;
    const movingNode = currentNodes.find((node) => node.id === nodeId);
    if (!movingNode) {
      return false;
    }
    const movingKind = getKind(movingNode);
    if (!COLLISION_LOCK_KINDS.has(movingKind)) {
      return false;
    }

    const movingParent = movingNode.parentNode || null;
    const movingSize = getNodeSize(movingNode);
    const movingRect = inflate(
      {
        x: nextPosition.x,
        y: nextPosition.y,
        w: movingSize.w,
        h: movingSize.h,
      },
      MIN_SIBLING_GAP / 2
    );

    return currentNodes.some((other) => {
      if (other.id === nodeId) {
        return false;
      }
      if (getKind(other) !== movingKind) {
        return false;
      }
      const otherParent = other.parentNode || null;
      if (otherParent !== movingParent) {
        return false;
      }
      const otherSize = getNodeSize(other);
      const otherRect = inflate(
        {
          x: other.position?.x || 0,
          y: other.position?.y || 0,
          w: otherSize.w,
          h: otherSize.h,
        },
        MIN_SIBLING_GAP / 2
      );
      return intersects(movingRect, otherRect);
    });
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
        if (collidesWithSibling(nodeId, nextPos)) {
          return;
        }
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
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (event.target === event.currentTarget) {
      clearSelection();
    }
  }

  function handleZoomIn() {
    setZoomFromViewportCenter(viewRef.current.zoom + ZOOM_STEP);
  }

  function handleZoomOut() {
    setZoomFromViewportCenter(viewRef.current.zoom - ZOOM_STEP);
  }

  function handleZoomReset() {
    setZoomFromViewportCenter(1);
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
      const groupLabel = `${getNodeLabel(kind)}: ${node.data?.name || ""}`;
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
        <div className="bb-k">{getNodeLabel(kind)}</div>
        <div className="bb-name">{label}</div>
        {meta ? <div className="bb-meta">{meta}</div> : null}
      </div>
    );
  }

  const rootNodes = childrenByParent.get("root") || [];
  const gridSize = Math.max(36, Math.round(72 * view.zoom));
  const zoomPercent = Math.round(view.zoom * 100);

  return (
    <section
      className="canvas"
      style={{
        "--grid-size": `${gridSize}px`,
        "--grid-offset-x": `${view.panX}px`,
        "--grid-offset-y": `${view.panY}px`,
      }}
    >
      <div
        className="bb-viewport"
        data-panning={isPanning ? "true" : "false"}
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
        <div
          className="bb-zoom-controls"
          onPointerDown={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          <button className="bb-zoom-btn" onClick={handleZoomOut} aria-label="Alejar">
            -
          </button>
          <button className="bb-zoom-readout" onClick={handleZoomReset} title="Reset zoom">
            {zoomPercent}%
          </button>
          <button className="bb-zoom-btn" onClick={handleZoomIn} aria-label="Acercar">
            +
          </button>
        </div>
      </div>
    </section>
  );
}
