import { focusPhoneSubmenuEntry } from "./menuSubmenuPlacement"

// A root and controlled child can mount together. Keep the root's initial
// autofocus from visiting outside the portalled child before it is ready.
const pending = new WeakMap<HTMLElement, Element | null>()
const EXITING = '[aria-hidden="true"], [inert], [data-exiting], [data-exiting-active]'

function isOpen(element: HTMLElement): boolean {
  return element.isConnected && element.getAttribute("data-state") !== "closed" && !element.closest(EXITING)
}

function expandedChild(content: HTMLElement): HTMLElement | undefined {
  return Array.from(content.querySelectorAll<HTMLElement>('[role="menuitem"][aria-haspopup="menu"][aria-expanded="true"][aria-controls]'))
    .find((trigger) => trigger.closest('[role="menu"]') === content && !trigger.hasAttribute("data-disabled") && trigger.getAttribute("aria-disabled") !== "true")
}

function childContent(trigger: HTMLElement): HTMLElement | null {
  const content = trigger.ownerDocument.getElementById(trigger.getAttribute("aria-controls") ?? "")
  return content?.hasAttribute("data-submenu") && content.getAttribute("aria-labelledby") === trigger.id ? content : null
}

function claim(trigger: HTMLElement, focused: Element | null): void {
  pending.set(trigger, focused)
  const content = childContent(trigger)
  if (content) completeInitialPhoneSubmenuFocus(trigger, content)
}

/** Called by the real child-ready lifecycle, never by a delay or outside filter. */
export function completeInitialPhoneSubmenuFocus(trigger: HTMLElement, content: HTMLElement): boolean {
  if (!pending.has(trigger)) return false
  if (!isOpen(trigger) || !isOpen(content) || trigger.getAttribute("aria-expanded") !== "true" || childContent(trigger) !== content) {
    pending.delete(trigger)
    return false
  }
  const unavailable = content.hasAttribute("data-submenu-unavailable")
  if (!unavailable && !content.hasAttribute("data-submenu-positioned")) return false
  const focused = trigger.ownerDocument.activeElement
  const initial = pending.get(trigger)
  pending.delete(trigger)
  // An explicit focus move while geometry was pending owns focus now.
  if (focused !== initial && focused !== trigger && focused !== content) return false
  if (unavailable) {
    // No placement exists for this measured layout. Return once to its real
    // visible trigger; do not close the child or steal focus on later recovery.
    const parent = trigger.closest('[role="menu"]')
    if (parent && (!parent.hasAttribute("data-submenu") || parent.hasAttribute("data-submenu-positioned"))) {
      trigger.focus({ preventScroll: true })
    }
    return true
  }
  const nested = expandedChild(content)
  if (nested) claim(nested, focused)
  else focusPhoneSubmenuEntry(content)
  return true
}

/** Compose at the root primitive's mount-autofocus boundary. Desktop is untouched. */
export function delegateInitialPhoneSubmenuFocus(event: Event, content: HTMLElement | null): void {
  if (event.defaultPrevented || !content || !isOpen(content)) return
  const view = content.ownerDocument.defaultView
  if (!view || !(view.matchMedia?.("(max-width: 767px)").matches ?? view.innerWidth <= 767)) return
  const trigger = expandedChild(content)
  if (!trigger) return
  event.preventDefault()
  claim(trigger, content.ownerDocument.activeElement)
}

/** A keyboard leaf must also wait for its own geometry before native autofocus. */
export function deferInitialPhoneSubmenuFocus(event: Event, content: HTMLElement | null, usingKeyboard: boolean): void {
  delegateInitialPhoneSubmenuFocus(event, content)
  if (event.defaultPrevented || !content || !isOpen(content) || !content.hasAttribute("data-submenu") || content.hasAttribute("data-submenu-positioned")) return
  const view = content.ownerDocument.defaultView
  if (!view || !(view.matchMedia?.("(max-width: 767px)").matches ?? view.innerWidth <= 767)) return
  const trigger = content.ownerDocument.getElementById(content.getAttribute("aria-labelledby") ?? "")
  if (!trigger || childContent(trigger) !== content || (!usingKeyboard && !pending.has(trigger))) return
  event.preventDefault()
  // Preserve an existing owner's focus snapshot, including a later user move.
  if (pending.has(trigger)) completeInitialPhoneSubmenuFocus(trigger, content)
  else claim(trigger, content.ownerDocument.activeElement)
}

/** Radix SubContent replaces its open-autofocus prop. Capture only the Phone
 * mount event whose focus belongs to a descendant or still-pending geometry. */
export function captureInitialPhoneSubmenuFocus(content: HTMLElement, isUsingKeyboard: () => boolean = () => false): () => void {
  const handle = (event: Event) => {
    if (event.defaultPrevented) return
    deferInitialPhoneSubmenuFocus(event, content, isUsingKeyboard())
    if (event.defaultPrevented) event.stopImmediatePropagation()
  }
  content.addEventListener("focusScope.autoFocusOnMount", handle, true)
  return () => content.removeEventListener("focusScope.autoFocusOnMount", handle, true)
}
