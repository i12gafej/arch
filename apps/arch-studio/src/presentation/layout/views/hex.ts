import { gridPack } from "../packing/gridPack.ts";

const CORE_KINDS = new Set([
  "domain_interface",
  "domain_service",
  "use_case",
  "application_service",
  "submodule",
]);
const SUBMODULE_KINDS = new Set(["submodule"]);
const PORT_KINDS = new Set(["port"]);
const INFRA_KINDS = new Set(["adapter", "capability", "api_surface", "persistence_model"]);
const DOMAIN_KINDS = new Set(["domain_interface", "domain_service", "entity", "value_object"]);
const APP_KINDS = new Set(["use_case", "application_service"]);

const PORT_DOCK_WIDTH = 320;
const INFRA_WIDTH = 300;
const CORE_MIN_WIDTH = 620;

function requiredColumnWidth(boxes, helpers, fallback) {
  const maxBox = boxes.reduce((max, box) => Math.max(max, box.w), 0);
  return Math.max(fallback, maxBox + (helpers.outerMargin || 0) * 2);
}

function splitBoxes(boxes) {
  return {
    submodules: boxes.filter((box) => SUBMODULE_KINDS.has(box.kind)),
    core: boxes.filter((box) => CORE_KINDS.has(box.kind)),
    infra: boxes.filter((box) => INFRA_KINDS.has(box.kind)),
    ports: boxes.filter((box) => PORT_KINDS.has(box.kind)),
    domain: boxes.filter((box) => DOMAIN_KINDS.has(box.kind)),
    app: boxes.filter((box) => APP_KINDS.has(box.kind)),
    misc: boxes.filter((box) => !CORE_KINDS.has(box.kind) && !INFRA_KINDS.has(box.kind) && !PORT_KINDS.has(box.kind)),
  };
}

function moduleLayout(context, boxes, helpers) {
  const content = context.contentRect;
  const gap = helpers.gap;
  const sections = splitBoxes(boxes);

  const domainItems = sections.domain.concat(sections.misc);
  const hasDomain = domainItems.length > 0;
  const hasApp = sections.app.length > 0;
  const domainWidthMin = requiredColumnWidth(domainItems, helpers, 300);
  const appWidthMin = requiredColumnWidth(sections.app, helpers, 300);
  const portWidth = requiredColumnWidth(sections.ports, helpers, PORT_DOCK_WIDTH);
  const infraWidth = requiredColumnWidth(sections.infra, helpers, INFRA_WIDTH);
  const minDomainWidth = hasDomain && hasApp ? domainWidthMin + appWidthMin + gap : Math.max(domainWidthMin, appWidthMin);
  const maxSubmoduleWidth = sections.submodules.reduce((max, box) => Math.max(max, box.w), 0);
  const minCoreWidth = Math.max(minDomainWidth, maxSubmoduleWidth || 0);
  const coreWidth = Math.max(
    CORE_MIN_WIDTH,
    minCoreWidth,
    content.w - portWidth - infraWidth - gap * 2
  );

  const coreRect = { x: content.x, y: content.y, w: coreWidth, h: content.h };
  const infraRect = { x: coreRect.x + coreRect.w + gap, y: content.y, w: infraWidth, h: content.h };
  const portRect = { x: infraRect.x + infraRect.w + gap, y: content.y, w: portWidth, h: content.h };

  const submoduleRect = { x: coreRect.x, y: coreRect.y, w: coreRect.w, h: coreRect.h };
  const submodulePack = sections.submodules.length
    ? gridPack(sections.submodules, submoduleRect, {
        ...helpers,
        columns: 1,
        columnWidth: coreRect.w,
      })
    : { positions: new Map(), bounds: { maxX: 0, maxY: 0 } };

  const submodulesHeight = sections.submodules.length
    ? Math.max(0, submodulePack.bounds.maxY - submoduleRect.y)
    : 0;
  const coreTop = coreRect.y + (submodulesHeight ? submodulesHeight + gap : 0);
  const coreHeight = Math.max(220, coreRect.h - (coreTop - coreRect.y));

  let domainRect = null;
  let appRect = null;
  if (hasDomain && hasApp) {
    let domainWidth = domainWidthMin;
    let appWidth = Math.max(appWidthMin, coreRect.w - domainWidth - gap);
    if (domainWidth + appWidth + gap > coreRect.w) {
      appWidth = appWidthMin;
      domainWidth = Math.max(domainWidthMin, coreRect.w - appWidth - gap);
    }
    domainRect = { x: coreRect.x, y: coreTop, w: domainWidth, h: coreHeight };
    appRect = { x: domainRect.x + domainRect.w + gap, y: coreTop, w: appWidth, h: coreHeight };
  } else if (hasDomain) {
    domainRect = { x: coreRect.x, y: coreTop, w: coreRect.w, h: coreHeight };
  } else if (hasApp) {
    appRect = { x: coreRect.x, y: coreTop, w: coreRect.w, h: coreHeight };
  }

  const domainPack = domainRect
    ? gridPack(domainItems, domainRect, { ...helpers, columns: 1, columnWidth: domainRect.w })
    : { positions: new Map(), bounds: { maxX: 0, maxY: 0 } };
  const appPack = appRect
    ? gridPack(sections.app, appRect, { ...helpers, columns: 1, columnWidth: appRect.w })
    : { positions: new Map(), bounds: { maxX: 0, maxY: 0 } };

  const infraPack = gridPack(sections.infra, infraRect, {
    ...helpers,
    columns: 1,
    columnWidth: infraRect.w,
  });
  const portPack = gridPack(sections.ports, portRect, {
    ...helpers,
    columns: 1,
    columnWidth: portRect.w,
  });

  const positions = new Map([
    ...submodulePack.positions.entries(),
    ...domainPack.positions.entries(),
    ...appPack.positions.entries(),
    ...infraPack.positions.entries(),
    ...portPack.positions.entries(),
  ]);

  const layoutRightEdge = portRect.x + portRect.w;
  const minBottom = Math.max(coreTop + coreHeight, infraRect.y + infraRect.h, portRect.y + portRect.h);

  const maxX = Math.max(
    layoutRightEdge,
    submodulePack.bounds.maxX,
    domainPack.bounds.maxX,
    appPack.bounds.maxX,
    infraPack.bounds.maxX,
    portPack.bounds.maxX
  );
  const maxY = Math.max(
    minBottom,
    submodulePack.bounds.maxY,
    domainPack.bounds.maxY,
    appPack.bounds.maxY,
    infraPack.bounds.maxY,
    portPack.bounds.maxY
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
