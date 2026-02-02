import { gridPack } from "../packing/gridPack.ts";
import { layoutContext as onionContext } from "./onion.ts";

export function getGroupMinSize(kind, base) {
  if (kind === "service") {
    return { w: Math.max(base.w, 1800), h: Math.max(base.h, 1000) };
  }
  if (kind === "module") {
    return { w: Math.max(base.w, 1400), h: Math.max(base.h, 700) };
  }
  if (kind === "submodule") {
    return { w: Math.max(base.w, 1000), h: Math.max(base.h, 450) };
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
