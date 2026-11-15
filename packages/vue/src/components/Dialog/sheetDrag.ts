import { isPhoneLayout } from "../../lib/phoneLayout.js"

// A bottom sheet follows the finger. A drag from its top 44px moves it 1:1, never up. Past 30% of its
// height, or at 0.5px/ms, it closes; otherwise it returns. Buttons in that strip keep their press.
// As on iOS, a pull down that starts anywhere else moves the sheet too once the content under the finger is at
// its top: the first move decides, down and mostly vertical with every scroller under the finger at its top
// takes the sheet; up, sideways, a move another handler took, a field, a control that pans by itself or a
// finger that rested first (a hold: Sortable, a context menu) stays with the content.
const GRIP = 44
const CLOSE_SHARE = 0.3
const CLOSE_SPEED = 0.5
const REST = 100
const SETTLE = 400
const INTERACTIVE = "a, button, input, select, textarea, [role='button']"
const EDITABLE = "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='slider']"
// The move that settles which way the finger goes, under the browser's own slop so it can still be cancelled
const DECIDE = 4
// A finger that rests this long holds (a Sortable row, a context menu) rather than pulls
const HOLD = 200
const DRAG_TRANSFORM = "--dialog-panel-drag-transform"
const EXITING = "[data-exiting], [data-exiting-active]"

/** `close` returns false when the owner keeps the dialog open: the sheet then returns at once. */
export const attachSheetDrag = (panel: HTMLElement, close: (event: TouchEvent) => boolean | void) => {
  const view = panel.ownerDocument.defaultView
  if (!view) return () => {}
  let startY: number | null = null
  // A touch in the content that may become a pull, until its first move says which way it goes
  let pending: { x: number; y: number; time: number; target: Element } | null = null
  // The pull began in the content: its release must not press what lies under the finger
  let fromContent = false
  let lastY = 0
  let lastTime = 0
  let speed = 0
  let settleTimer: number | undefined

  const stopSettling = () => {
    if (settleTimer !== undefined) view.clearTimeout(settleTimer)
    settleTimer = undefined
    panel.removeEventListener("transitionend", onSettled)
  }
  const clearInline = () => {
    panel.style.transition = ""
    panel.style.transform = ""
  }
  const clear = () => {
    stopSettling()
    clearInline()
    panel.style.removeProperty(DRAG_TRANSFORM)
  }
  const onSettled = (event: TransitionEvent) => {
    if (event.target === panel && event.propertyName === "transform") clear()
  }
  const returnToRest = () => {
    stopSettling()
    if (view.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      clear()
      return
    }
    panel.style.transition = "transform var(--motion-enter) var(--cubic-enter)"
    panel.style.transform = ""
    panel.style.removeProperty(DRAG_TRANSFORM)
    const durationText = view.getComputedStyle(panel).transitionDuration
    const duration = Number.parseFloat(durationText) * (durationText.endsWith("ms") ? 1 : 1000)
    if (duration === 0) {
      clear()
      return
    }
    panel.addEventListener("transitionend", onSettled)
    // A theme can lengthen the token or remove the transition altogether.
    // This cleanup must not cut a valid longer transition at the veto timeout.
    settleTimer = view.setTimeout(clear, Math.max(SETTLE, Number.isFinite(duration) ? duration : 0))
  }

  const begin = (clientY: number, time: number) => {
    stopSettling()
    startY = clientY
    lastY = clientY
    lastTime = time
    speed = 0
  }

  // Every element from the target up to the panel: one that can scroll up, or pans by itself, keeps the move.
  const contentTakes = (target: Element) => {
    for (let element: Element | null = target; element; element = element.parentElement) {
      if (element.scrollTop > 0) return true
      const touchAction = view.getComputedStyle(element).touchAction
      if (touchAction && touchAction !== "auto" && touchAction !== "manipulation" && !touchAction.includes("pan-y")) return true
      if (element === panel) break
    }
    return false
  }

  const onStart = (event: TouchEvent) => {
    pending = null
    fromContent = false
    const phone = isPhoneLayout(panel)
    if (event.touches.length !== 1 || !phone || panel.closest(EXITING)) return
    const { clientX, clientY } = event.touches[0]
    const target = event.target instanceof view.Element ? event.target : null
    if (clientY - panel.getBoundingClientRect().top <= GRIP) {
      if (target?.closest(INTERACTIVE)) return
      begin(clientY, event.timeStamp)
      return
    }
    if (!target || target.closest(EDITABLE)) return
    pending = { x: clientX, y: clientY, time: event.timeStamp, target }
  }

  // The first move of a touch in the content: a pull down from the top takes the sheet from here on.
  const decide = (event: TouchEvent, touch: Touch) => {
    const start = pending!
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < DECIDE) return
    pending = null
    if (event.defaultPrevented || !event.cancelable || event.timeStamp - start.time > HOLD) return
    if (dy <= 0 || Math.abs(dx) > dy || contentTakes(start.target)) return
    fromContent = true
    begin(start.y, start.time)
  }

  const onMove = (event: TouchEvent) => {
    const touch = event.touches[0]
    if (startY === null && pending && touch) decide(event, touch)
    if (startY === null || !touch) return
    event.preventDefault()
    const { clientY } = touch
    speed = (clientY - lastY) / Math.max(1, event.timeStamp - lastTime)
    lastY = clientY
    lastTime = event.timeStamp
    panel.style.transition = "none"
    panel.style.transform = `translateY(${Math.max(0, clientY - startY)}px)`
  }

  const onEnd = (event: TouchEvent) => {
    pending = null
    if (startY === null) return
    const travelled = lastY - startY
    // A pull from the content ends where it lifted, not in a press of the row under it. A finger that barely
    // moved keeps its tap.
    if (fromContent && travelled > DECIDE && event.cancelable) event.preventDefault()
    fromContent = false
    // A finger that rested before lifting is no flick.
    const flick = speed > CLOSE_SPEED && event.timeStamp - lastTime < REST
    startY = null
    if (travelled <= 0) {
      clear()
      return
    }
    if (travelled > panel.getBoundingClientRect().height * CLOSE_SHARE || flick) {
      // The normal/exit-start CSS states retain this exact release position.
      // No inline transform or transition may mask the active CSS exit.
      panel.style.setProperty(DRAG_TRANSFORM, `translateY(${travelled}px)`)
      clearInline()
      // An owner can veto close. Register before close, which can detach us.
      settleTimer = view.setTimeout(() => {
        settleTimer = undefined
        if (panel.isConnected && !panel.closest(EXITING)) returnToRest()
      }, SETTLE)
      if (close(event) === false) returnToRest()
      return
    }
    returnToRest()
  }

  const onCancel = () => {
    startY = null
    pending = null
    fromContent = false
    clear()
  }

  // A retained panel can reopen before its exit completes. Its new entrance
  // must return to rest, not finish at the old gesture's release offset.
  const dialog = panel.closest("[data-plex-dialog]")
  const stateObserver = dialog ? new view.MutationObserver((records) => {
    if (panel.style.getPropertyValue(DRAG_TRANSFORM) &&
        dialog.getAttribute("data-state") === "open" &&
        records.some((record) => record.oldValue === "closed")) clear()
  }) : undefined
  stateObserver?.observe(dialog ?? panel, {
    attributes: true, attributeFilter: ["data-state"], attributeOldValue: true,
  })

  panel.addEventListener("touchstart", onStart, { passive: true })
  panel.addEventListener("touchmove", onMove, { passive: false })
  panel.addEventListener("touchend", onEnd)
  panel.addEventListener("touchcancel", onCancel)

  return () => {
    stateObserver?.disconnect()
    panel.removeEventListener("touchstart", onStart)
    panel.removeEventListener("touchmove", onMove)
    panel.removeEventListener("touchend", onEnd)
    panel.removeEventListener("touchcancel", onCancel)
    startY = null
    pending = null
    clear()
  }
}
