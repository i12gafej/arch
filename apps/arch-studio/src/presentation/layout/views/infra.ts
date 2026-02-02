import { gridPack } from "../packing/gridPack.ts";

const DELIVERY_KINDS = new Set(["api_surface"]);
const PORT_KINDS = new Set(["port"]);
const ADAPTER_KINDS = new Set(["adapter", "persistence_model"]);
const CAPABILITY_KINDS = new Set(["capability"]);
const CORE_KINDS = new Set(["use_case", "domain_interface", "domain_service", "application_service"]);
const SUBMODULE_KINDS = new Set(["submodule"]);

function requiredColumnWidth(boxes, helpers, fallback) {
  const maxBox = boxes.reduce((max, box) => Math.max(max, box.w), 0);
  return Math.max(fallback, maxBox + (helpers.outerMargin || 0) * 2);
}

function splitBoxes(boxes) {
  return {
    submodules: boxes.filter((box) => SUBMODULE_KINDS.has(box.kind)),
    delivery: boxes.filter((box) => DELIVERY_KINDS.has(box.kind)),
    core: boxes.filter((box) => CORE_KINDS.has(box.kind)),
    ports: boxes.filter((box) => PORT_KINDS.has(box.kind)),
    adapters: boxes.filter((box) => ADAPTER_KINDS.has(box.kind)),
    capabilities: boxes.filter((box) => CAPABILITY_KINDS.has(box.kind)),
    misc: boxes.filter(
      (box) =>
        !DELIVERY_KINDS.has(box.kind) &&
        !PORT_KINDS.has(box.kind) &&
        !ADAPTER_KINDS.has(box.kind) &&
        !CAPABILITY_KINDS.has(box.kind) &&
        !CORE_KINDS.has(box.kind)
    ),
  };
}

function moduleLayout(context, boxes, helpers) {
  const content = context.contentRect;
  const gap = helpers.gap;
  const sections = splitBoxes(boxes);
  const widths = {
    core: requiredColumnWidth(sections.core, helpers, Math.max(260, helpers.sizes.use_case.w)),
    delivery: requiredColumnWidth(sections.delivery, helpers, helpers.sizes.api_surface.w),
    port: requiredColumnWidth(sections.ports, helpers, 320),
    adapter: requiredColumnWidth(sections.adapters, helpers, helpers.sizes.adapter.w),
    capability: requiredColumnWidth(sections.capabilities, helpers, helpers.sizes.capability.w),
  };

  const submoduleRect = { x: content.x, y: content.y, w: content.w, h: content.h };
  const submodulePack = sections.submodules.length
    ? gridPack(sections.submodules, submoduleRect, { ...helpers, columns: 1, columnWidth: content.w })
    : { positions: new Map(), bounds: { maxX: 0, maxY: 0 } };
  const submodulesHeight = sections.submodules.length
    ? Math.max(0, submodulePack.bounds.maxY - submoduleRect.y)
    : 0;

  const columnStartY = content.y + (submodulesHeight ? submodulesHeight + gap : 0);
  const columnHeight = Math.max(200, content.h - (columnStartY - content.y));

  let x = content.x;
  let coreRect = null;
  if (sections.core.length) {
    coreRect = { x, y: columnStartY, w: widths.core, h: columnHeight };
    x += widths.core + gap;
  }
  const deliveryRect = { x, y: columnStartY, w: widths.delivery, h: columnHeight };
  x += widths.delivery + gap;
  const portRect = { x, y: columnStartY, w: widths.port, h: columnHeight };
  x += widths.port + gap;
  const adapterRect = { x, y: columnStartY, w: widths.adapter, h: columnHeight };
  x += widths.adapter + gap;
  const capabilityRect = { x, y: columnStartY, w: widths.capability, h: columnHeight };

  const corePack = coreRect
    ? gridPack(sections.core, coreRect, { ...helpers, columns: 1, columnWidth: coreRect.w })
    : { positions: new Map(), bounds: { maxX: 0, maxY: 0 } };
  const deliveryPack = gridPack(sections.delivery, deliveryRect, { ...helpers, columns: 1, columnWidth: deliveryRect.w });
  const portPack = gridPack(sections.ports, portRect, { ...helpers, columns: 1, columnWidth: portRect.w });
  const adapterPack = gridPack(sections.adapters, adapterRect, { ...helpers, columns: 1, columnWidth: adapterRect.w });
  const capabilityPack = gridPack(sections.capabilities, capabilityRect, { ...helpers, columns: 1, columnWidth: capabilityRect.w });
  const miscPack = sections.misc.length
    ? gridPack(sections.misc, { x: content.x, y: content.y + content.h + gap, w: content.w, h: helpers.cell * 8 }, helpers)
    : { positions: new Map(), bounds: { maxX: 0, maxY: 0 } };

  const positions = new Map([
    ...submodulePack.positions.entries(),
    ...corePack.positions.entries(),
    ...deliveryPack.positions.entries(),
    ...portPack.positions.entries(),
    ...adapterPack.positions.entries(),
    ...capabilityPack.positions.entries(),
    ...miscPack.positions.entries(),
  ]);

  const maxX = Math.max(
    capabilityRect.x + capabilityRect.w,
    submodulePack.bounds.maxX,
    corePack.bounds.maxX,
    deliveryPack.bounds.maxX,
    portPack.bounds.maxX,
    adapterPack.bounds.maxX,
    capabilityPack.bounds.maxX,
    miscPack.bounds.maxX
  );
  const maxY = Math.max(
    columnStartY + columnHeight,
    submodulePack.bounds.maxY,
    corePack.bounds.maxY,
    deliveryPack.bounds.maxY,
    portPack.bounds.maxY,
    adapterPack.bounds.maxY,
    capabilityPack.bounds.maxY,
    miscPack.bounds.maxY
  );

  return { positions, bounds: { maxX, maxY } };
}

export function getGroupMinSize(kind, base) {
  if (kind === "module") {
    return { w: Math.max(base.w, 1400), h: Math.max(base.h, 700) };
  }
  if (kind === "submodule") {
    return { w: Math.max(base.w, 1000), h: Math.max(base.h, 450) };
  }
  return base;
}

export function layoutContext(context, boxes, helpers) {
  if (context.kind === "root" || context.kind === "service") {
    return gridPack(boxes, context.contentRect, { ...helpers, columns: 2 });
  }
  if (context.kind === "module" || context.kind === "submodule") {
    return moduleLayout(context, boxes, helpers);
  }
  return gridPack(boxes, context.contentRect, helpers);
}
