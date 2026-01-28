import { gridPack } from "../packing/gridPack.ts";
import { layoutContext as onionContext, getGroupMinSize as onionMin } from "./onion.ts";

export function getGroupMinSize(kind, base) {
  if (kind === "service") {
    return { w: Math.max(base.w, 1200), h: Math.max(base.h, 700) };
  }
  if (kind === "module") {
    return { w: Math.max(base.w, 720), h: Math.max(base.h, 360) };
  }
  if (kind === "submodule") {
    return { w: Math.max(base.w, 560), h: Math.max(base.h, 200) };
  }
  return base;
}

export function layoutContext(context, boxes, helpers) {
  if (context.kind === "root") {
    return gridPack(boxes, context.contentRect, helpers);
  }

  if (context.kind === "service") {
    return gridPack(boxes, context.contentRect, helpers);
  }

  if (context.kind === "module") {
    return gridPack(boxes, context.contentRect, helpers);
  }

  return onionContext(context, boxes, helpers);
}
