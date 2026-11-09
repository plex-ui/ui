// The motion of Dialog Steps (Dialog.module.css): the next step comes in over the one before, as a push on iOS.
import s from "@plexui/styles/components/Dialog/Dialog.module.css"

export const STEP_TIMING = { enterDuration: 300, exitDuration: 300 }

// A transition can hand an SVG element; a step is always the HTML element Steps renders
type TransitionElement = HTMLElement | SVGElement

// Focus in the step that leaves moves to the one that comes in, so a press on Next does not drop it to the page. A
// step that comes back while it still leaves (Back right after Next) is inert for a moment and takes no focus, so
// the focus moves once it is not.
export const enterStep = (element: TransitionElement) => {
  if (!(element instanceof HTMLElement)) return
  delete element.dataset.exitDirection
  element.style.removeProperty("top")
  const active = element.ownerDocument.activeElement
  const steps = element.parentElement
  if (!active || !steps?.contains(active) || element.contains(active)) return
  const view = element.ownerDocument.defaultView
  const focus = (frames: number) => {
    if (!element.isConnected) return
    if (element.inert && frames > 0 && view) {
      view.requestAnimationFrame(() => focus(frames - 1))
      return
    }
    element.querySelector<HTMLElement>(":scope > [data-dialog-step]")?.focus({ preventScroll: true })
  }
  focus(3)
}

// The lowest edge of the steps still leaving, from the top of the steps: the step that comes in covers them to it
const exitExtent = (steps: HTMLElement, except?: Element) =>
  Math.max(
    0,
    ...Array.from(steps.children)
      .filter((child): child is HTMLElement => child instanceof HTMLElement && child !== except && child.hasAttribute("data-exiting"))
      .map((child) => (Number.parseFloat(child.style.top) || 0) + child.offsetHeight),
  )

export const leaveStep = (element: TransitionElement) => {
  if (!(element instanceof HTMLElement)) return
  const steps = element.parentElement
  if (!steps) return
  // A later step can change the direction while this one still leaves
  element.dataset.exitDirection = steps.dataset.direction === "back" ? "back" : "forward"
  // The new step starts at its top, as a pushed screen does; the one that leaves keeps its place on screen
  const scroller = steps.closest<HTMLElement>(`.${s.Body}, .${s.Panel}`)
  if (scroller) {
    const padding = Number.parseFloat(getComputedStyle(scroller).scrollPaddingTop) || 0
    const stepsTop = steps.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
    const target = Math.max(0, Math.min(scroller.scrollTop, Math.round(stepsTop - padding)))
    const offset = scroller.scrollTop - target
    if (offset > 0) {
      element.style.top = `${-offset}px`
      scroller.scrollTop = target
    }
  }
  // The steps keep the height of the one that leaves, then take the new one's as it comes in. A step that still
  // leaves from a step before stays covered too.
  const height = element.offsetHeight
  const extent = Math.max(exitExtent(steps, element), (Number.parseFloat(element.style.top) || 0) + height)
  steps.style.setProperty("--dialog-steps-exit-height", `${extent}px`)
  steps.style.transition = "none"
  steps.style.minHeight = `${height}px`
}

export const settleStepHeight = (element: TransitionElement) => {
  if (!(element instanceof HTMLElement)) return
  const steps = element.parentElement
  const entering = steps?.querySelector<HTMLElement>(":scope > :not([data-exiting])")
  if (!steps || !entering) return
  steps.style.transition = "min-height var(--motion-enter-large) var(--cubic-enter)"
  steps.style.minHeight = `${entering.offsetHeight}px`
}

export const releaseStepHeight = (element: TransitionElement) => {
  if (!(element instanceof HTMLElement)) return
  const steps = element.parentElement
  if (!steps) return
  // Another step still leaving keeps the height, and the cover reaches its edge
  if (Array.from(steps.children).some((child) => child !== element && child.hasAttribute("data-exiting"))) {
    steps.style.setProperty("--dialog-steps-exit-height", `${exitExtent(steps, element)}px`)
    return
  }
  steps.style.removeProperty("min-height")
  steps.style.removeProperty("transition")
  steps.style.removeProperty("--dialog-steps-exit-height")
}
