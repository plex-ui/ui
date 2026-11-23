/**
 * How a phone overlay comes and goes as on iOS 27.2: a sheet grows out of the button that opened it and shrinks back
 * into it as it closes, on SwiftUI's spring(duration: 0.33, bounce: 0.2); a sheet the finger lets go of carries on at
 * the finger's speed, to its rest or off the screen. The CSS springs (--spring-sheet, --spring-menu) are these springs
 * sampled; a released sheet needs one that starts at the finger's speed, which only a runtime sample has.
 */

/** SwiftUI's spring(duration:bounce:) with mass 1 */
export type Spring = { duration: number; bounce: number }

export const SHEET_SPRING: Spring = { duration: 0.33, bounce: 0.2 }
/** A released sheet does not overshoot: past its rest it would lift off the bottom of the screen. */
export const SHEET_RELEASE_SPRING: Spring = { duration: 0.33, bounce: 0 }
export const MENU_SPRING: Spring = { duration: 0.21, bounce: 0.2 }
/** The time these springs take to settle within 0.001, as --spring-sheet-duration and --spring-menu-duration. */
export const SHEET_SPRING_MS = 495
export const MENU_SPRING_MS = 325
/** The longest a sheet takes to leave: back into its button, or off the screen from a finger's release. */
export const SHEET_EXIT_MS = 500

const STEP = 1 / 2000
const SAMPLE = 1 / 120
const LONGEST = 2

/**
 * A spring as a CSS easing and the time it takes to settle. `velocity` is the start speed in units of the whole move
 * per second: a finger at 1 px/ms with 200 px left to go is 5. `stopAtEnd` keeps it from passing its end, as a sheet
 * let go of toward its rest must not lift off the bottom of the screen however fast it comes.
 */
export function springEasing(
  { duration, bounce }: Spring,
  velocity = 0,
  stopAtEnd = false,
): { easing: string; ms: number } {
  const stiffness = (2 * Math.PI / duration) ** 2
  const damping = (4 * Math.PI * (1 - bounce)) / duration
  let x = 0
  let v = velocity
  let t = 0
  let settled = 0
  const samples: [number, number][] = [[0, 0]]
  let nextSample = SAMPLE
  while (t < LONGEST) {
    v += (-stiffness * (x - 1) - damping * v) * STEP
    x += v * STEP
    t += STEP
    if (stopAtEnd && x >= 1) {
      x = 1
      v = 0
    }
    if (Math.abs(x - 1) > 0.001 || Math.abs(v) > 0.01) settled = t
    if (t >= nextSample) {
      samples.push([t, x])
      nextSample += SAMPLE
    }
    if (t - settled > 0.3) break
  }
  const total = Math.max(settled, SAMPLE)
  const points = samples.filter(([time]) => time < total).map(([time, value]) => {
    const share = `${Math.round((time / total) * 1000) / 10}%`
    return `${Math.round(value * 1000) / 1000} ${share}`
  })
  points[0] = "0"
  return { easing: `linear(${[...points, "1"].join(", ")})`, ms: Math.round(total * 1000) }
}

// The control last pressed, by a finger, a pointer or a key: the button a sheet opened from. A menu item is no source:
// its menu closes as the sheet comes, so the sheet slides up as one from a menu does on iOS.
const PRESSABLE = "button, a[href], [role='button'], [role='tab'], summary"
let lastPress: { element: Element; time: number } | null = null
const watched = new WeakSet<Document>()

const remember = (event: Event) => {
  if (event instanceof KeyboardEvent && event.key !== "Enter" && event.key !== " ") return
  const target = event.target
  const element = target instanceof Element ? target.closest(PRESSABLE) : null
  lastPress = element && !element.closest("[role='menu'], [role='listbox']") ? { element, time: event.timeStamp } : null
}

/** Starts noting what each press lands on, once per document. */
export function watchPresentationSources(doc: Document | undefined) {
  if (!doc || watched.has(doc)) return
  watched.add(doc)
  doc.addEventListener("pointerdown", remember, { capture: true, passive: true })
  doc.addEventListener("keydown", remember, { capture: true, passive: true })
}

/** The control pressed just now, which an overlay opening now opens from, if any. */
export function presentationSource(doc: Document | undefined): Element | null {
  if (!doc || !lastPress) return null
  const view = doc.defaultView
  const recent = view && view.performance.now() - lastPress.time < 1000
  return recent && lastPress.element.isConnected && lastPress.element.ownerDocument === doc ? lastPress.element : null
}

const toPixels = (value: string | undefined, size: number) => {
  if (!value) return size / 2
  const number = Number.parseFloat(value)
  if (!Number.isFinite(number)) return size / 2
  return value.endsWith("%") ? (number / 100) * size : number
}

/**
 * The transform that lays the panel, at its rest, over the source: the panel grows out of it from there. Null when
 * the source is gone, has no size, lies off the screen or inside the panel: the panel then comes as it would alone.
 */
export function sourceTransform(panel: HTMLElement, source: Element | null): string | null {
  if (!source?.isConnected || panel.contains(source)) return null
  const view = panel.ownerDocument.defaultView
  if (!view) return null
  const from = source.getBoundingClientRect()
  if (!from.width || !from.height) return null
  if (from.bottom <= 0 || from.right <= 0 || from.top >= view.innerHeight || from.left >= view.innerWidth) return null
  // The rest is the panel without the transform of its entrance, its exit or a drag, nor of one under way: its layout
  // box, which transforms leave alone, inside its offset parent (the dialog's layer, which nothing transforms).
  const parent = panel.offsetParent instanceof view.HTMLElement ? panel.offsetParent : null
  const base = parent?.getBoundingClientRect()
  const to = base
    ? new view.DOMRect(
        base.left + parent!.clientLeft + panel.offsetLeft,
        base.top + parent!.clientTop + panel.offsetTop,
        panel.offsetWidth,
        panel.offsetHeight,
      )
    : panel.getBoundingClientRect()
  const [originX, originY] = view.getComputedStyle(panel).transformOrigin.split(" ")
  if (!to.width || !to.height) return null
  const ox = to.left + toPixels(originX, to.width)
  const oy = to.top + toPixels(originY, to.height)
  const sx = from.width / to.width
  const sy = from.height / to.height
  const tx = from.left - ox - sx * (to.left - ox)
  const ty = from.top - oy - sy * (to.top - oy)
  const round = (value: number) => Math.round(value * 1000) / 1000
  return `translate(${round(tx)}px, ${round(ty)}px) scale(${round(sx)}, ${round(sy)})`
}

/**
 * A phone menu covers its button, its corner on the button's (menuTriggerCover.ts), and grows from its transform
 * origin, which Radix puts at that corner: the scale that makes it the button's size there is all it takes. Sizes are
 * the boxes' own, so this holds before the menu is placed.
 */
export function sourceScale(panel: HTMLElement, source: HTMLElement | null): string | null {
  if (!source?.isConnected || panel.contains(source)) return null
  if (!panel.offsetWidth || !panel.offsetHeight || !source.offsetWidth || !source.offsetHeight) return null
  const round = (value: number) => Math.round(value * 1000) / 1000
  return `scale(${round(source.offsetWidth / panel.offsetWidth)}, ${round(source.offsetHeight / panel.offsetHeight)})`
}

/** Whether a phone overlay may grow out of its button: not with reduced motion, nor in the Plex Android look. */
export function growsFromButton(element: Element | null | undefined): boolean {
  const doc = element?.ownerDocument ?? (typeof document === "undefined" ? undefined : document)
  const view = doc?.defaultView
  if (!doc || !view) return false
  if (view.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false
  return !(element ?? doc.documentElement).closest("[data-platform='android']")
}
