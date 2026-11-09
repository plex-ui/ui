/**
 * The toast region is a layer of its own above any overlay: a press, focus or Escape inside a toast belongs to the
 * toast, never to a Dialog, Popover or Menu under it. Every toast list carries `data-sonner-toaster`.
 */
export const inToastRegion = (target: EventTarget | null | undefined) =>
  typeof Element !== "undefined" && target instanceof Element && target.closest("[data-sonner-toaster]") !== null
