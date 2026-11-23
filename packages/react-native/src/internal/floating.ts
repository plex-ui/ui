import { I18nManager, Platform } from "react-native"
import type { MenuAnchor } from "../components/Menu/Menu"

export type FloatingSide = "top" | "right" | "bottom" | "left"
export type FloatingAlign = "start" | "center" | "end"

export type FloatingInput = {
  /** The trigger's box in the window (`measure`). */
  anchor: MenuAnchor
  /** The panel's size, once measured. */
  size: { width: number; height: number }
  /** The window's size. */
  window: { width: number; height: number }
  side: FloatingSide
  align: FloatingAlign
  /** From the trigger's edge to the panel's (to an arrow's point when it has one). */
  sideOffset: number
  /** Along the trigger's edge, from the aligned edge. */
  alignOffset?: number
  /** Kept free at each edge of the window (the safe area included by the caller). */
  padding: { top: number; right: number; bottom: number; left: number }
  /** Turns to the opposite side when the panel does not fit on its own (Radix's `avoidCollisions`). @default true */
  flip?: boolean
  /** An arrow's length along the panel's edge and the room it keeps from the corners (Radix's `arrowPadding`). */
  arrow?: { width: number; padding: number }
  /** A right-to-left layout: `start` is the right edge. */
  rtl?: boolean
}

export type FloatingPlace = {
  left: number
  top: number
  /** The side it ended on, after a turn. */
  side: FloatingSide
  /** Where the arrow's middle stands along the panel's edge, from its left or top. */
  arrow: number
}

const opposite: Record<FloatingSide, FloatingSide> = { top: "bottom", bottom: "top", left: "right", right: "left" }

/**
 * Places a floating panel at its trigger as Radix Popper does on the web (floating-ui's `offset`, `flip`, `shift` and
 * `arrow`): on its side, aligned to the trigger's start, center or end, turned to the other side when it does not fit
 * there and the other side has more room, then moved along the edge to stay inside the window's padding; an arrow
 * keeps pointing at the trigger's middle, clear of the panel's corners.
 */
export function placeFloating({ anchor, size, window, side, align, sideOffset, alignOffset = 0, padding, flip = true, arrow, rtl }: FloatingInput): FloatingPlace {
  const room = (s: FloatingSide) =>
    s === "bottom"
      ? window.height - padding.bottom - (anchor.y + anchor.height + sideOffset)
      : s === "top"
        ? anchor.y - sideOffset - padding.top
        : s === "right"
          ? window.width - padding.right - (anchor.x + anchor.width + sideOffset)
          : anchor.x - sideOffset - padding.left
  const needed = (s: FloatingSide) => (s === "top" || s === "bottom" ? size.height : size.width)
  let placed = side
  if (flip && room(side) < needed(side) && room(opposite[side]) > room(side)) placed = opposite[side]
  const vertical = placed === "top" || placed === "bottom"
  // The main axis
  let left = 0
  let top = 0
  if (placed === "bottom") top = anchor.y + anchor.height + sideOffset
  else if (placed === "top") top = anchor.y - sideOffset - size.height
  else if (placed === "right") left = anchor.x + anchor.width + sideOffset
  else left = anchor.x - sideOffset - size.width
  // The cross axis: start and end are the reading edges along a horizontal edge
  const length = vertical ? size.width : size.height
  const start = vertical ? anchor.x : anchor.y
  const extent = vertical ? anchor.width : anchor.height
  const flipped = vertical && (rtl ?? isRTLLayout())
  const edge = align === "center" ? "center" : (align === "start") !== flipped ? "low" : "high"
  let cross = edge === "center" ? start + extent / 2 - length / 2 : edge === "low" ? start + alignOffset : start + extent - length - alignOffset
  const low = vertical ? padding.left : padding.top
  const high = (vertical ? window.width - padding.right : window.height - padding.bottom) - length
  cross = Math.max(low, Math.min(cross, Math.max(low, high)))
  if (vertical) left = cross
  else top = cross
  // The arrow points at the trigger's middle, clear of the corners
  const middle = start + extent / 2 - cross
  const half = (arrow?.width ?? 0) / 2
  const inset = (arrow?.padding ?? 0) + half
  const arrowAt = Math.max(inset, Math.min(middle, length - inset))
  return { left, top, side: placed, arrow: arrowAt }
}

/** The layout's direction: a phone set to a right-to-left language (react-native-web reads the document's). */
function isRTLLayout() {
  if (Platform.OS === "web") {
    const doc = (globalThis as { document?: { documentElement?: { dir?: string } } }).document
    return doc?.documentElement?.dir === "rtl"
  }
  return I18nManager.isRTL
}

/** The origin a panel grows from: the middle of its edge at the trigger, as Radix's transform origin. */
export function floatingOrigin(side: FloatingSide, arrow: number, size: { width: number; height: number }) {
  switch (side) {
    case "bottom":
      return `${arrow}px 0px`
    case "top":
      return `${arrow}px ${size.height}px`
    case "right":
      return `0px ${arrow}px`
    case "left":
      return `${size.width}px ${arrow}px`
  }
}

/**
 * Props for a trigger element that a floating panel stands at: its node as the panel's anchor (the element itself,
 * so the trigger keeps its own place in the layout: a Button, a Pressable, a View or a Text hands its native view to
 * `ref`), after its own ref, and its layout, after its own `onLayout`, to place the panel again as it moves.
 */
export function anchorProps(props: { ref?: unknown; onLayout?: (event: never) => void }, setNode: (node: never) => void, onMove?: () => void) {
  return {
    ref: (node: unknown) => {
      setNode(node as never)
      assignRef(props.ref, node)
    },
    onLayout: (event: never) => {
      props.onLayout?.(event)
      onMove?.()
    },
  }
}

function assignRef(ref: unknown, value: unknown) {
  if (typeof ref === "function") ref(value)
  else if (ref != null && typeof ref === "object" && "current" in ref) (ref as { current: unknown }).current = value
}
