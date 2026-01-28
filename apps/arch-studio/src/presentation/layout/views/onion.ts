import { gridPack } from "../packing/gridPack.ts";

const DOMAIN_KINDS = new Set(["domain_interface", "domain_service"]);
const APP_KINDS = new Set(["use_case", "application_service", "api_surface", "submodule"]);
const PORT_KINDS = new Set(["port"]);

function columnLayout(context, boxes, helpers) {
  const content = context.contentRect;
  const gap = helpers.gap;
  const domainWidth = Math.max(200, helpers.sizes.domain_interface.w);
  const appWidth = Math.max(200, helpers.sizes.use_case.w);
  const portWidth = helpers.sizes.port.w;

  const total = domainWidth + appWidth + portWidth + gap * 2;
  const available = content.w;
  const scale = available < total ? available / total : 1;

  const domainW = Math.max(140, Math.floor(domainWidth * scale));
  const appW = Math.max(160, Math.floor(appWidth * scale));
  const portW = Math.max(180, Math.floor(portWidth * scale));

  const domainRect = {
    x: content.x,
    y: content.y,
    w: domainW,
    h: content.h,
  };
  const appRect = {
    x: content.x + domainW + gap,
    y: content.y,
    w: appW,
    h: content.h,
  };
  const portRect = {
    x: content.x + content.w - portW,
    y: content.y,
    w: portW,
    h: content.h,
  };

  const domainBoxes = boxes.filter((box) => DOMAIN_KINDS.has(box.kind));
  const appBoxes = boxes.filter((box) => APP_KINDS.has(box.kind));
  const portBoxes = boxes.filter((box) => PORT_KINDS.has(box.kind));
  const miscBoxes = boxes.filter(
    (box) => !DOMAIN_KINDS.has(box.kind) && !APP_KINDS.has(box.kind) && !PORT_KINDS.has(box.kind)
  );

  const domainPack = gridPack(domainBoxes, domainRect, helpers);
  const appPack = gridPack(appBoxes.concat(miscBoxes), appRect, helpers);
  const portPack = gridPack(portBoxes, portRect, helpers);

  const positions = new Map([
    ...domainPack.positions.entries(),
    ...appPack.positions.entries(),
    ...portPack.positions.entries(),
  ]);

  const maxX = Math.max(domainPack.bounds.maxX, appPack.bounds.maxX, portPack.bounds.maxX);
  const maxY = Math.max(domainPack.bounds.maxY, appPack.bounds.maxY, portPack.bounds.maxY);

  return { positions, bounds: { maxX, maxY } };
}

export function getGroupMinSize(kind, base) {
  if (kind === "module") {
    return { w: Math.max(base.w, 720), h: Math.max(base.h, 360) };
  }
  if (kind === "submodule") {
    return { w: Math.max(base.w, 600), h: Math.max(base.h, 200) };
  }
  return base;
}

export function layoutContext(context, boxes, helpers) {
  if (context.kind === "root" || context.kind === "service") {
    return gridPack(boxes, context.contentRect, helpers);
  }

  return columnLayout(context, boxes, helpers);
}
