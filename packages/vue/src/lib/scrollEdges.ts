/** Where content lies under the bars of a scroll area. */
export type ScrollEdges = {
  /** Content has scrolled under the top bar. */
  scrolled: boolean
  /** Content continues under the bottom bar. */
  contentBelow: boolean
}

export const NO_SCROLL_EDGES: ScrollEdges = { scrolled: false, contentBelow: false }

// A trackpad's small settle at either end must not flash a bar's line.
export const SCROLL_EDGE_SLOP = 4

export const scrollEdges = (element: HTMLElement): ScrollEdges => ({
  scrolled: element.scrollTop > SCROLL_EDGE_SLOP,
  contentBelow: element.scrollHeight - element.clientHeight - element.scrollTop > SCROLL_EDGE_SLOP,
})

export const sameScrollEdges = (a: ScrollEdges, b: ScrollEdges): boolean =>
  a.scrolled === b.scrolled && a.contentBelow === b.contentBelow

/**
 * Reports the scroll edges of `element` now and whenever its scroll offset, its size or the size of its
 * content changes, so a bar can show its line only while content is under it. Returns the cleanup.
 */
export const observeScrollEdges = (element: HTMLElement, onChange: (edges: ScrollEdges) => void): (() => void) => {
  const update = () => onChange(scrollEdges(element))
  const resize = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : undefined
  // The content's height decides the scroll range: observe each child, and the new ones as they come.
  const observeContent = () => {
    resize?.disconnect()
    resize?.observe(element, { box: "border-box" })
    for (const child of Array.from(element.children)) resize?.observe(child, { box: "border-box" })
    update()
  }
  observeContent()
  const children = typeof MutationObserver !== "undefined" ? new MutationObserver(observeContent) : undefined
  children?.observe(element, { childList: true })
  element.addEventListener("scroll", update, { passive: true })
  return () => {
    resize?.disconnect()
    children?.disconnect()
    element.removeEventListener("scroll", update)
  }
}
