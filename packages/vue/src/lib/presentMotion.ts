/**
 * How a phone overlay comes and goes as on iOS 27.2. A sheet always slides up from the bottom of the screen and back
 * down, never out of the button that opened it (the owner's decision, 2026-11-26): on a spring with no bounce,
 * spring(duration: 0.34, bounce: 0), measured on a Reminders sheet in the simulator (half its way at 91 ms, 90% at
 * 210, 99.9% at 500), the scrim on the same curve, both ways. A sheet the finger lets go of carries on at the finger's
 * speed, to its rest or off the screen. A menu grows out of its control, as an iOS pull-down menu does. The CSS springs
 * (--spring-sheet, --spring-menu) are these springs sampled; a released sheet needs one that starts at the finger's
 * speed, which only a runtime sample has.
 */

/** SwiftUI's spring(duration:bounce:) with mass 1 */
export type Spring = { duration: number; bounce: number }

export const SHEET_SPRING: Spring = { duration: 0.34, bounce: 0 }
/** A released sheet does not overshoot: past its rest it would lift off the bottom of the screen. */
export const SHEET_RELEASE_SPRING: Spring = { duration: 0.33, bounce: 0 }
export const MENU_SPRING: Spring = { duration: 0.21, bounce: 0.2 }
/**
 * The time a sheet takes to come or go, as --spring-sheet-duration: the spring is within 0.001 of its end by then.
 * A sheet pulled down leaves within it too.
 */
export const SHEET_SPRING_MS = 500
/** The time the menu's spring takes to settle within 0.001, as --spring-menu-duration. */
export const MENU_SPRING_MS = 325
/** The longest a sheet takes to leave, off the screen from a finger's release. */
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

/**
 * Whether a phone overlay moves on the iOS springs (a menu out of its button, a sheet up from the bottom): not with
 * reduced motion, nor in the Plex Android look.
 */
export function growsFromButton(element: Element | null | undefined): boolean {
  const doc = element?.ownerDocument ?? (typeof document === "undefined" ? undefined : document)
  const view = doc?.defaultView
  if (!doc || !view) return false
  if (view.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false
  return !(element ?? doc.documentElement).closest("[data-platform='android']")
}
