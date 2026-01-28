import { gridPack } from "../packing/gridPack.ts";

const DELIVERY_KINDS = new Set(["api_surface"]);
const PORT_KINDS = new Set(["port"]);
const ADAPTER_KINDS = new Set(["adapter"]);
const CAPABILITY_KINDS = new Set(["capability"]);
const CORE_KINDS = new Set(["use_case", "domain_interface", "domain_service", "application_service"]);

export function getGroupMinSize(kind, base) {
  if (kind === "module") {
    return { w: Math.max(base.w, 960), h: Math.max(base.h, 360) };
  }
  if (kind === "submodule") {
    return { w: Math.max(base.w, 720), h: Math.max(base.h, 200) };
  }
  return base;
}

export function layoutContext(context, boxes, helpers) {
  if (context.kind === "root" || context.kind === "service") {
    return gridPack(boxes, context.contentRect, helpers);
  }

  const content = context.contentRect;
  const gap = helpers.gap;
  const colWidths = {
    core: helpers.sizes.use_case.w,
    delivery: helpers.sizes.api_surface.w,
    port: helpers.sizes.port.w,
    adapter: helpers.sizes.adapter.w,
    capability: helpers.sizes.capability.w,
  };

  const coreBoxes = boxes.filter((box) => CORE_KINDS.has(box.kind));
  let x = content.x;
  let coreRect = null;
  if (coreBoxes.length) {
    coreRect = { x, y: content.y, w: colWidths.core, h: content.h };
    x += colWidths.core + gap;
  }
  const deliveryRect = { x, y: content.y, w: colWidths.delivery, h: content.h };
  x += colWidths.delivery + gap;
  const portRect = { x, y: content.y, w: colWidths.port, h: content.h };
  x += colWidths.port + gap;
  const adapterRect = { x, y: content.y, w: colWidths.adapter, h: content.h };
  x += colWidths.adapter + gap;
  const capabilityRect = { x, y: content.y, w: colWidths.capability, h: content.h };

  const deliveryBoxes = boxes.filter((box) => DELIVERY_KINDS.has(box.kind));
  const portBoxes = boxes.filter((box) => PORT_KINDS.has(box.kind));
  const adapterBoxes = boxes.filter((box) => ADAPTER_KINDS.has(box.kind));
  const capabilityBoxes = boxes.filter((box) => CAPABILITY_KINDS.has(box.kind));
  const miscBoxes = boxes.filter(
    (box) =>
      !DELIVERY_KINDS.has(box.kind) &&
      !PORT_KINDS.has(box.kind) &&
      !ADAPTER_KINDS.has(box.kind) &&
      !CAPABILITY_KINDS.has(box.kind) &&
      !CORE_KINDS.has(box.kind)
  );

  const deliveryPack = gridPack(deliveryBoxes, deliveryRect, helpers);
  const portPack = gridPack(portBoxes, portRect, helpers);
  const adapterPack = gridPack(adapterBoxes, adapterRect, helpers);
  const capabilityPack = gridPack(capabilityBoxes, capabilityRect, helpers);
  const corePack = coreRect ? gridPack(coreBoxes, coreRect, helpers) : { positions: new Map(), bounds: { maxX: 0, maxY: 0 } };
  const miscPack = miscBoxes.length
    ? gridPack(miscBoxes, { x: content.x, y: content.y + content.h + gap, w: content.w, h: helpers.cell * 10 }, helpers)
    : { positions: new Map(), bounds: { maxX: 0, maxY: 0 } };

  const positions = new Map([
    ...deliveryPack.positions.entries(),
    ...portPack.positions.entries(),
    ...adapterPack.positions.entries(),
    ...capabilityPack.positions.entries(),
    ...corePack.positions.entries(),
    ...miscPack.positions.entries(),
  ]);

  const maxX = Math.max(
    deliveryPack.bounds.maxX,
    portPack.bounds.maxX,
    adapterPack.bounds.maxX,
    capabilityPack.bounds.maxX,
    corePack.bounds.maxX,
    miscPack.bounds.maxX
  );
  const maxY = Math.max(
    deliveryPack.bounds.maxY,
    portPack.bounds.maxY,
    adapterPack.bounds.maxY,
    capabilityPack.bounds.maxY,
    corePack.bounds.maxY,
    miscPack.bounds.maxY
  );

  return { positions, bounds: { maxX, maxY } };
}
