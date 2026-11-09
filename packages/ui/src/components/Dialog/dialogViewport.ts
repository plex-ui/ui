// The height a dialog lays out in, where the window's is not it: the box of a PhoneLayout, or the part of the window
// a phone keyboard leaves visible (the visual viewport; the layout viewport keeps its height under the keyboard). The
// layer then covers that part, so a sheet sits on the keyboard and a panel stays in view. Inside a PhoneLayout the
// layer covers the part of the box the keyboard leaves visible. Returns the cleanup.
export const watchDialogViewport = (content: HTMLElement, container: HTMLElement | null): (() => void) => {
  const style = content.style
  const view = content.ownerDocument.defaultView
  const viewport = view?.visualViewport ?? null
  const clear = () => {
    content.removeAttribute("data-visual-viewport")
    style.removeProperty("--dialog-viewport-top")
    style.removeProperty("--dialog-viewport-height")
  }
  // The part of the layout viewport a keyboard leaves visible, or null with no keyboard: a keyboard shortens the
  // visual viewport at scale 1; a pinch zoom scales it instead
  const visible = () => {
    if (!viewport) return null
    const layoutHeight = content.ownerDocument.documentElement.clientHeight
    if (Math.abs(viewport.scale - 1) > 0.01 || layoutHeight - viewport.height <= 1) return null
    return { top: viewport.offsetTop, bottom: viewport.offsetTop + viewport.height }
  }
  const update = container
    ? () => {
        // A box with no height yet (not laid out) leaves the window's
        const height = container.clientHeight
        if (height <= 0) return clear()
        const area = visible()
        // The layer lays out in the box's padding box, in the box's own pixels: a scaled box (a phone drawn smaller)
        // measures on screen at its scale
        const box = container.getBoundingClientRect()
        const scale = container.offsetHeight > 0 && box.height > 0 ? box.height / container.offsetHeight : 1
        const boxTop = box.top + container.clientTop * scale
        const top = area ? Math.max(0, (area.top - boxTop) / scale) : 0
        const bottom = area ? Math.min(height, (area.bottom - boxTop) / scale) : height
        if (!area || (top <= 0 && bottom >= height) || bottom <= top) {
          content.removeAttribute("data-visual-viewport")
          style.removeProperty("--dialog-viewport-top")
          style.setProperty("--dialog-viewport-height", `${height}px`)
          return
        }
        content.setAttribute("data-visual-viewport", "")
        style.setProperty("--dialog-viewport-top", `${top}px`)
        style.setProperty("--dialog-viewport-height", `${bottom - top}px`)
      }
    : () => {
        const area = visible()
        if (!area) return clear()
        content.setAttribute("data-visual-viewport", "")
        style.setProperty("--dialog-viewport-top", `${area.top}px`)
        style.setProperty("--dialog-viewport-height", `${area.bottom - area.top}px`)
      }
  update()
  viewport?.addEventListener("resize", update)
  viewport?.addEventListener("scroll", update)
  // The box moves with the page, and changes its own size
  const observer = container && typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : undefined
  if (container) {
    observer?.observe(container)
    view?.addEventListener("scroll", update, { capture: true, passive: true })
  }
  return () => {
    viewport?.removeEventListener("resize", update)
    viewport?.removeEventListener("scroll", update)
    observer?.disconnect()
    if (container) view?.removeEventListener("scroll", update, { capture: true })
    clear()
  }
}
