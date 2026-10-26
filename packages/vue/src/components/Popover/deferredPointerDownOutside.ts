import { onBeforeUnmount } from "vue"

// Internal: radix-ui 1.8's deferred outside press (DismissableLayer's
// `deferPointerDownOutside`), which Radix Popover and Dialog turn on and
// Reka's dismissable layer does not have. Reka dismisses on the pointerdown
// outside; Radix waits for the click that follows a primary-button press,
// keeps the layer when something outside stopped that click (or the
// pointerup / mouse / touch events before it) from reaching the document,
// and ignores focus moving outside meanwhile. Other buttons are left to Reka,
// which dismisses at once, as Radix does, and so are touches, which Reka
// already reports on their click.

type OutsideEvent = CustomEvent<{ originalEvent: PointerEvent }>

const OUTSIDE_INTERACTION_EVENTS = ["pointerup", "mousedown", "mouseup", "touchstart", "touchend", "click"]

/**
 * A layer's own dismiss affordance (a dialog overlay): pressing it dismisses
 * even when something stops the events, as Radix's dismissable surfaces.
 */
export const dismissableSurfaces = new Set<Element>()

const isOnDismissableSurface = (target: EventTarget | null) =>
  target instanceof Node && [...dismissableSurfaces].some((surface) => surface.contains(target))

/**
 * Listeners for Reka's `pointerDownOutside` and `focusOutside`; `dismiss`
 * runs on the click that completes a deferred press. `reset` drops a pending
 * press (the layer closed some other way); unmounting does it too.
 */
export const useDeferredPointerDownOutside = (dismiss: (originalEvent: PointerEvent) => void) => {
  let stop: (() => void) | undefined

  const reset = () => {
    stop?.()
    stop = undefined
  }

  onBeforeUnmount(reset)

  const onPointerDownOutside = (event: OutsideEvent) => {
    reset()
    const originalEvent = event.detail.originalEvent
    if (originalEvent.button !== 0 || originalEvent.pointerType === "touch") return
    // Reka must not dismiss now
    event.preventDefault()

    const ownerDocument = (originalEvent.target as Node | null)?.ownerDocument ?? document
    const intercepted = new Map<string, boolean>()
    let active = true

    const finish = () => {
      if (!active) return
      const wasIntercepted = [...intercepted.values()].some(Boolean)
      reset()
      if (!wasIntercepted) dismiss(originalEvent)
    }
    const handleCapture = (evt: Event) => {
      if (!isOnDismissableSurface(evt.target)) intercepted.set(evt.type, true)
      // A click stopped on its way to the document still ends the press
      if (evt.type === "click") window.setTimeout(finish, 0)
    }
    const handleBubble = (evt: Event) => {
      intercepted.set(evt.type, false)
    }
    // Any later press replaces this one (Reka reports the outside ones again)
    const handlePointerDown = () => reset()

    for (const name of OUTSIDE_INTERACTION_EVENTS) {
      ownerDocument.addEventListener(name, handleCapture, true)
      ownerDocument.addEventListener(name, handleBubble)
    }
    // After the bubble listener, so a click that got here counts as not stopped
    ownerDocument.addEventListener("click", finish)
    ownerDocument.addEventListener("pointerdown", handlePointerDown, true)

    stop = () => {
      active = false
      for (const name of OUTSIDE_INTERACTION_EVENTS) {
        ownerDocument.removeEventListener(name, handleCapture, true)
        ownerDocument.removeEventListener(name, handleBubble)
      }
      ownerDocument.removeEventListener("click", finish)
      ownerDocument.removeEventListener("pointerdown", handlePointerDown, true)
    }
  }

  const onFocusOutside = (event: Event) => {
    if (stop) event.preventDefault()
  }

  return { onPointerDownOutside, onFocusOutside, reset }
}
