/**
 * The phone drawer of Sidebar, shared by React and Vue (one copy per package, kept identical by lib-sync).
 *
 * - It follows the finger: a swipe in from the edge it lives behind opens it, a swipe back toward that edge closes
 *   it, and either finishes on release by how far and how fast the finger went. The drawer says its edge in
 *   `--sidebar-drawer-edge` (`left` or `right`). While a finger drags it, the root carries `data-mobile-dragging`
 *   and `--sidebar-drawer-progress` (0 closed to 1 open), and the styles place the drawer by them.
 * - While it is open, Tab goes round its controls (the page behind is inert), and Escape closes it once every other
 *   listener has had the key, so a menu or dialog over the drawer takes its own Escape first.
 */

/** How far in from its edge a swipe that opens the drawer may start */
export const DRAWER_EDGE_ZONE = 24
/** How far a finger moves before the swipe is taken as horizontal or left to the page */
export const DRAWER_SWIPE_SLOP = 10
/** A release faster than this, in px/ms, finishes the swipe in its direction whatever the distance */
export const DRAWER_SWIPE_VELOCITY = 0.3
/** A finger held still this long, in ms, before it lifts lets go by distance alone */
export const DRAWER_SWIPE_HOLD = 100

export type DrawerSwipeOptions = {
  /** The element that holds the drawer and the page, where the drag state is written */
  root: HTMLElement
  /** The drawer itself */
  drawer: HTMLElement
  isOpen: () => boolean
  setOpen: (open: boolean) => void
  /** False turns the gesture off (a wide layout) */
  enabled?: () => boolean
}

type Drag = {
  x: number
  y: number
  lastX: number
  lastTime: number
  velocity: number
  open: boolean
  edge: "left" | "right"
  travel: number
  state: "pending" | "dragging" | "ignored"
  progress: number
}

const edgeOf = (drawer: HTMLElement): "left" | "right" =>
  getComputedStyle(drawer).getPropertyValue("--sidebar-drawer-edge").trim() === "left" ? "left" : "right"

/** The distance the drawer travels: its own width when it slides in beside the page, else its container's width */
const travelOf = (drawer: HTMLElement, root: HTMLElement, edge: "left" | "right") => {
  if (edge === "left") return drawer.getBoundingClientRect().width || root.getBoundingClientRect().width
  const container = drawer.offsetParent instanceof HTMLElement ? drawer.offsetParent : null
  return container?.clientWidth || window.innerWidth
}

/**
 * A finger on a slider, on an element that takes horizontal touches itself (`touch-action` without `pan-x`, such
 * as the Slider) or in a row that scrolls sideways moves that, not the drawer
 */
const ownsHorizontalSwipe = (target: EventTarget | null, root: HTMLElement) => {
  for (let node = target instanceof Element ? target : null; node && node !== root; node = node.parentElement) {
    if ((node instanceof HTMLInputElement && node.type === "range") || node.getAttribute("role") === "slider") return true
    const style = getComputedStyle(node)
    if (/^(none|pan-y|pinch-zoom)/.test(style.touchAction) && !style.touchAction.includes("pan-x")) return true
    if (node.scrollWidth > node.clientWidth && /auto|scroll/.test(style.overflowX)) return true
  }
  return false
}

/**
 * A popover or menu open over the drawer (the Radix and Reka popper wrappers) keeps the touch: swiping the drawer
 * away from under it would leave it open on an inert trigger. A modal dialog's overlay already covers the drawer.
 */
const layerOpen = (root: HTMLElement) =>
  root.ownerDocument.querySelector("[data-radix-popper-content-wrapper], [data-reka-popper-content-wrapper]") !== null

/** Starts the gesture on `root`; returns the cleanup */
export function attachDrawerSwipe({ root, drawer, isOpen, setOpen, enabled = () => true }: DrawerSwipeOptions) {
  let drag: Drag | null = null

  const setProgress = (progress: number) => {
    root.style.setProperty("--sidebar-drawer-progress", String(progress))
  }

  const end = (commit: boolean, time = 0) => {
    const current = drag
    drag = null
    if (!current || current.state !== "dragging") return
    let next = current.open
    if (commit) {
      // Velocity in the opening direction is positive; a finger that stopped before lifting has none
      const velocity = time - current.lastTime > DRAWER_SWIPE_HOLD ? 0 : current.velocity
      const opening = current.edge === "left" ? velocity : -velocity
      next = opening > DRAWER_SWIPE_VELOCITY ? true : opening < -DRAWER_SWIPE_VELOCITY ? false : current.progress > 0.5
    }
    if (next !== current.open) setOpen(next)
    // The drawer leaves the finger once the new state is on the page, so it animates from where it was let go
    requestAnimationFrame(() => {
      root.removeAttribute("data-mobile-dragging")
      root.style.removeProperty("--sidebar-drawer-progress")
    })
  }

  const onTouchStart = (event: TouchEvent) => {
    // A second finger cancels a swipe under way, and the drawer goes back to where it was
    end(false)
    if (event.touches.length !== 1 || !enabled() || layerOpen(root) || ownsHorizontalSwipe(event.target, root)) return
    const touch = event.touches[0]!
    const open = isOpen()
    const edge = edgeOf(drawer)
    if (!open) {
      const bounds = root.getBoundingClientRect()
      const fromEdge = edge === "left" ? touch.clientX - bounds.left : bounds.right - touch.clientX
      if (fromEdge < 0 || fromEdge > DRAWER_EDGE_ZONE) return
    }
    drag = {
      x: touch.clientX,
      y: touch.clientY,
      lastX: touch.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
      open,
      edge,
      travel: Math.max(1, travelOf(drawer, root, edge)),
      state: "pending",
      progress: open ? 1 : 0,
    }
  }

  const onTouchMove = (event: TouchEvent) => {
    if (!drag || drag.state === "ignored") return
    // A second finger put down outside the root shows only here
    if (event.touches.length !== 1) {
      end(false)
      return
    }
    const touch = event.touches[0]
    if (!touch) return
    const dx = touch.clientX - drag.x
    const dy = touch.clientY - drag.y
    // Toward the open drawer is positive
    const toward = drag.edge === "left" ? dx : -dx
    if (drag.state === "pending") {
      if (Math.abs(dx) < DRAWER_SWIPE_SLOP && Math.abs(dy) < DRAWER_SWIPE_SLOP) return
      const horizontal = Math.abs(dx) > Math.abs(dy)
      if (!horizontal || (drag.open ? toward >= 0 : toward <= 0)) {
        drag.state = "ignored"
        return
      }
      drag.state = "dragging"
      root.setAttribute("data-mobile-dragging", "")
    }
    if (event.cancelable) event.preventDefault()
    const elapsed = event.timeStamp - drag.lastTime
    if (elapsed > 0) drag.velocity = (touch.clientX - drag.lastX) / elapsed
    drag.lastX = touch.clientX
    drag.lastTime = event.timeStamp
    drag.progress = Math.min(1, Math.max(0, (drag.open ? 1 : 0) + toward / drag.travel))
    setProgress(drag.progress)
  }

  // A finger lifted while another stays on the screen cancels the swipe
  const onTouchEnd = (event: TouchEvent) => end(event.touches.length === 0, event.timeStamp)
  const onTouchCancel = () => end(false)

  root.addEventListener("touchstart", onTouchStart, { passive: true })
  root.addEventListener("touchmove", onTouchMove, { passive: false })
  root.addEventListener("touchend", onTouchEnd)
  root.addEventListener("touchcancel", onTouchCancel)
  return () => {
    root.removeEventListener("touchstart", onTouchStart)
    root.removeEventListener("touchmove", onTouchMove)
    root.removeEventListener("touchend", onTouchEnd)
    root.removeEventListener("touchcancel", onTouchCancel)
    root.removeAttribute("data-mobile-dragging")
    root.style.removeProperty("--sidebar-drawer-progress")
  }
}

const TABBABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [contenteditable]:not([contenteditable="false"]), [tabindex]'

/** The controls Tab reaches in the drawer, in order: not disabled (a disabled fieldset too), not in a closed submenu, not hidden */
export const drawerTabbables = (drawer: HTMLElement) =>
  Array.from(drawer.querySelectorAll<HTMLElement>(TABBABLE)).filter(
    (element) =>
      element.tabIndex >= 0 &&
      !element.matches(":disabled") &&
      !element.closest("[inert], [hidden]") &&
      (typeof element.checkVisibility !== "function" || element.checkVisibility({ visibilityProperty: true })),
  )

/** The first control of the open drawer, or the drawer itself */
export const drawerInitialFocus = (drawer: HTMLElement) => drawerTabbables(drawer)[0] ?? drawer

const MENU_BUTTON = "[data-sidebar-mobile-menu-button]"
const PROVIDER = "[data-mobile-menu]"

/** Focus can go there: connected, not disabled, not inert or hidden, visible */
const canTakeFocus = (element: Element | null): element is HTMLElement =>
  element instanceof HTMLElement &&
  element.isConnected &&
  !element.matches(":disabled") &&
  !element.closest("[inert], [hidden]") &&
  (typeof element.checkVisibility !== "function" || element.checkVisibility({ visibilityProperty: true }))

/**
 * Focuses where focus goes when the drawer closes: the control that opened it, or, when that cannot take focus (it
 * sat in another drawer that has closed since, it is gone, or it was the page itself), the menu button of this
 * drawer's provider, then any menu button on the page. The first that takes focus; `null` when none does. A drawer
 * that has already left the page has no provider around it, so `root` is the provider taken while it was open.
 */
export const returnDrawerFocus = (
  opener: Element | null,
  drawer: HTMLElement,
  root: Element | null = drawer.closest(PROVIDER),
): HTMLElement | null => {
  // The provider's own menu buttons, not those of a provider inside it
  const own = [...(root?.querySelectorAll(MENU_BUTTON) ?? [])].filter((button) => button.closest(PROVIDER) === root)
  const candidates = [opener, ...own, ...document.querySelectorAll(MENU_BUTTON)]
  for (const candidate of candidates) {
    if (!canTakeFocus(candidate) || drawer.contains(candidate) || candidate === candidate.ownerDocument.body) continue
    candidate.focus({ preventScroll: true })
    if (candidate.ownerDocument.activeElement === candidate) return candidate
  }
  return null
}

/**
 * Tab from the last control goes to the first and Shift+Tab from the first to the last, so focus stays in the open
 * drawer. A layer over it in a portal (a menu, a dialog) keeps its own Tab.
 */
export function loopDrawerFocus(event: KeyboardEvent, drawer: HTMLElement) {
  if (event.key !== "Tab" || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
  if (!(event.target instanceof Node) || !drawer.contains(event.target)) return
  const items = drawerTabbables(drawer)
  const active = drawer.ownerDocument.activeElement
  const first = items[0]
  const last = items[items.length - 1]
  if (!first || !last) {
    event.preventDefault()
    drawer.focus({ preventScroll: true })
  } else if (event.shiftKey && (active === first || active === drawer)) {
    event.preventDefault()
    last.focus({ preventScroll: true })
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus({ preventScroll: true })
  }
}

/**
 * Escape pressed in the open drawer closes it when the key reaches the window unprevented: a menu, popover or dialog
 * over the drawer has its listener on the way there and takes the key first, however it listens.
 */
export function closeOnUnhandledEscape(event: KeyboardEvent, drawer: HTMLElement, close: () => void) {
  if (event.key !== "Escape" || event.defaultPrevented) return
  const view = drawer.ownerDocument.defaultView
  if (!view) return
  const afterOthers = (late: Event) => {
    view.removeEventListener("keydown", afterOthers)
    // A listener that stopped the key on its way leaves this one to the next key, which only removes it
    if (late !== event || event.defaultPrevented) return
    event.preventDefault()
    close()
  }
  view.addEventListener("keydown", afterOthers)
}
