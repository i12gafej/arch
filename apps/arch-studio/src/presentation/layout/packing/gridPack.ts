import { inflateRect, intersects, rectBounds } from "./rect.ts";

function sortBoxes(boxes) {
  return [...boxes].sort((a, b) => {
    const kindA = a.kind || "";
    const kindB = b.kind || "";
    if (kindA !== kindB) {
      return kindA.localeCompare(kindB);
    }
    const nameA = a.name || "";
    const nameB = b.name || "";
    if (nameA !== nameB) {
      return nameA.localeCompare(nameB);
    }
    return String(a.id).localeCompare(String(b.id));
  });
}

export function gridPack(boxes, contextRect, options = {}) {
  const gap = options.gap ?? 16;
  const step = options.step ?? 20;
  const sorted = sortBoxes(boxes);
  const placed = [];
  const positions = new Map();

  sorted.forEach((box) => {
    const width = box.w;
    const height = box.h;
    let placedRect = null;
    let y = contextRect.y;
    let attempts = 0;
    const maxAttempts = 2000;

    while (!placedRect && attempts < maxAttempts) {
      let x = contextRect.x;
      while (x + width <= contextRect.x + contextRect.w) {
        const candidate = { x, y, w: width, h: height };
        const expanded = inflateRect(candidate, gap / 2);
        const collision = placed.some((rect) => intersects(expanded, rect));
        if (!collision) {
          placedRect = candidate;
          break;
        }
        x += step;
      }
      if (!placedRect) {
        y += step;
        attempts += 1;
      }
    }

    if (!placedRect) {
      placedRect = { x: contextRect.x, y, w: width, h: height };
    }

    positions.set(box.id, { x: placedRect.x, y: placedRect.y });
    placed.push(placedRect);
  });

  const bounds = rectBounds(placed);
  return { positions, bounds, placed };
}
