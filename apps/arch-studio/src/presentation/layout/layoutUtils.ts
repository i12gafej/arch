export function cloneNodes(nodes) {
  return nodes.map((node) => ({
    ...node,
    position: { ...(node.position || { x: 0, y: 0 }) },
  }));
}

export function getNodeKind(node) {
  return node?.data?.kind || node?.kind || "unknown";
}

export function getNodeName(node) {
  return node?.data?.name || node?.data?.label || node?.id || "";
}

export function sortNodesStable(nodes) {
  return [...nodes].sort((a, b) => {
    const kindA = getNodeKind(a);
    const kindB = getNodeKind(b);
    if (kindA !== kindB) {
      return kindA.localeCompare(kindB);
    }
    const nameA = getNodeName(a);
    const nameB = getNodeName(b);
    return nameA.localeCompare(nameB);
  });
}

export function placeInCircle(nodes, center, radius) {
  const sorted = sortNodesStable(nodes);
  const total = sorted.length || 1;
  const positions = new Map();
  sorted.forEach((node, index) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
    const x = center.x + Math.cos(angle) * radius;
    const y = center.y + Math.sin(angle) * radius;
    positions.set(node.id, { x, y });
  });
  return positions;
}

export function placeInGrid(nodes, origin, columnWidth, rowHeight, columns) {
  const sorted = sortNodesStable(nodes);
  const positions = new Map();
  sorted.forEach((node, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = origin.x + col * columnWidth;
    const y = origin.y + row * rowHeight;
    positions.set(node.id, { x, y });
  });
  return positions;
}

export function placeInColumn(nodes, origin, rowHeight) {
  const sorted = sortNodesStable(nodes);
  const positions = new Map();
  sorted.forEach((node, index) => {
    const x = origin.x;
    const y = origin.y + index * rowHeight;
    positions.set(node.id, { x, y });
  });
  return positions;
}

export function applyPositions(nodes, positions) {
  return nodes.map((node) => {
    const next = positions.get(node.id);
    if (!next) {
      return node;
    }
    return {
      ...node,
      position: { x: next.x, y: next.y },
    };
  });
}

export function mergePositions(positionMaps) {
  const merged = new Map();
  positionMaps.forEach((map) => {
    map.forEach((value, key) => {
      merged.set(key, value);
    });
  });
  return merged;
}
