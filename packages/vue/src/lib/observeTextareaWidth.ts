/** Observe width only; autosizing height must not feed back into the observer. */
export const observeTextareaWidth = (element: HTMLElement, resize: () => void): (() => void) => {
  const view = element.ownerDocument.defaultView
  let active = true
  let frame: number | undefined
  let previousWidth: number | undefined

  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver((entries) => {
      const entry = entries.find(({ target }) => target === element)
      if (!active || !entry || entry.contentRect.width === previousWidth) return
      previousWidth = entry.contentRect.width
      if (frame !== undefined) return
      // Write height outside ResizeObserver delivery to avoid a resize loop.
      if (view) {
        frame = view.requestAnimationFrame(() => {
          frame = undefined
          if (active) resize()
        })
      } else {
        resize()
      }
    })
    observer.observe(element)
    return () => {
      active = false
      observer.disconnect()
      if (frame !== undefined) view?.cancelAnimationFrame(frame)
    }
  }

  previousWidth = element.getBoundingClientRect().width
  const onResize = () => {
    const width = element.getBoundingClientRect().width
    if (!active || width === previousWidth) return
    previousWidth = width
    resize()
  }
  view?.addEventListener("resize", onResize)
  return () => {
    active = false
    view?.removeEventListener("resize", onResize)
  }
}

/**
 * Whether the browser sizes an auto-resizing textarea itself (`field-sizing: content`, Safari 26+, Chrome 123+): then
 * the style sheet holds it between its rows and maximum rows, and no script measures it. Measuring set the height to
 * 0 and read scrollHeight, a forced layout on mount of every such textarea.
 */
export const sizesByContent = (): boolean =>
  typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("field-sizing", "content")
