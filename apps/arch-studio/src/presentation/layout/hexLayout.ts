import {
  applyPositions,
  cloneNodes,
  getNodeKind,
  mergePositions,
  placeInCircle,
  placeInGrid,
} from "./layoutUtils.ts";

const CONTAINER_KINDS = new Set(["service", "module", "submodule"]);

export default function hexLayout(nodes) {
  const nextNodes = cloneNodes(nodes);
  const core = [];
  const ports = [];
  const adapters = [];
  const delivery = [];
  const containers = [];
  const rest = [];

  nextNodes.forEach((node) => {
    const kind = getNodeKind(node);
    if (CONTAINER_KINDS.has(kind)) {
      containers.push(node);
      return;
    }
    if (["domain_interface", "domain_service", "use_case", "application_service"].includes(kind)) {
      core.push(node);
      return;
    }
    if (kind === "port") {
      ports.push(node);
      return;
    }
    if (kind === "adapter" || kind === "capability") {
      adapters.push(node);
      return;
    }
    if (kind === "api_surface") {
      delivery.push(node);
      return;
    }
    rest.push(node);
  });

  const center = { x: 620, y: 360 };
  const positions = mergePositions([
    placeInCircle(core, center, 140),
    placeInCircle(delivery, center, 210),
    placeInCircle(ports, center, 280),
    placeInCircle(adapters, center, 420),
    placeInGrid(rest, { x: 80, y: 560 }, 220, 150, 3),
    placeInGrid(containers, { x: 80, y: 80 }, 240, 180, 2),
  ]);

  return applyPositions(nextNodes, positions);
}
