// Shared with packages/ui/src/components/ContextMenu/shared.ts: keep the two copies the same.
import { PHONE_LAYOUT_SCOPE } from "../../lib/phoneLayout.js"
export { CONTEXT_MENU_LONG_PRESS, CONTEXT_MENU_LONG_PRESS_SLOP } from "../../lib/contextMenuHold.js"

/** The kit's gap between the preview and the menu: iOS 27 Context Menu 125:58750, Alignment=Vertical, the menu at
 * 176.5 under a content area that ends at 160.5 (the iOS 26 kit had 18). */
export const CONTEXT_MENU_PREVIEW_GAP = 16
/** The kit's preview corner (Content Area, radius 30), for an element without corners of its own. */
const PREVIEW_RADIUS = 30

type Rect = { x: number; y: number; width: number; height: number }

/**
 * Where the menu opens: at the pointer, under the element for the keyboard, or beside a touch-and-hold preview. A
 * preview's `rect` is where it stands; once the menu is measured, `side` is the side of the preview it opens on and
 * `shift` how far the preview moved up so that the menu stands whole below it.
 */
export type ContextMenuPresentation =
  | { kind: "pointer"; rect: Rect }
  | { kind: "keyboard"; rect: Rect }
  | { kind: "preview"; rect: Rect; radius: number; align: "start" | "center" | "end"; side?: "top" | "bottom"; shift?: number }

const px = (value: string, base: number) => {
  const number = Number.parseFloat(value)
  if (!Number.isFinite(number)) return 0
  return value.trim().endsWith("%") ? (number / 100) * base : number
}

/**
 * The preview of a touch and hold: the element's box and corner (its own, or `--context-menu-preview-radius`), and
 * where the menu keeps to across it, as iOS 27.2 places it by where the element stands on the screen, wherever the
 * touch (ref-app menus-context, block 8): in the leading third its leading edge, in the trailing third its trailing
 * edge, else its centre (a full-width row, a tile in the middle). The kit draws only Side=Leading and Side=Trailing.
 * The screen is a PhoneLayout's box when the element is in one (a phone Dialog's scope has no box: the window is its
 * screen), as for a menu that covers its trigger (menuTriggerCover.ts).
 */
export function contextMenuPreview(element: HTMLElement): ContextMenuPresentation {
  const box = element.getBoundingClientRect()
  const rect = { x: box.left, y: box.top, width: box.width, height: box.height }
  const style = getComputedStyle(element)
  const short = Math.min(rect.width, rect.height)
  const own = px(style.borderTopLeftRadius, short)
  const fallback = px(style.getPropertyValue("--context-menu-preview-radius"), short) || PREVIEW_RADIUS
  const radius = Math.min(own > 0 ? own : fallback, short / 2)
  const frame = element.closest(PHONE_LAYOUT_SCOPE)?.getBoundingClientRect()
  const start = frame && frame.width > 0 ? frame.left : 0
  const width = frame && frame.width > 0 ? frame.width : element.ownerDocument.defaultView?.innerWidth ?? rect.x + rect.width
  const centre = rect.x + rect.width / 2 - start
  return { kind: "preview", rect, radius, align: centre < width / 3 ? "start" : centre > (width * 2) / 3 ? "end" : "center" }
}

/** The menu's side, alignment and offsets for a presentation. */
export function contextMenuPlacement(presentation: ContextMenuPresentation | null) {
  if (presentation?.kind === "preview")
    return { side: presentation.side ?? ("bottom" as const), align: presentation.align, sideOffset: CONTEXT_MENU_PREVIEW_GAP, alignOffset: 0 }
  if (presentation?.kind === "keyboard") return { side: "bottom" as const, align: "start" as const, sideOffset: 5, alignOffset: 0 }
  // As a desktop context menu, its corner at the pointer.
  return { side: "bottom" as const, align: "start" as const, sideOffset: 2, alignOffset: 0 }
}

const round = (value: number) => Math.round(value * 100) / 100

/**
 * The dimming covers the page but the element: the element's rounded box is cut out of it, so the element stays
 * clear above the dimmed, blurred page. `--context-menu-hole` draws the cut (an SVG mask), and
 * `--context-menu-hole-clip` the same shape as a clip path, through which a press reaches the element: a mask leaves
 * the dimming pressable, a clip path does not.
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
  const path = `M0 0H${width}V${height}H0Z${hole}`
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}' viewBox='0 0 ${width} ${height}'><path fill-rule='evenodd' d='${path}'/></svg>`
  return {
    "--context-menu-hole": `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
    "--context-menu-hole-clip": `path(evenodd, "${path}")`,
  }
}

/**
 * How far the preview moves up so that a menu `height` tall stands whole below it, as iOS moves a lifted preview:
 * within `room` (the top and bottom the menu keeps to), and no higher than `ceiling`, the top of a box that clips
 * the element. Nothing when the menu fits. When no move lets it stand whole below, nothing either if it stands whole
 * above the element, where it then opens; else as far as the room above lets it, and the menu scrolls. All on the
 * screen: `scale` is the one a PhoneLayout is drawn at, which the gap takes too.
 */
export function contextMenuPreviewShift(rect: Rect, height: number, room: { top: number; bottom: number }, ceiling = -Infinity, scale = 1) {
  const gap = CONTEXT_MENU_PREVIEW_GAP * scale
  const missing = rect.y + rect.height + gap + height - room.bottom
  if (missing <= 0) return 0
  const allowed = Math.max(0, rect.y - Math.max(room.top, ceiling))
  if (missing <= allowed) return round(missing)
  return rect.y - gap - height >= room.top ? 0 : round(allowed)
}

/**
 * The side a preview's menu opens on, and how far the preview moves up for it: above, unmoved, when the preview stands
 * in the lower half of the room and the menu stands whole above it, as iOS 27.2 opens a menu toward the larger room
 * (ref-app menus-context-small, block 8: a tile low on the screen opens its menu above, with room below too); else
 * below, the preview moved up as `contextMenuPreviewShift` says.
 */
export function contextMenuPreviewLayout(rect: Rect, height: number, room: { top: number; bottom: number }, ceiling = -Infinity, scale = 1) {
  const gap = CONTEXT_MENU_PREVIEW_GAP * scale
  if (rect.y + rect.height / 2 > (room.top + room.bottom) / 2 && rect.y - gap - height >= room.top)
    return { side: "top" as const, shift: 0 }
  return { side: "bottom" as const, shift: contextMenuPreviewShift(rect, height, room, ceiling, scale) }
}

/** The top of the nearest box that clips the element: moved above it, the element would not be seen. */
export function contextMenuClipTop(element: HTMLElement) {
  const view = element.ownerDocument.defaultView
  let top = -Infinity
  for (let node = element.parentElement; node && node !== element.ownerDocument.documentElement; node = node.parentElement) {
    const style = view?.getComputedStyle(node)
    if (style && (style.overflowX !== "visible" || style.overflowY !== "visible"))
      top = Math.max(top, node.getBoundingClientRect().top + node.clientTop)
  }
  return top
}

/** A menu's height without the limit of the room it is given: the panel, and what its items scroll out of sight. */
export function contextMenuNaturalHeight(content: HTMLElement) {
  const hidden = (element: Element) => (element instanceof HTMLElement ? Math.max(0, element.scrollHeight - element.clientHeight) : 0)
  return [...content.children].reduce((height, child) => height + hidden(child), content.offsetHeight + hidden(content))
}

/**
 * The name of the element a menu is for, which names the menu, in the order of accessible names: the text it is
 * labelled by, its own label, its text, or the text of a picture it is or shows.
 */
export function contextMenuName(element: HTMLElement) {
  const text = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim()
  const doc = element.ownerDocument
  const ids = text(element.getAttribute("aria-labelledby")).split(" ").filter(Boolean)
  const labelled = text(ids.map((id) => doc.getElementById(id)?.textContent ?? "").join(" "))
  if (labelled) return labelled
  const label = text(element.getAttribute("aria-label"))
  if (label) return label
  const picture = element.matches("img[alt]") ? element : element.querySelector("img[alt]")
  return text(element.textContent) || text(picture?.getAttribute("alt"))
}

/**
 * The box the anchor and the dimming lie in when they portal into a PhoneLayout, which is their containing block:
 * its padding box on the screen, and its scale when the frame is drawn smaller or larger. Null for the window.
 */
export type ContextMenuFrame = { left: number; top: number; scaleX: number; scaleY: number; width: number; height: number }

export function contextMenuFrame(box: HTMLElement | null | undefined): ContextMenuFrame | null {
  if (!box) return null
  const rect = box.getBoundingClientRect()
  const scaleX = box.offsetWidth > 0 ? rect.width / box.offsetWidth : 1
  const scaleY = box.offsetHeight > 0 ? rect.height / box.offsetHeight : 1
  return {
    left: rect.left + box.clientLeft * scaleX,
    top: rect.top + box.clientTop * scaleY,
    scaleX,
    scaleY,
    width: box.clientWidth,
    height: box.clientHeight,
  }
}

/** A rectangle on the screen in the coordinates of the frame, or as it is for the window. */
export const contextMenuInFrame = (rect: Rect, frame: ContextMenuFrame | null): Rect =>
  frame
    ? {
        x: round((rect.x - frame.left) / frame.scaleX),
        y: round((rect.y - frame.top) / frame.scaleY),
        width: round(rect.width / frame.scaleX),
        height: round(rect.height / frame.scaleY),
      }
    : rect

/** The duration and easing of a motion token (`--motion-enter` with `--cubic-enter`), 0 where motion is reduced. */
const motion = (element: HTMLElement, name: "enter" | "exit") => {
  const style = getComputedStyle(element)
  const value = style.getPropertyValue(`--motion-${name}`).trim()
  const number = Number.parseFloat(value)
  const duration = !Number.isFinite(number) ? 0 : value.endsWith("ms") ? number : value.endsWith("s") ? number * 1000 : 0
  return { duration, easing: style.getPropertyValue(`--cubic-${name}`).trim() || "ease" }
}

/** The parts of a computed `translate` (`none`, or x, y and z lengths, a `calc()` among them). */
const translateParts = (value: string) => {
  const parts: string[] = []
  let depth = 0
  let part = ""
  for (const char of value.trim()) {
    if (char === "(") depth += 1
    if (char === ")") depth -= 1
    if (char === " " && depth === 0) {
      if (part) parts.push(part)
      part = ""
    } else part += char
  }
  if (part) parts.push(part)
  return parts
}

/**
 * How large the element's pixels are drawn on the screen: the scale of the nearest box around it with a height, such
 * as a PhoneLayout drawn smaller. Read from its parents, which a transition or animation of the element's own does not
 * move.
 */
const screenScale = (element: HTMLElement) => {
  for (let node = element.parentElement; node; node = node.parentElement) {
    if (node.offsetHeight > 0) {
      const scale = node.getBoundingClientRect().height / node.offsetHeight
      return scale > 0 && Number.isFinite(scale) ? scale : 1
    }
  }
  return 1
}

/**
 * Changes the element's `translate` without a transition of its own (`transition: all` or one on `translate`): the
 * move has its own glide, and a drag measures the element right after it is put back. The transition the change
 * starts is cancelled, which shows the new value at once and leaves the element's own style as it was.
 */
const withoutTransition = (element: HTMLElement, change: () => void) => {
  change()
  // Reading the style starts the element's transition, if it has one
  void getComputedStyle(element).getPropertyValue("translate")
  for (const animation of element.getAnimations?.() ?? []) {
    if ("transitionProperty" in animation && animation.transitionProperty === "translate") animation.cancel()
  }
}

/**
 * Moves the element up by `shift` pixels of the screen while its preview stands, gliding there as the dimming comes in
 * (or at once, for a menu held open that is placed again), and returns how to put it back: gliding as the dimming
 * goes, or at once for a drag that measures where the element stands; called again at once, it stops that glide. An
 * animation, not a transition, so the element's own styles stay; the move adds to a `translate` the element has.
 */
export function liftContextMenuPreview(element: HTMLElement, shift: number, smooth = true): (glide: boolean) => void {
  const previous = element.style.getPropertyValue("translate")
  const computed = getComputedStyle(element).getPropertyValue("translate").trim()
  const own = computed && computed !== "none" ? translateParts(computed) : []
  const rest = own.length > 0 ? computed : "none"
  const by = round(shift / screenScale(element))
  const raised = own.length > 0 ? [own[0], `calc(${own[1] ?? "0px"} - ${by}px)`, ...own.slice(2)].join(" ") : `0 ${-by}px`
  withoutTransition(element, () => element.style.setProperty("translate", raised))
  const glide = (from: string, to: string, name: "enter" | "exit") => {
    const { duration, easing } = motion(element, name)
    return duration > 0 && typeof element.animate === "function"
      ? element.animate([{ translate: from }, { translate: to }], { duration, easing })
      : undefined
  }
  let animation = smooth ? glide(rest, raised, "enter") : undefined
  let lifted = true
  return (back) => {
    if (!lifted) {
      if (!back) animation?.cancel()
      return
    }
    lifted = false
    animation?.cancel()
    withoutTransition(element, () => {
      if (previous) element.style.setProperty("translate", previous)
      else element.style.removeProperty("translate")
    })
    animation = back ? glide(raised, rest, "exit") : undefined
  }
}
