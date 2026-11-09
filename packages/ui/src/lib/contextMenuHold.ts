// One touch and hold for an element that has a context menu and also drags in a Sortable list, as a lifted iOS
// preview (plan 176, item 5): the hold opens the menu, and the finger moving on from there closes the menu and drags
// the element. ContextMenu and Sortable meet only through the element: the trigger's attribute, and the event the
// trigger sends on it when its hold opens the menu.

/** A touch held this long opens the menu, as a UIKit long press (0.5 s). */
export const CONTEXT_MENU_LONG_PRESS = 500
/** A touch that moves farther than this before then scrolls or drags instead. */
export const CONTEXT_MENU_LONG_PRESS_SLOP = 10

/** On the element of a `ContextMenu.Trigger` that is not disabled. */
export const CONTEXT_MENU_TRIGGER = "data-context-menu-trigger"
/** Sent on that element, and bubbling, when a touch and hold opened its menu and the finger is still down. */
export const CONTEXT_MENU_HOLD = "plexui:context-menu-hold"

export type ContextMenuHold = {
  /** The touch that holds the element */
  pointerId: number
  /** Closes the menu at once and puts the element back in its place, for a drag that takes the touch over */
  close: () => void
}

/** The grip of a Sortable item: it drags at once, so a hold on it opens no context menu. */
export const SORTABLE_HANDLE = "[data-sortable-handle]"
/** The item a Sortable drag is moving: a hold that a list around the element already turned into a drag. */
export const SORTABLE_SOURCE = "[data-sortable-source]"

export const sendContextMenuHold = (element: HTMLElement, hold: ContextMenuHold) =>
  element.dispatchEvent(new CustomEvent<ContextMenuHold>(CONTEXT_MENU_HOLD, { bubbles: true, detail: hold }))

/** The element of a context menu that a touch on `target` holds together with the drag of `item`: the item, or in it. */
export const heldContextMenu = (target: EventTarget | null, item: HTMLElement) => {
  const trigger = target instanceof Element ? target.closest<HTMLElement>(`[${CONTEXT_MENU_TRIGGER}]`) : null
  return trigger && item.contains(trigger) ? trigger : undefined
}
