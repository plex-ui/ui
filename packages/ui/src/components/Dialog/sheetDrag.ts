// A bottom sheet follows the finger. A drag from its top 44px moves it 1:1, never up. Past 30% of its
// height, or at 0.5px/ms, it closes; otherwise it returns. Buttons in that strip keep their press.
const GRIP = 44
const CLOSE_SHARE = 0.3
const CLOSE_SPEED = 0.5
const REST = 100
const SETTLE = 400
const INTERACTIVE = "a, button, input, select, textarea, [role='button']"

export const attachSheetDrag = (panel: HTMLElement, close: () => void) => {
  let startY: number | null = null
  let lastY = 0
  let lastTime = 0
  let speed = 0

  const clear = () => {
    panel.style.transition = ""
    panel.style.transform = ""
  }

  const onStart = (event: TouchEvent) => {
    if (event.touches.length !== 1 || !window.matchMedia("(max-width: 767px)").matches) return
    const { clientY } = event.touches[0]
    if (clientY - panel.getBoundingClientRect().top > GRIP) return
    if ((event.target as Element | null)?.closest?.(INTERACTIVE)) return
    startY = clientY
    lastY = clientY
    lastTime = event.timeStamp
    speed = 0
  }

  const onMove = (event: TouchEvent) => {
    if (startY === null) return
    event.preventDefault()
    const { clientY } = event.touches[0]
    speed = (clientY - lastY) / Math.max(1, event.timeStamp - lastTime)
    lastY = clientY
    lastTime = event.timeStamp
    panel.style.transition = "none"
    panel.style.transform = `translateY(${Math.max(0, clientY - startY)}px)`
  }

  const onEnd = (event: TouchEvent) => {
    if (startY === null) return
    const travelled = lastY - startY
    // A finger that rested before lifting is no flick
    const flick = speed > CLOSE_SPEED && event.timeStamp - lastTime < REST
    startY = null
    if (travelled <= 0) {
      clear()
      return
    }
    if (travelled > panel.getBoundingClientRect().height * CLOSE_SHARE || flick) {
      close()
      // Something may keep it open, unsaved changes for one
      window.setTimeout(() => {
        if (panel.isConnected) clear()
      }, SETTLE)
      return
    }
    panel.style.transition = "transform 250ms var(--cubic-enter)"
    panel.style.transform = ""
    panel.addEventListener("transitionend", clear, { once: true })
  }

  panel.addEventListener("touchstart", onStart, { passive: true })
  panel.addEventListener("touchmove", onMove, { passive: false })
  panel.addEventListener("touchend", onEnd)
  panel.addEventListener("touchcancel", onEnd)

  return () => {
    panel.removeEventListener("touchstart", onStart)
    panel.removeEventListener("touchmove", onMove)
    panel.removeEventListener("touchend", onEnd)
    panel.removeEventListener("touchcancel", onEnd)
  }
}
