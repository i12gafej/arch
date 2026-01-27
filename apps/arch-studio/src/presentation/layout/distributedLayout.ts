import {
  applyPositions,
  cloneNodes,
  getNodeKind,
  getNodeName,
  mergePositions,
  placeInGrid,
} from "./layoutUtils.ts";

const CONTAINER_KINDS = new Set(["service", "module", "submodule"]);

function moduleKey(node) {
  return node?.data?.moduleId || "";
}

export default function distributedLayout(nodes) {
  const nextNodes = cloneNodes(nodes);
  const modules = nextNodes.filter((node) => getNodeKind(node) === "module");
  const services = nextNodes.filter((node) => getNodeKind(node) === "service");
  const modulePositions = new Map();
  const positionsList = [];

  const sortedModules = [...modules].sort((a, b) => getNodeName(a).localeCompare(getNodeName(b)));
  sortedModules.forEach((moduleNode, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const origin = { x: 120 + col * 520, y: 120 + row * 360 };
    modulePositions.set(moduleNode.id, origin);

    const moduleId = moduleNode.data?.name || moduleNode.data?.moduleId;
    const moduleChildren = nextNodes.filter(
      (node) => moduleKey(node) === moduleId && node.id !== moduleNode.id
    );
    const childPositions = placeInGrid(moduleChildren, { x: origin.x + 40, y: origin.y + 60 }, 200, 140, 3);
    positionsList.push(childPositions);
  });

  const looseNodes = nextNodes.filter((node) => {
    const kind = getNodeKind(node);
    if (CONTAINER_KINDS.has(kind)) {
      return false;
    }
    return !moduleKey(node);
  });

  const fallbackGrid = placeInGrid(looseNodes, { x: 80, y: 80 }, 220, 150, 3);
  const moduleGrid = new Map();
  modulePositions.forEach((pos, id) => {
    moduleGrid.set(id, pos);
  });

  const serviceGrid = placeInGrid(services, { x: 40, y: 20 }, 300, 180, 2);

  const positions = mergePositions([moduleGrid, fallbackGrid, serviceGrid, ...positionsList]);
  return applyPositions(nextNodes, positions);
}
