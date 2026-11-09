import { isPhoneLayout } from "../../lib/phoneLayout"

// A bottom sheet follows the finger. A drag from its top 44px moves it 1:1, never up. Past 30% of its
// height, or at 0.5px/ms, it closes; otherwise it returns. Buttons in that strip keep their press.
const GRIP = 44
const CLOSE_SHARE = 0.3
const CLOSE_SPEED = 0.5
const REST = 100
const SETTLE = 400
const INTERACTIVE = "a, button, input, select, textarea, [role='button']"
const DRAG_TRANSFORM = "--dialog-panel-drag-transform"
const EXITING = "[data-exiting], [data-exiting-active]"

export const attachSheetDrag = (panel: HTMLElement, close: () => void) => {
  const view = panel.ownerDocument.defaultView
  if (!view) return () => {}
  let startY: number | null = null
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

  const onStart = (event: TouchEvent) => {
    const phone = isPhoneLayout(panel)
    if (event.touches.length !== 1 || !phone || panel.closest(EXITING)) return
    const { clientY } = event.touches[0]
    if (clientY - panel.getBoundingClientRect().top > GRIP) return
    if (event.target instanceof view.Element && event.target.closest(INTERACTIVE)) return
    stopSettling()
    startY = clientY
    lastY = clientY
    lastTime = event.timeStamp
    speed = 0
  }

  const onMove = (event: TouchEvent) => {
    const touch = event.touches[0]
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
    if (startY === null) return
    const travelled = lastY - startY
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
      close()
      return
    }
    returnToRest()
  }

  const onCancel = () => {
    startY = null
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
    clear()
  }
}
