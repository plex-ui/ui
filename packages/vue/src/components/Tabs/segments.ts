/**
 * One width for the segments of a phone's segmented control. Shared by the React and Vue packages (the Vue copy must
 * match).
 *
 * UISegmentedControl at its own width gives every segment the widest one's width (iOS 27.2); where that does not fit,
 * each segment takes its label and the same air around it, as apportionsSegmentWidthsByContent does (ref-app
 * segmented-hug, 13.11). A grid that hugs its content cannot size its tracks to the widest one by itself (the browser
 * sizes it by the sum of its labels), so the widest is measured here and set as the track. Tabs.module.css asks for it
 * with `--tabs-equal-segments: 1` on a phone's horizontal control that is not `block`; elsewhere nothing is set.
 */

const TRACK = "--tabs-segment-track"

/** The phone block of Tabs.module.css, where a control starts or stops asking for one width */
const PHONE_QUERY = "(max-width: 767px)"

/** Slack for the rounding of clientWidth */
const FIT_TOLERANCE_PX = 1

const px = (style: CSSStyleDeclaration, name: string) => Number.parseFloat(style.getPropertyValue(name)) || 0

/** The control's border box as laid out, unscaled and unrounded (offsetWidth rounds to whole pixels) */
const laidOutWidth = (root: HTMLElement, style: CSSStyleDeclaration) => {
  const width = px(style, "width")
  if (!width) return root.offsetWidth
  if (style.getPropertyValue("box-sizing") === "border-box") return width
  const sides = ["padding-left", "padding-right", "border-left-width", "border-right-width"]
  return sides.reduce((sum, side) => sum + px(style, side), width)
}

/** Sets the track and says whether it changed, so a thumb on a segment that moved can follow. */
export function equalizeSegments(root: HTMLElement | null, thumb: HTMLElement | null): boolean {
  if (!root) return false
  const before = root.style.getPropertyValue(TRACK)
  const style = getComputedStyle(root)
  const asked = style.getPropertyValue("--tabs-equal-segments").trim() === "1"
  // The segments of the row: a tab that is not drawn takes no track
  const segments = Array.from(root.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child !== thumb && getComputedStyle(child).getPropertyValue("display") !== "none",
  )
  if (!asked || root.getAttribute("data-orientation") !== "horizontal" || segments.length < 2 || !root.offsetWidth) {
    root.style.removeProperty(TRACK)
  } else {
    // Each segment at its label's width, unscaled while the control is held (it grows under the finger)
    root.style.setProperty(TRACK, "max-content")
    const width = laidOutWidth(root, style)
    const scale = width / (root.getBoundingClientRect().width || width)
    const widest = Math.max(...segments.map((segment) => segment.getBoundingClientRect().width * scale))
    root.style.setProperty(TRACK, `minmax(${widest}px, 1fr)`)
    // The row of equal segments against the room the control has, counted: scrollWidth would take in a thumb still
    // standing where its segment was
    const row = widest * segments.length + px(style, "column-gap") * (segments.length - 1)
    const room = root.clientWidth - px(style, "padding-left") - px(style, "padding-right")
    if (row > room + FIT_TOLERANCE_PX) root.style.removeProperty(TRACK)
  }
  return root.style.getPropertyValue(TRACK) !== before
}

/**
 * Measures again when the room changes (the segments may fit one width now), when the screen crosses into or out of
 * the phone block (the control starts or stops asking, its room unchanged) and when the font loads and the labels
 * widen. `moved` runs when the track changed, so the thumb can follow its segment, and always once the font has
 * loaded: segments sized by their labels move then with no track and no size changing. Returns the cleanup.
 */
export function watchSegments(root: HTMLElement, thumb: () => HTMLElement | null, moved: () => void): () => void {
  const refit = () => {
    if (equalizeSegments(root, thumb())) moved()
  }
  const box = root.parentElement
  const observer = box && typeof ResizeObserver !== "undefined" ? new ResizeObserver(refit) : undefined
  if (box) observer?.observe(box)
  const phone = typeof window.matchMedia === "function" ? window.matchMedia(PHONE_QUERY) : undefined
  // Browsers before 2020 offer only addListener
  if (phone?.addEventListener) phone.addEventListener("change", refit)
  else phone?.addListener?.(refit)
  let live = true
  document.fonts?.ready.then(() => {
    if (!live) return
    equalizeSegments(root, thumb())
    moved()
  })
  return () => {
    live = false
    observer?.disconnect()
    if (phone?.removeEventListener) phone.removeEventListener("change", refit)
    else phone?.removeListener?.(refit)
  }
}
