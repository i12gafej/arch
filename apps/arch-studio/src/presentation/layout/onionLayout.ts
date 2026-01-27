import { getLayerForKind } from "../../domain/graph/nodeTypes.ts";
import {
  applyPositions,
  cloneNodes,
  getNodeKind,
  mergePositions,
  placeInCircle,
  placeInGrid,
} from "./layoutUtils.ts";

const CONTAINER_KINDS = new Set(["service", "module", "submodule"]);

export default function onionLayout(nodes) {
  const nextNodes = cloneNodes(nodes);
  const contentNodes = nextNodes.filter((node) => !CONTAINER_KINDS.has(getNodeKind(node)));
  const containerNodes = nextNodes.filter((node) => CONTAINER_KINDS.has(getNodeKind(node)));

  const byLayer = {
    domain: [],
    application: [],
    delivery: [],
    infrastructure: [],
    distributed: [],
  };

  contentNodes.forEach((node) => {
    const layer = getLayerForKind(getNodeKind(node));
    (byLayer[layer] || byLayer.distributed).push(node);
  });

  const center = { x: 620, y: 360 };
  const positions = mergePositions([
    placeInCircle(byLayer.domain, center, 120),
    placeInCircle(byLayer.application, center, 220),
    placeInCircle(byLayer.delivery, center, 320),
    placeInCircle(byLayer.infrastructure, center, 420),
    placeInCircle(byLayer.distributed, center, 520),
    placeInGrid(containerNodes, { x: 80, y: 80 }, 240, 180, 2),
  ]);

  return applyPositions(nextNodes, positions);
}
