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
    const squeezed = content.scrollHeight > room + 0.5
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

