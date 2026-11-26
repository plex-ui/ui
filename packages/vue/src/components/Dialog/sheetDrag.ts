import { isPhoneLayout } from "../../lib/phoneLayout.js"
import { SHEET_EXIT_MS, SHEET_RELEASE_SPRING, springEasing } from "../../lib/presentMotion.js"

// A bottom sheet follows the finger. A drag from its top 44px moves it 1:1, never up. Past 30% of its
// height, or at 0.5px/ms, it closes; otherwise it returns. Either way it goes on at the finger's speed, on a spring
// that starts at it, as a sheet let go of does on iOS. Buttons in that strip keep their press.
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
// A sheet at its full height says so: a sheet under it then steps back, as one presented from a sheet does on iOS.
// A shorter sheet leaves the one under it in place, as a medium detent does.
const FULL = "data-sheet-full"
// A sheet let go of leaves down at the finger's speed, within the time the dialog gives its exit
const EXIT_DURATION = "--dialog-exit-duration"
const EXIT_EASING = "--dialog-exit-easing"

const reducedMotion = (view: Window) => Boolean(view.matchMedia?.("(prefers-reduced-motion: reduce)").matches)

const watchFullHeight = (panel: HTMLElement, view: Window & typeof globalThis) => {
  if (!view.ResizeObserver) return () => {}
  const update = () => {
    const max = Number.parseFloat(view.getComputedStyle(panel).maxHeight)
    const full = Number.isFinite(max) && panel.offsetHeight >= max - 1
    if (full !== panel.hasAttribute(FULL)) panel.toggleAttribute(FULL, full)
  }
  const observer = new view.ResizeObserver(update)
  // Its height with the border, as `offsetHeight` reads it
  observer.observe(panel, { box: "border-box" })
  update()
  return () => {
    observer.disconnect()
    panel.removeAttribute(FULL)
  }
}

/** `close` returns false when the owner keeps the dialog open: the sheet then returns at once. */
export const attachSheetDrag = (panel: HTMLElement, close: (event: TouchEvent) => boolean | void) => {
  const view = panel.ownerDocument.defaultView
  if (!view) return () => {}
  const unwatchFull = watchFullHeight(panel, view)
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
    panel.style.removeProperty(EXIT_DURATION)
    panel.style.removeProperty(EXIT_EASING)
  }
  const onSettled = (event: TransitionEvent) => {
    if (event.target === panel && event.propertyName === "transform") clear()
  }
  // `from` is where the sheet is let go of, `velocity` the finger's speed down in px/ms: the sheet starts back at it.
  const returnToRest = (from = 0, velocity = 0) => {
    stopSettling()
    if (reducedMotion(view)) {
      clear()
      return
    }
    // Back up is the way to rest: a finger still going down starts it the other way.
    const spring = springEasing(SHEET_RELEASE_SPRING, from > 0 ? (-velocity * 1000) / from : 0, true)
    panel.style.transition = `transform ${spring.ms}ms ${spring.easing}`
    panel.style.transform = ""
    panel.style.removeProperty(DRAG_TRANSFORM)
    panel.style.removeProperty(EXIT_DURATION)
    panel.style.removeProperty(EXIT_EASING)
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
    // A finger that rested before lifting is no flick, and gives the sheet no speed.
    const moving = event.timeStamp - lastTime < REST
    const velocity = moving ? speed : 0
    const flick = speed > CLOSE_SPEED && moving
    startY = null
    if (travelled <= 0) {
      clear()
      return
    }
    const height = panel.getBoundingClientRect().height
    if (travelled > height * CLOSE_SHARE || flick) {
      // The normal/exit-start CSS states retain this exact release position.
      // No inline transform or transition may mask the active CSS exit.
      panel.style.setProperty(DRAG_TRANSFORM, `translateY(${travelled}px)`)
      clearInline()
      // The rest of the way down goes on at the finger's speed, within the time the dialog gives its exit
      if (!reducedMotion(view)) {
        const left = Math.max(1, height - travelled)
        const spring = springEasing(SHEET_RELEASE_SPRING, (Math.max(0, velocity) * 1000) / left, true)
        panel.style.setProperty(EXIT_DURATION, `${Math.min(spring.ms, SHEET_EXIT_MS)}ms`)
        panel.style.setProperty(EXIT_EASING, spring.easing)
      }
      // An owner can veto close. Register before close, which can detach us.
      settleTimer = view.setTimeout(() => {
        settleTimer = undefined
        if (!panel.isConnected || panel.closest(EXITING)) return
        returnToRest(travelled, velocity)
      }, SETTLE)
      if (close(event) === false) {
        returnToRest(travelled, velocity)
      }
      return
    }
    returnToRest(travelled, velocity)
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
    unwatchFull()
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
