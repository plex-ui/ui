/**
 * The room on the side the popover did not take, from the room the popper gives its own side (which already holds
 * the offset and the collision padding) and where the trigger stands in the viewport. With no trigger found it is
 * zero, so the popover is capped to its own side as before.
 */
function otherRoom(content: HTMLElement, room: number): number {
  const trigger = content.id ? document.querySelector<HTMLElement>(`[aria-controls="${content.id}"]`) : null
  if (!trigger) return 0
  const rect = trigger.getBoundingClientRect()
  // The popper (Floating UI, fixed) measures the visual viewport, which a keyboard or a zoom makes shorter than the
  // layout one, and in WebKit it moves the trigger's rect by the visual viewport's offset as it does
  const view = window.visualViewport
  const top = view ? view.offsetTop : 0
  const height = view ? view.height : document.documentElement.clientHeight
  const webkit = typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("-webkit-backdrop-filter", "none")
  const shift = view && webkit ? view.offsetTop : 0
  const above = rect.top + shift - top
  const below = top + height - (rect.bottom + shift)
  return content.getAttribute("data-side") === "top" ? room - above + below : room - below + above
}

/**
 * On a phone the calendar keeps its whole height, so its popover flips to the side of the trigger with room
 * (Calendar.module.css). When neither side has room, it is capped to the room of the side it took and scrolls, so
 * every date and the time row stay reachable (Codex 15.11). The popover's scroll height is the calendar's own height
 * whether or not it is capped, so the check never feeds on its own result. The popover is looked up in a frame (a
 * Vue parent sets its role after its children mount) and watched for the room and side the popper writes on it as
 * the page scrolls. Returns the cleanup.
 */
export function watchCalendarFit(wrapper: HTMLElement): () => void {
  if (typeof window === "undefined" || typeof requestAnimationFrame === "undefined") return () => {}
  let content: HTMLElement | null = null
  let mutations: MutationObserver | undefined
  let frame = 0
  let tries = 0
  const check = () => {
    frame = 0
    if (!content) {
      content = wrapper.closest<HTMLElement>('[role="dialog"]')
      if (content && typeof MutationObserver !== "undefined") {
        mutations = new MutationObserver(schedule)
        mutations.observe(content, { attributes: true, attributeFilter: ["style", "data-side"] })
      }
    }
    const room = content
      ? parseFloat(getComputedStyle(content).getPropertyValue("--radix-popover-content-available-height"))
      : NaN
    if (!content || !Number.isFinite(room) || room <= 0) {
      if (++tries < 20) frame = requestAnimationFrame(check)
      return
    }
    // The cap goes on only when the other side has no room for the whole calendar either. On the side it took
    // while it was shorter, it would otherwise make the grown calendar fit there and stop the popper's flip
    // (console 15.11: a lower row of a sheet opened below and scrolled with 440px free above it).
    const height = content.scrollHeight
    const squeezed = height > room + 0.5 && height > otherRoom(content, room) + 0.5
    if (content.hasAttribute("data-calendar-squeezed") !== squeezed) content.toggleAttribute("data-calendar-squeezed", squeezed)
  }
  function schedule() {
    tries = 0
    if (!frame) frame = requestAnimationFrame(check)
  }
  schedule()
  const resizes = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : undefined
  resizes?.observe(wrapper)
  window.addEventListener("resize", schedule)
  return () => {
    if (frame) cancelAnimationFrame(frame)
    resizes?.disconnect()
    mutations?.disconnect()
    window.removeEventListener("resize", schedule)
    content?.removeAttribute("data-calendar-squeezed")
  }
}

