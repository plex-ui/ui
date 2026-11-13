/**
 * The widths of a phone's segmented control. Shared by the React and Vue packages (the Vue copy must match).
 *
 * UISegmentedControl at its own width gives every segment the widest one's width (iOS 27.2); where that does not fit,
 * each segment takes its label and the same air around it, as apportionsSegmentWidthsByContent does (ref-app
 * segmented-hug, 13.11), and where even that does not fit, the air beside each label narrows, to 4px, before the
 * segments scroll, as UIKit narrows a squeezed control's (Calendar's Напоминание stands 4pt inside its segment). A grid
 * that hugs its content cannot size its tracks to the widest one by itself (the browser sizes it by the sum of its
 * labels), so the widest is measured here and set as the track. Tabs.module.css asks for one width with
 * `--tabs-equal-segments: 1` and for the narrowing with `--tabs-fit-segments: 1`, on a phone's horizontal control that
 * is not `block`; elsewhere nothing is set.
 */

const TRACK = "--tabs-segment-track"
const GUTTER = "--tabs-segment-gutter"

/** The least air beside a label of a squeezed control: the large control's widest label, 4pt in Calendar */
const MIN_GUTTER_PX = 4

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

const sizing = (root: HTMLElement) => `${root.style.getPropertyValue(TRACK)}|${root.style.getPropertyValue(GUTTER)}`

/** Sets the track and the air of the segments and says whether they changed, so a thumb on a segment that moved can
 * follow. */
export function equalizeSegments(root: HTMLElement | null, thumb: HTMLElement | null): boolean {
  if (!root) return false
  const before = sizing(root)
  const style = getComputedStyle(root)
  const equal = style.getPropertyValue("--tabs-equal-segments").trim() === "1"
  const fit = style.getPropertyValue("--tabs-fit-segments").trim() === "1"
  // The segments of the row: a tab that is not drawn takes no track
  const segments = Array.from(root.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child !== thumb && getComputedStyle(child).getPropertyValue("display") !== "none",
  )
  root.style.removeProperty(GUTTER)
  if ((!equal && !fit) || root.getAttribute("data-orientation") !== "horizontal" || segments.length < 2 || !root.offsetWidth) {
    root.style.removeProperty(TRACK)
    return sizing(root) !== before
  }
  // Each segment at its label's width and full air, unscaled while the control is held (it grows under the finger)
  root.style.setProperty(TRACK, "max-content")
  const width = laidOutWidth(root, style)
  const scale = width / (root.getBoundingClientRect().width || width)
  const widths = segments.map((segment) => segment.getBoundingClientRect().width * scale)
  const widest = Math.max(...widths)
  const gaps = px(style, "column-gap") * (segments.length - 1)
  // Equal segments as wide as the control may grow: they fit, or the control stops at its room. Counted, not read
  // from scrollWidth, which a thumb still standing where its segment was would widen.
  root.style.setProperty(TRACK, `minmax(${widest}px, 1fr)`)
  const room = root.clientWidth - px(style, "padding-left") - px(style, "padding-right")
  const fitsEqual = widest * segments.length + gaps <= room + FIT_TOLERANCE_PX
  if (equal && fitsEqual) return sizing(root) !== before
  root.style.removeProperty(TRACK)
  const over = widths.reduce((sum, segment) => sum + segment, gaps) - room
  if (fit && !fitsEqual && over > FIT_TOLERANCE_PX) {
    // Labels by their widths still overflow: the air beside each narrows by its share, to the least. The air is read
    // laid out, in pixels: the token may be set in rem (0.75rem without touch.css)
    const gutter = px(getComputedStyle(segments[0]), "padding-left")
    const floors = segments.map((segment) => px(getComputedStyle(segment), "min-width"))
    const narrowed = Math.max(MIN_GUTTER_PX, airThatFits(widths, floors, gutter, room - gaps))
    if (narrowed < gutter) root.style.setProperty(GUTTER, `${narrowed}px`)
  }
  return sizing(root) !== before
}

/**
 * The air beside each label that brings the segments into the room: each narrows by the same amount on both sides,
 * except a segment held at its least width (a short label in a pill segment), which gives up no more, so the others
 * narrow further. -Infinity where nothing can narrow.
 */
function airThatFits(widths: number[], floors: number[], gutter: number, room: number): number {
  const held = new Set<number>()
  for (;;) {
    const free = widths.filter((_, index) => !held.has(index))
    if (!free.length) return Number.NEGATIVE_INFINITY
    const fixed = [...held].reduce((sum, index) => sum + floors[index], 0)
    const air = gutter - (free.reduce((sum, width) => sum + width, fixed) - room) / (2 * free.length)
    const reached = widths.map((_, index) => index).filter(
      (index) => !held.has(index) && widths[index] - 2 * (gutter - air) < floors[index],
    )
    if (!reached.length) return air
    for (const index of reached) held.add(index)
  }
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
