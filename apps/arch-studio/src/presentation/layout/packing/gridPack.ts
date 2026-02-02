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

function packByColumns(sorted, contextRect, options) {
  const gap = options.gap ?? 16;
  const outerMargin = options.outerMargin ?? 0;
  const columnWidth = Math.max(
    options.columnWidth || 0,
    ...sorted.map((box) => box.w + outerMargin * 2)
  );
  let columns = options.columns || 1;

  const maxColumns = Math.max(1, Math.floor((contextRect.w + gap) / (columnWidth + gap)));
  columns = Math.max(1, Math.min(columns, maxColumns));

  const rows = [];
  sorted.forEach((box, index) => {
    const rowIndex = Math.floor(index / columns);
    if (!rows[rowIndex]) {
      rows[rowIndex] = [];
    }
    rows[rowIndex].push(box);
  });

  const positions = new Map();
  const placed = [];
  let y = contextRect.y;

  rows.forEach((row) => {
    const rowHeight = row.reduce((acc, box) => Math.max(acc, box.h + outerMargin * 2), 0);
    row.forEach((box, colIndex) => {
      const x = contextRect.x + colIndex * (columnWidth + gap);
      const rect = { x, y, w: box.w + outerMargin * 2, h: box.h + outerMargin * 2 };
      positions.set(box.id, { x: rect.x + outerMargin, y: rect.y + outerMargin });
      placed.push(rect);
    });
    y += rowHeight + gap;
  });

  const bounds = rectBounds(placed);
  return { positions, bounds, placed };
}

export function gridPack(boxes, contextRect, options = {}) {
  const gap = options.gap ?? 16;
  const step = options.step ?? options.cell ?? 20;
  const outerMargin = options.outerMargin ?? 0;
  const sorted = sortBoxes(boxes);
  if (options.columns) {
    return packByColumns(sorted, contextRect, options);
  }

  const placed = [];
  const positions = new Map();

  sorted.forEach((box) => {
    const width = box.w + outerMargin * 2;
    const height = box.h + outerMargin * 2;
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

    positions.set(box.id, {
      x: placedRect.x + outerMargin,
      y: placedRect.y + outerMargin,
    });
    placed.push(placedRect);
  });

  const bounds = rectBounds(placed);
  return { positions, bounds, placed };
}
