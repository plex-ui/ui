import { onBeforeUnmount, onMounted } from "vue"

// Internal: radix-ui 1.8's deferred outside press (DismissableLayer's
// `deferPointerDownOutside`), which Radix Popover and Dialog turn on and
// Reka's dismissable layer does not have. Reka dismisses on the pointerdown
// outside; Radix waits for the click that follows a primary-button press,
// keeps the layer when something outside stopped that click (or the
// pointerup / mouse / touch events before it) from reaching the document,
// and ignores focus moving outside meanwhile. Other buttons are left to Reka,
// which dismisses at once, as Radix does, and so are touches, which Reka
// already reports on their click; focus moving outside before that click is
// the touch too, as Radix defers a touch and ignores that focus.

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
export const useDeferredPointerDownOutside = (
  dismiss: (originalEvent: PointerEvent) => void,
  layer?: () => Element | null | undefined,
) => {
  let stop: (() => void) | undefined


  // A touch press until its click (Reka reports it then), or a moment after it lifts without one (a long press).
  // With the layer known, a touch outside it holds every focus moving outside, as Radix's deferred press does;
  // without it, only the focus the touch gives to what it touched.
  let touch: { id: number; target: EventTarget | null; outside: boolean; timer?: number } | undefined
  const clearTouch = () => {
    if (touch?.timer !== undefined) window.clearTimeout(touch.timer)
    touch = undefined
  }
  const onTouchDown = (event: PointerEvent) => {
    clearTouch()
    if (event.pointerType !== "touch" || event.button !== 0) return
    const root = layer?.()
    if (root && event.target instanceof Node && root.contains(event.target)) return
    touch = { id: event.pointerId, target: event.target, outside: Boolean(root) }
  }
  const onTouchUp = (event: PointerEvent) => {
    if (touch?.id === event.pointerId) touch.timer = window.setTimeout(clearTouch, 1000)
  }
  const onTouchCancel = (event: PointerEvent) => {
    if (touch?.id === event.pointerId) clearTouch()
  }
  // After Reka's click listener has reported the touch
  const onTouchClick = () => {
    if (touch) window.setTimeout(clearTouch, 0)
  }
  // A press is over: the deferred one, and a touch still waiting for its click (the layer closed some other way)
  const reset = () => {
    stop?.()
    stop = undefined
    clearTouch()
  }

  let ownerDocument: Document | undefined
  onMounted(() => {
    ownerDocument = document
    ownerDocument.addEventListener("pointerdown", onTouchDown, true)
    ownerDocument.addEventListener("pointerup", onTouchUp, true)
    ownerDocument.addEventListener("pointercancel", onTouchCancel, true)
    ownerDocument.addEventListener("click", onTouchClick, true)
  })

  onBeforeUnmount(() => {
    reset()
    ownerDocument?.removeEventListener("pointerdown", onTouchDown, true)
    ownerDocument?.removeEventListener("pointerup", onTouchUp, true)
    ownerDocument?.removeEventListener("pointercancel", onTouchCancel, true)
    ownerDocument?.removeEventListener("click", onTouchClick, true)
  })

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
    const handlePointerCancel = (event: PointerEvent) => {
      if (event.pointerId === originalEvent.pointerId) reset()
    }

    for (const name of OUTSIDE_INTERACTION_EVENTS) {
      ownerDocument.addEventListener(name, handleCapture, true)
      ownerDocument.addEventListener(name, handleBubble)
    }
    // After the bubble listener, so a click that got here counts as not stopped
    ownerDocument.addEventListener("click", finish)
    ownerDocument.addEventListener("pointerdown", handlePointerDown, true)
    ownerDocument.addEventListener("pointercancel", handlePointerCancel, true)

    stop = () => {
      active = false
      for (const name of OUTSIDE_INTERACTION_EVENTS) {
        ownerDocument.removeEventListener(name, handleCapture, true)
        ownerDocument.removeEventListener(name, handleBubble)
      }
      ownerDocument.removeEventListener("click", finish)
      ownerDocument.removeEventListener("pointerdown", handlePointerDown, true)
      ownerDocument.removeEventListener("pointercancel", handlePointerCancel, true)
    }
  }

  // Focus the pending touch gives to what it touched (or to the control around it) is that touch
  const focusedByTouch = (event: Event) => {
    if (touch?.outside) return true
    const focused = (event as CustomEvent<{ originalEvent?: FocusEvent }>).detail?.originalEvent?.target
    const touched = touch?.target
    return touched instanceof Node && focused instanceof Node && (touched.contains(focused) || focused.contains(touched))
  }

  const onFocusOutside = (event: Event) => {
    if (stop || focusedByTouch(event)) event.preventDefault()
  }

  return { onPointerDownOutside, onFocusOutside, reset }
}
