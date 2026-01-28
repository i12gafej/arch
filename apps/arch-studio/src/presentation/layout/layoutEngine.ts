import { gridPack } from "./packing/gridPack.ts";
import { getLayerForKind } from "../../domain/graph/nodeTypes.ts";
import * as onionView from "./views/onion.ts";
import * as hexView from "./views/hex.ts";
import * as infraView from "./views/infra.ts";
import * as distributedView from "./views/distributed.ts";

const GROUP_KINDS = new Set(["service", "module", "submodule"]);
const HEADER_HEIGHT = 32;
const PADDING = 16;
const GRID_STEP = 20;
const GAP = 16;

const BASE_SIZES = {
  use_case: { w: 180, h: 56 },
  domain_interface: { w: 200, h: 56 },
  domain_service: { w: 200, h: 56 },
  application_service: { w: 180, h: 56 },
  port: { w: 220, h: 140 },
  adapter: { w: 220, h: 110 },
  capability: { w: 180, h: 56 },
  api_surface: { w: 200, h: 56 },
  service: { w: 1200, h: 700 },
  module: { w: 560, h: 360 },
  submodule: { w: 520, h: 160 },
  fallback: { w: 180, h: 56 },
};

const viewMap = {
  onion: onionView,
  hex: hexView,
  infra: infraView,
  distributed: distributedView,
};

function getKind(node) {
  return node?.data?.kind || node?.kind || "unknown";
}

function getName(node) {
  return node?.data?.name || node?.data?.label || node?.id || "";
}

function getBaseSize(kind) {
  return BASE_SIZES[kind] || BASE_SIZES.fallback;
}

function cloneNodes(nodes) {
  return nodes.map((node) => ({
    ...node,
    data: { ...(node.data || {}) },
    position: { ...(node.position || { x: 0, y: 0 }) },
  }));
}

function buildMaps(nodes) {
  const nodeById = new Map();
  const moduleByName = new Map();
  const submoduleByKey = new Map();
  const serviceByName = new Map();

  nodes.forEach((node) => {
    nodeById.set(node.id, node);
    const kind = getKind(node);
    const name = getName(node);
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
  });

  return { nodeById, moduleByName, submoduleByKey, serviceByName };
}

function resolveParent(node, maps) {
  const kind = getKind(node);
  const moduleId = node.data?.moduleId;
  const submoduleId = node.data?.submoduleId;
  const serviceId = node.data?.serviceId;

  if (kind === "module" && serviceId && maps.serviceByName.has(serviceId)) {
    return maps.serviceByName.get(serviceId);
  }
  if (kind === "submodule" && moduleId && maps.moduleByName.has(moduleId)) {
    return maps.moduleByName.get(moduleId);
  }
  if (moduleId) {
    if (submoduleId) {
      const key = `${moduleId}:${submoduleId}`;
      if (maps.submoduleByKey.has(key)) {
        return maps.submoduleByKey.get(key);
      }
    }
    if (maps.moduleByName.has(moduleId)) {
      return maps.moduleByName.get(moduleId);
    }
  }
  return null;
}

function buildHierarchy(nodes, maps) {
  const parentById = new Map();
  const childrenByParent = new Map();

  nodes.forEach((node) => {
    const parent = resolveParent(node, maps);
    if (parent) {
      parentById.set(node.id, parent);
    }
  });

  nodes.forEach((node) => {
    const parent = parentById.get(node.id);
    if (!childrenByParent.has(parent || "root")) {
      childrenByParent.set(parent || "root", []);
    }
    childrenByParent.get(parent || "root").push(node);
  });

  return { parentById, childrenByParent };
}

function createHelpers(sizeMap) {
  return {
    gap: GAP,
    cell: GRID_STEP,
    sizes: BASE_SIZES,
    getSize: (id) => sizeMap.get(id),
    makeBox: (node) => {
      const size = sizeMap.get(node.id) || getBaseSize(getKind(node));
      return {
        id: node.id,
        kind: getKind(node),
        name: getName(node),
        w: size.w,
        h: size.h,
      };
    },
  };
}

function contentRectFor(size) {
  return {
    x: PADDING,
    y: HEADER_HEIGHT + PADDING,
    w: Math.max(0, size.w - PADDING * 2),
    h: Math.max(0, size.h - HEADER_HEIGHT - PADDING * 2),
  };
}

function layoutGroup(nodeId, state, view, visited) {
  const node = state.nodeById.get(nodeId);
  if (!node) {
    return { w: 0, h: 0 };
  }
  if (visited.has(nodeId)) {
    return state.sizeMap.get(nodeId) || { w: 0, h: 0 };
  }
  visited.add(nodeId);

  const children = state.childrenByParent.get(nodeId) || [];
  const childGroups = children.filter((child) => GROUP_KINDS.has(getKind(child)));

  childGroups.forEach((child) => layoutGroup(child.id, state, view, visited));

  const baseSize = { ...getBaseSize(getKind(node)) };
  const viewSize = view.getGroupMinSize ? view.getGroupMinSize(getKind(node), baseSize) : baseSize;
  const size = { w: viewSize.w, h: viewSize.h };

  const contentRect = contentRectFor(size);
  const boxes = children.map((child) => state.helpers.makeBox(child));
  const context = { kind: getKind(node), contentRect };
  const layout = view.layoutContext(context, boxes, state.helpers);
  const positions = layout.positions;

  positions.forEach((pos, id) => {
    const child = state.nodeById.get(id);
    if (!child) {
      return;
    }
    child.position = { x: pos.x, y: pos.y };
  });

  const bounds = layout.bounds || { maxX: 0, maxY: 0 };
  const requiredWidth = Math.max(size.w, bounds.maxX + PADDING);
  const requiredHeight = Math.max(size.h, bounds.maxY + PADDING + HEADER_HEIGHT);

  state.sizeMap.set(nodeId, { w: requiredWidth, h: requiredHeight });
  node.style = { ...(node.style || {}), width: requiredWidth, height: requiredHeight, padding: 12 };
  node.className = `node-group node-group--${getKind(node)}`;

  return { w: requiredWidth, h: requiredHeight };
}

function layoutRoot(state, view) {
  const rootChildren = state.childrenByParent.get("root") || [];
  const rootRect = { x: 40, y: 40, w: 1800, h: 1200 };
  const context = { kind: "root", contentRect: rootRect };
  const boxes = rootChildren.map((child) => state.helpers.makeBox(child));
  const layout = view.layoutContext(context, boxes, state.helpers);
  layout.positions.forEach((pos, id) => {
    const node = state.nodeById.get(id);
    if (!node) {
      return;
    }
    node.position = { x: pos.x, y: pos.y };
  });
}

export function layoutGraph(viewMode, nodes, edges) {
  const view = viewMap[viewMode] || onionView;
  const nextNodes = cloneNodes(nodes);
  const maps = buildMaps(nextNodes);
  const { parentById, childrenByParent } = buildHierarchy(nextNodes, maps);
  const sizeMap = new Map();

  nextNodes.forEach((node) => {
    const kind = getKind(node);
    sizeMap.set(node.id, { ...getBaseSize(kind) });
  });

  const helpers = createHelpers(sizeMap);
  const state = {
    nodeById: maps.nodeById,
    childrenByParent,
    sizeMap,
    helpers,
  };

  nextNodes.forEach((node) => {
    const parent = parentById.get(node.id);
    if (parent) {
      node.parentNode = parent;
      node.extent = "parent";
    } else {
      delete node.parentNode;
      delete node.extent;
    }
    if (!GROUP_KINDS.has(getKind(node))) {
      node.className = node.className || "";
    }
  });

  const groupNodes = nextNodes.filter((node) => GROUP_KINDS.has(getKind(node)));
  const visited = new Set();
  groupNodes.forEach((node) => layoutGroup(node.id, state, view, visited));
  layoutRoot(state, view);

  return nextNodes;
}
