import { gridPack } from "../packing/gridPack.ts";
import { layoutContext as onionContext, getGroupMinSize as onionMin } from "./onion.ts";

export function getGroupMinSize(kind, base) {
  if (kind === "service") {
    return { w: Math.max(base.w, 1100), h: Math.max(base.h, 640) };
  }
  if (kind === "module") {
    return { w: Math.max(base.w, 540), h: Math.max(base.h, 360) };
  }
  if (kind === "submodule") {
    return { w: Math.max(base.w, 420), h: Math.max(base.h, 220) };
  }
  return base;
}

export function layoutContext(context, boxes, helpers) {
  if (context.kind === "root") {
    return gridPack(boxes, context.contentRect, { ...helpers, columns: 2 });
  }
  if (context.kind === "service") {
    return gridPack(boxes, context.contentRect, { ...helpers, columns: 2 });
  }
  if (context.kind === "module" || context.kind === "submodule") {
    return onionContext(context, boxes, helpers);
  }
  return gridPack(boxes, context.contentRect, helpers);
}
