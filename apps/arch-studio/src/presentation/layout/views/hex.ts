import { gridPack } from "../packing/gridPack.ts";

const CORE_KINDS = new Set([
  "domain_interface",
  "domain_service",
  "use_case",
  "application_service",
  "api_surface",
  "submodule",
]);
const PORT_KINDS = new Set(["port"]);
const INFRA_KINDS = new Set(["adapter", "capability"]);

export function getGroupMinSize(kind, base) {
  if (kind === "module") {
    return { w: Math.max(base.w, 900), h: Math.max(base.h, 360) };
  }
  if (kind === "submodule") {
    return { w: Math.max(base.w, 680), h: Math.max(base.h, 200) };
  }
  return base;
}

export function layoutContext(context, boxes, helpers) {
  if (context.kind === "root" || context.kind === "service") {
    return gridPack(boxes, context.contentRect, helpers);
  }

  const content = context.contentRect;
  const gap = helpers.gap;
  const portWidth = helpers.sizes.port.w;
  const infraWidth = helpers.sizes.adapter.w + gap;
  const coreWidth = Math.max(320, content.w - portWidth - infraWidth - gap * 2);

  const coreRect = { x: content.x, y: content.y, w: coreWidth, h: content.h };
  const portRect = {
    x: coreRect.x + coreRect.w + gap,
    y: content.y,
    w: portWidth,
    h: content.h,
  };
  const infraRect = {
    x: portRect.x + portRect.w + gap,
    y: content.y,
    w: infraWidth,
    h: content.h,
  };

  const coreBoxes = boxes.filter((box) => CORE_KINDS.has(box.kind));
  const portBoxes = boxes.filter((box) => PORT_KINDS.has(box.kind));
  const infraBoxes = boxes.filter((box) => INFRA_KINDS.has(box.kind));
  const miscBoxes = boxes.filter(
    (box) => !CORE_KINDS.has(box.kind) && !PORT_KINDS.has(box.kind) && !INFRA_KINDS.has(box.kind)
  );

  const corePack = gridPack(coreBoxes.concat(miscBoxes), coreRect, helpers);
  const portPack = gridPack(portBoxes, portRect, helpers);
  const infraPack = gridPack(infraBoxes, infraRect, helpers);

  const positions = new Map([
    ...corePack.positions.entries(),
    ...portPack.positions.entries(),
    ...infraPack.positions.entries(),
  ]);

  const maxX = Math.max(corePack.bounds.maxX, portPack.bounds.maxX, infraPack.bounds.maxX);
  const maxY = Math.max(corePack.bounds.maxY, portPack.bounds.maxY, infraPack.bounds.maxY);

  return { positions, bounds: { maxX, maxY } };
}
