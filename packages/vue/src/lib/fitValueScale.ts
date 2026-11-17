/**
 * Scales a one-line value down until it fits the width of its parent, as iOS's `minimumScaleFactor` does: writes
 * `property` on the value as a factor from `min` to 1 (removed at 1), for its CSS to multiply its font size by. It is
 * measured again when the parent or the value resizes, the value's text changes, or the fonts load. Under `min` the
 * value's own CSS cuts it (an ellipsis). Returns the cleanup.
 */
export function fitValueScale(value: HTMLElement, property: string, min = 0.5): () => void {
  let frame = 0
  const measure = () => {
    frame = 0
    const row = value.parentElement
    if (!row) return
    const current = value.style.getPropertyValue(property)
    // The width the text takes at full size, measured at full size: a width read at a scaled size comes in whole
    // pixels, and a factor from it can step back and forth with each resize it causes
    value.style.removeProperty(property)
    const natural = value.scrollWidth
    const available = row.clientWidth
    if (!natural || !available) {
      if (current) value.style.setProperty(property, current)
      return
    }
    // Two decimals, rounded down (1e-9 keeps a float like 98.99999 on its step)
    const next = Math.max(min, Math.min(1, Math.floor((available / natural) * 100 + 1e-9) / 100))
    if (next < 1) value.style.setProperty(property, String(next))
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(measure)
  }
  measure()
  const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule)
  if (value.parentElement) resize?.observe(value.parentElement)
  resize?.observe(value)
  const mutation = typeof MutationObserver === "undefined" ? null : new MutationObserver(schedule)
  mutation?.observe(value, { childList: true, characterData: true, subtree: true })
  let live = true
  document.fonts?.ready.then(() => {
    if (live) schedule()
  })
  return () => {
    live = false
    if (frame) cancelAnimationFrame(frame)
    resize?.disconnect()
    mutation?.disconnect()
  }
}
