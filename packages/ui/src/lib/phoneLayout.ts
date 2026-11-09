/**
 * The phone layout outside a narrow window (plan 176). The style sheets apply their phone rules (767px and below)
 * inside an element marked `data-plex-layout="phone"` too, at any window width: PhoneLayout marks one, and so does a
 * Dialog with `layout="phone"`. Scripts that change what they do on a phone ask the same question here.
 */
export const PHONE_LAYOUT_SCOPE = '[data-plex-layout="phone"]'
export const PHONE_MEDIA = "(max-width: 767px)"

/** The window is 767px wide or narrower. */
export const isPhoneWindow = (view: Window | null | undefined): boolean => {
  if (!view) return false
  return typeof view.matchMedia === "function" ? view.matchMedia(PHONE_MEDIA).matches : view.innerWidth <= 767
}

/** The element is laid out as on a phone: inside a phone layout, or in a window 767px wide or narrower. */
export const isPhoneLayout = (element: Element): boolean =>
  element.closest(PHONE_LAYOUT_SCOPE) !== null || isPhoneWindow(element.ownerDocument.defaultView)
