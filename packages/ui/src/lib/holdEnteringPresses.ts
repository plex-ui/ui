/**
 * A sheet, dialog or menu takes no touch while it comes in, as on iOS: a second tap that starts during the enter
 * lands on what rises under the finger, so a double tap on a row opened a sheet and a second one over it, and a
 * double tap on a menu button chose the first item (console 16.11). A touch that starts while a marked root still
 * carries `data-entering` is held whole: its pointerdown, its pointerup and the click that follows. A press already
 * under way when the root mounts (the one that opened it), a mouse or a pen (a quick second click toggles a menu
 * on a desktop) and a key's click are left alone.
 */
export const HOLD_PRESSES_CLASS = "plexui-hold-presses"

const ENTERING = `.${HOLD_PRESSES_CLASS}[data-entering]`
// The click of a held touch may come a moment after its pointerup
const CLICK_WINDOW = 500

const installed = new WeakMap<Window, () => void>()

/** Installs the hold on a window once; returns the function that removes it. */
export function holdEnteringPresses(view: Window | undefined = typeof window === "undefined" ? undefined : window) {
  if (!view) return () => {}
  const existing = installed.get(view)
  if (existing) return existing
  const held = new Set<number>()
  let eatClick = false
  let clickTimer: ReturnType<typeof setTimeout> | undefined
  const stop = (event: Event) => {
    event.stopImmediatePropagation()
    if (event.cancelable) event.preventDefault()
  }
  const onDown = (event: PointerEvent) => {
    eatClick = false
    if (event.pointerType !== "touch" || !view.document.querySelector(ENTERING)) return
    held.add(event.pointerId)
    stop(event)
  }
  const onRelease = (event: PointerEvent) => {
    if (!held.delete(event.pointerId)) return
    stop(event)
    if (event.type !== "pointerup") return
    eatClick = true
    clearTimeout(clickTimer)
    clickTimer = setTimeout(() => { eatClick = false }, CLICK_WINDOW)
  }
  // Only the touch's own click: a key or an assistive click (detail 0) still acts
  const onClick = (event: MouseEvent) => {
    if (!eatClick || !event.detail) return
    eatClick = false
    stop(event)
  }
  view.addEventListener("pointerdown", onDown, true)
  view.addEventListener("pointerup", onRelease, true)
  view.addEventListener("pointercancel", onRelease, true)
  view.addEventListener("click", onClick, true)
  const dispose = () => {
    view.removeEventListener("pointerdown", onDown, true)
    view.removeEventListener("pointerup", onRelease, true)
    view.removeEventListener("pointercancel", onRelease, true)
    view.removeEventListener("click", onClick, true)
    clearTimeout(clickTimer)
    installed.delete(view)
  }
  installed.set(view, dispose)
  return dispose
}
