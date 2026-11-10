import { isPhoneLayout, PHONE_LAYOUT_SCOPE } from "./phoneLayout"

/** Where a phone menu stands over its trigger: the side offset that covers it, and the side it opens to. */
export type MenuTriggerCover = { sideOffset: number; side: "top" | "bottom" }

/**
 * On a phone a menu grows out of the control that opens it and covers it, as iOS 26 menus do: the panel's top is the
 * control's top, or its bottom when the menu opens upward, and its aligned edge is the control's edge (iOS-menu
 * IMG_5657 and IMG_5654, the More button of a top bar; IMG_5658, a button of a group; IMG_5649, the value of a form
 * row; IMG_5675 opens upward over its row). It opens toward the larger part of the screen: downward from a control in
 * the upper half, upward from one in the lower half even when it would fit below (IMG_5688, the Icon and List Size
 * row of Files' View Options; IMG_5687, IMG_5689, and IMG_5693 from a bottom bar). Reports the side offset that puts
 * the panel there, minus the control's height, and that side, while the screen is a phone, and `null` on a larger one,
 * where the menu keeps its gap below the control. `windowOnly` takes only a phone-wide window for a phone, for a list
 * that is laid out as on a phone only there (Select: its list keeps no phone scope in a PhoneLayout).
 */
export function observeMenuTriggerCover(
  trigger: HTMLElement,
  onChange: (cover: MenuTriggerCover | null) => void,
  { windowOnly = false }: { windowOnly?: boolean } = {},
): () => void {
  const view = trigger.ownerDocument.defaultView
  if (!view || typeof view.matchMedia !== "function") {
    onChange(null)
    return () => undefined
  }
  const media = view.matchMedia("(max-width: 767px)")
  let last: string | undefined
  const measure = () => {
    let cover: MenuTriggerCover | null = null
    // A narrow window, or a PhoneLayout or phone Dialog at any width
    if (windowOnly ? media.matches : isPhoneLayout(trigger)) {
      const rect = trigger.getBoundingClientRect()
      // The visible part of the screen: the layout viewport less a keyboard or a pinch zoom, or the box of a
      // PhoneLayout, which is the phone's screen (a phone Dialog's own scope has no box: the window is its screen)
      const viewport = view.visualViewport
      const screen = trigger.closest(PHONE_LAYOUT_SCOPE)?.getBoundingClientRect()
      const middle = screen && screen.height > 0
        ? Math.max(screen.top, viewport?.offsetTop ?? 0) / 2 + Math.min(screen.bottom, (viewport?.offsetTop ?? 0) + (viewport?.height ?? view.innerHeight)) / 2
        : (viewport?.offsetTop ?? 0) + (viewport?.height ?? view.innerHeight) / 2
      // The layout height: a pressed control may be scaled, and the panel covers its resting box
      cover = { sideOffset: -trigger.offsetHeight, side: rect.top + rect.height / 2 > middle ? "top" : "bottom" }
    }
    const key = cover ? `${cover.sideOffset} ${cover.side}` : ""
    if (key === last) return
    last = key
    onChange(cover)
  }
  measure()
  const resize = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure)
  resize?.observe(trigger)
  media.addEventListener?.("change", measure)
  return () => {
    resize?.disconnect()
    media.removeEventListener?.("change", measure)
  }
}

/**
 * A phone menu that covers its trigger whole hides it while it is open, as iOS 27.2 turns a bar button into its menu
 * (ref-app menus-bar, block 8: the More button is gone under the panel). Kept, the round 44pt button showed past the
 * panel's 34pt corner and through its glass. A trigger the panel leaves a part of uncovered stays: one wider than the
 * panel (a form row), one beside it (an align offset), one at the screen's edge past a panel kept off that edge.
 * Marks the trigger `data-menu-covered` (touch.css) while it lies within the panel's resting box, and clears the mark
 * on cleanup. That box is the primitive's positioned wrapper around the panel: the panel itself grows in from a
 * smaller scale as it opens. The boxes are read again whenever the wrapper moves or either element resizes: the
 * wrapper first stands off screen until it is placed, and a panel can mount with no size yet.
 */
export function markCoveredMenuTrigger(trigger: HTMLElement, content: HTMLElement): () => void {
  const view = trigger.ownerDocument.defaultView
  const place = content.parentElement ?? content
  const mark = () => {
    const panel = place.getBoundingClientRect()
    const rect = trigger.getBoundingClientRect()
    // Half a pixel either way for subpixel layout
    const within = rect.left >= panel.left - 0.5 && rect.right <= panel.right + 0.5 && rect.top >= panel.top - 0.5 && rect.bottom <= panel.bottom + 0.5
    if (content.offsetWidth > 0 && rect.width > 0 && within) trigger.setAttribute("data-menu-covered", "")
    else trigger.removeAttribute("data-menu-covered")
  }
  const frame = view ? view.requestAnimationFrame(mark) : 0
  const resize = view?.ResizeObserver ? new view.ResizeObserver(mark) : null
  resize?.observe(content)
  resize?.observe(trigger)
  const move = view?.MutationObserver ? new view.MutationObserver(mark) : null
  move?.observe(place, { attributes: true, attributeFilter: ["style"] })
  return () => {
    view?.cancelAnimationFrame(frame)
    resize?.disconnect()
    move?.disconnect()
    trigger.removeAttribute("data-menu-covered")
  }
}

/**
 * A mouse opens a menu when its button goes down, so on a phone-wide window the menu that covers the trigger is under
 * the pointer when the button comes up, and that release would choose the item there. Cancels the release of the press
 * that opened the menu while it is still over the trigger; a press dragged off the trigger onto an item still chooses
 * it, as a touch dragged through an iOS menu does.
 */
export function ignoreReleaseOverTrigger(trigger: HTMLElement, pointerId: number): void {
  const view = trigger.ownerDocument.defaultView
  // Only a phone menu covers its trigger; elsewhere the gap keeps the items clear of the pointer
  if (!view || !isPhoneLayout(trigger)) return
  const release = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return
    view.removeEventListener("pointerup", release, true)
    view.removeEventListener("pointercancel", release, true)
    if (event.type !== "pointerup") return
    const rect = trigger.getBoundingClientRect()
    if (event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) {
      event.preventDefault()
    }
  }
  view.addEventListener("pointerup", release, true)
  view.addEventListener("pointercancel", release, true)
}
