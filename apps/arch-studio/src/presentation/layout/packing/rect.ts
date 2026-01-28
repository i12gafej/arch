export function intersects(a, b) {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

export function inflateRect(rect, padding) {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    w: rect.w + padding * 2,
    h: rect.h + padding * 2,
  };
}

export function rectBounds(rects) {
  if (!rects.length) {
    return { maxX: 0, maxY: 0 };
  }
  let maxX = 0;
  let maxY = 0;
  rects.forEach((rect) => {
    maxX = Math.max(maxX, rect.x + rect.w);
    maxY = Math.max(maxY, rect.y + rect.h);
  });
  return { maxX, maxY };
}
