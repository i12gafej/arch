import {
  applyPositions,
  cloneNodes,
  getNodeKind,
  mergePositions,
  placeInColumn,
  placeInGrid,
} from "./layoutUtils.ts";

const CONTAINER_KINDS = new Set(["service", "module", "submodule"]);

export default function infraLayout(nodes) {
  const nextNodes = cloneNodes(nodes);
  const delivery = [];
  const ports = [];
  const adapters = [];
  const capabilities = [];
  const core = [];
  const containers = [];
  const rest = [];

  nextNodes.forEach((node) => {
    const kind = getNodeKind(node);
    if (CONTAINER_KINDS.has(kind)) {
      containers.push(node);
      return;
    }
    if (kind === "api_surface") {
      delivery.push(node);
      return;
    }
    if (kind === "port") {
      ports.push(node);
      return;
    }
    if (kind === "adapter") {
      adapters.push(node);
      return;
    }
    if (kind === "capability") {
      capabilities.push(node);
      return;
    }
    if (["use_case", "domain_interface", "domain_service", "application_service"].includes(kind)) {
      core.push(node);
      return;
    }
    rest.push(node);
  });

  const positions = mergePositions([
    placeInColumn(core, { x: 40, y: 120 }, 110),
    placeInColumn(delivery, { x: 260, y: 120 }, 110),
    placeInColumn(ports, { x: 480, y: 120 }, 110),
    placeInColumn(adapters, { x: 700, y: 120 }, 110),
    placeInColumn(capabilities, { x: 920, y: 120 }, 110),
    placeInGrid(rest, { x: 40, y: 560 }, 220, 150, 3),
    placeInGrid(containers, { x: 40, y: 20 }, 240, 160, 2),
  ]);

  return applyPositions(nextNodes, positions);
}
