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
 * where the menu keeps its gap below the control.
 */
export function observeMenuTriggerCover(trigger: HTMLElement, onChange: (cover: MenuTriggerCover | null) => void): () => void {
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
    if (isPhoneLayout(trigger)) {
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
