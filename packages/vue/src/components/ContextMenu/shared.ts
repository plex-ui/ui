// Shared with packages/ui/src/components/ContextMenu/shared.ts: keep the two copies the same.
/** A touch held this long opens the menu, as a UIKit long press (0.5 s). */
export const CONTEXT_MENU_LONG_PRESS = 500
/** A touch that moves farther than this before then scrolls or drags instead. */
export const CONTEXT_MENU_LONG_PRESS_SLOP = 10
/** The kit's gap between the preview and the menu: iOS 27 Context Menu 125:58750, Alignment=Vertical, the menu at
 * 176.5 under a content area that ends at 160.5 (the iOS 26 kit had 18). */
export const CONTEXT_MENU_PREVIEW_GAP = 16
/** The kit's preview corner (Content Area, radius 30), for an element without corners of its own. */
const PREVIEW_RADIUS = 30

type Rect = { x: number; y: number; width: number; height: number }

/** Where the menu opens: at the pointer, under the element for the keyboard, or beside a touch-and-hold preview. */
export type ContextMenuPresentation =
  | { kind: "pointer"; rect: Rect }
  | { kind: "keyboard"; rect: Rect }
  | { kind: "preview"; rect: Rect; radius: number; align: "start" | "end" }

const px = (value: string, base: number) => {
  const number = Number.parseFloat(value)
  if (!Number.isFinite(number)) return 0
  return value.trim().endsWith("%") ? (number / 100) * base : number
}

/**
 * The preview of a touch and hold: the element's box and corner (its own, or `--context-menu-preview-radius`), and
 * the edge the menu keeps to, the one on the side of the touch, as the kit's Side=Leading and Side=Trailing.
 */
export function contextMenuPreview(element: HTMLElement, touchX: number): ContextMenuPresentation {
  const box = element.getBoundingClientRect()
  const rect = { x: box.left, y: box.top, width: box.width, height: box.height }
  const style = getComputedStyle(element)
  const short = Math.min(rect.width, rect.height)
  const own = px(style.borderTopLeftRadius, short)
  const fallback = px(style.getPropertyValue("--context-menu-preview-radius"), short) || PREVIEW_RADIUS
  const radius = Math.min(own > 0 ? own : fallback, short / 2)
  const width = element.ownerDocument.defaultView?.innerWidth ?? rect.x + rect.width
  return { kind: "preview", rect, radius, align: touchX < width / 2 ? "start" : "end" }
}

/** The menu's side, alignment and offsets for a presentation. */
export function contextMenuPlacement(presentation: ContextMenuPresentation | null) {
  if (presentation?.kind === "preview")
    return { side: "bottom" as const, align: presentation.align, sideOffset: CONTEXT_MENU_PREVIEW_GAP, alignOffset: 0 }
  if (presentation?.kind === "keyboard") return { side: "bottom" as const, align: "start" as const, sideOffset: 5, alignOffset: 0 }
  // As a desktop context menu, its corner at the pointer.
  return { side: "bottom" as const, align: "start" as const, sideOffset: 2, alignOffset: 0 }
}

const round = (value: number) => Math.round(value * 100) / 100

/**
 * The dimming covers the page but the element: an SVG mask with the element's rounded box cut out, written to
 * `--context-menu-hole`, so the element stays clear above the dimmed, blurred page.
 */
export function contextMenuHoleMask(preview: Extract<ContextMenuPresentation, { kind: "preview" }>, viewport?: { width: number; height: number }) {
  const width = round(viewport?.width ?? window.innerWidth)
  const height = round(viewport?.height ?? window.innerHeight)
  const x = round(preview.rect.x)
  const y = round(preview.rect.y)
  const w = round(preview.rect.width)
  const h = round(preview.rect.height)
  const r = round(preview.radius)
  const hole = `M${x + r} ${y}H${round(x + w - r)}A${r} ${r} 0 0 1 ${x + w} ${round(y + r)}V${round(y + h - r)}A${r} ${r} 0 0 1 ${round(x + w - r)} ${round(y + h)}H${round(x + r)}A${r} ${r} 0 0 1 ${x} ${round(y + h - r)}V${round(y + r)}A${r} ${r} 0 0 1 ${round(x + r)} ${y}Z`
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'><path fill-rule='evenodd' d='M0 0H${width}V${height}H0Z${hole}'/></svg>`
  return { "--context-menu-hole": `url("data:image/svg+xml,${encodeURIComponent(svg)}")` }
}
