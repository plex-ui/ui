/** Phone submenu geometry; desktop continues to use the primitive's cascade. */
export type MenuRect = { left: number; top: number; right: number; bottom: number }
export type MenuCollisionPadding = Partial<Record<"top" | "right" | "bottom" | "left", number>>
export type MenuFloatingBoundary = { collisionBoundary?: HTMLElement; collisionPadding: MenuCollisionPadding }
export type PhoneSubmenuPlacement = { sideOffset: number; alignOffset: number }
export type PhoneSubmenuState =
  | { mobile: false }
  | ({ mobile: true; ready: boolean; unavailable: boolean; label: string } & PhoneSubmenuPlacement)

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value))
const round = (value: number) => Math.round(value * 1000) / 1000

export function solvePhoneSubmenuPlacement({
  boundary, trigger, parent, reference = trigger, width, height, paddingTop, direction,
}: {
  boundary: MenuRect
  trigger: MenuRect
  parent: MenuRect
  /** The row's box as the primitive measures it, when the parent steps back (`readRestingMenuRects`) */
  reference?: MenuRect
  width: number
  height: number
  paddingTop: number
  direction: "ltr" | "rtl"
}): PhoneSubmenuPlacement | null {
  if (width <= 0 || height <= 0 || boundary.right <= boundary.left || boundary.bottom <= boundary.top) return null
  // CSS caps the measured panel against this same rectangle. Do not paint an
  // oversized panel if that contract has not reached layout yet.
  if (width > boundary.right - boundary.left + 1 || height > boundary.bottom - boundary.top + 1) return null
  const left = clamp(direction === "rtl" ? parent.right - width : parent.left, boundary.left, Math.max(boundary.left, boundary.right - width))
  const top = clamp(trigger.top - paddingTop, boundary.top, Math.max(boundary.top, boundary.bottom - height))
  return {
    sideOffset: round(direction === "rtl" ? reference.left - width - left : left - reference.right),
    alignOffset: round(top - reference.top),
  }
}

/**
 * The boxes of a parent menu and of the row that opened a submenu at rest. While a phone submenu stands over it the
 * parent steps back with the CSS `scale` property (Menu.module.css, iOS-menu IMG_5677), and the submenu keeps the
 * parent's resting box, as the native one does: undo that scale around the parent's transform origin, at whatever
 * value its transition has reached.
 */
export function readRestingMenuRects(parent: HTMLElement, trigger: HTMLElement): { parent: MenuRect; trigger: MenuRect; reference: MenuRect } {
  const parentRect = parent.getBoundingClientRect()
  const triggerRect = trigger.getBoundingClientRect()
  const view = parent.ownerDocument.defaultView
  const style = view?.getComputedStyle(parent)
  const scale = Number.parseFloat(style?.scale ?? "")
  if (!style || !Number.isFinite(scale) || scale <= 0 || scale === 1) return { parent: parentRect, trigger: triggerRect, reference: triggerRect }
  const [originX = 0, originY = 0] = style.transformOrigin.split(" ").map((value) => Number.parseFloat(value) || 0)
  const x = parentRect.left + originX * scale
  const y = parentRect.top + originY * scale
  const rest = (rect: MenuRect): MenuRect => ({
    left: x + (rect.left - x) / scale,
    top: y + (rect.top - y) / scale,
    right: x + (rect.right - x) / scale,
    bottom: y + (rect.bottom - y) / scale,
  })
  return { parent: rest(parentRect), trigger: rest(triggerRect), reference: triggerRect }
}

/** Consume boundary91's resolved footer padding; never subtract the footer again. */
export function readMenuBoundaryRect(document: Document, boundary: MenuFloatingBoundary): MenuRect | null {
  const view = document.defaultView
  if (!view) return null
  const viewport = view.visualViewport
  let left = viewport?.offsetLeft ?? 0
  let top = viewport?.offsetTop ?? 0
  let right = left + (viewport?.width ?? document.documentElement.clientWidth)
  let bottom = top + (viewport?.height ?? document.documentElement.clientHeight)
  const element = boundary.collisionBoundary
  if (element?.isConnected && element.ownerDocument === document) {
    const rect = element.getBoundingClientRect()
    const scaleX = element.offsetWidth > 0 ? rect.width / element.offsetWidth : 1
    const scaleY = element.offsetHeight > 0 ? rect.height / element.offsetHeight : 1
    const clientLeft = rect.left + element.clientLeft * scaleX
    const clientTop = rect.top + element.clientTop * scaleY
    left = Math.max(left, clientLeft)
    top = Math.max(top, clientTop)
    right = Math.min(right, clientLeft + element.clientWidth * scaleX)
    bottom = Math.min(bottom, clientTop + element.clientHeight * scaleY)
  }
  const padding = boundary.collisionPadding
  return {
    left: left + (padding.left ?? 0),
    top: top + (padding.top ?? 0),
    right: right - (padding.right ?? 0),
    bottom: bottom - (padding.bottom ?? 0),
  }
}

const normalizeLabel = (value: string) => value.replace(/\s+/g, " ").trim()

function visibleText(element: Element, includeHidden = false): string {
  const view = element.ownerDocument.defaultView
  if (!view) return ""
  // Explicit aria-labelledby targets can supply a name while visually hidden.
  if (!includeHidden && (element.hasAttribute("hidden") || element.getAttribute("aria-hidden") === "true")) return ""
  if (["SCRIPT", "STYLE", "TEMPLATE"].includes(element.tagName)) return ""
  const style = view.getComputedStyle(element)
  if (!includeHidden && (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse")) return ""
  const ownLabel = element.getAttribute("aria-label")
  if (ownLabel?.trim()) return ownLabel
  if (element.tagName === "IMG") return element.getAttribute("alt") ?? ""
  return Array.from(element.childNodes).map((node) => {
    if (node.nodeType === 3) return node.textContent ?? ""
    return node instanceof view.Element ? visibleText(node, includeHidden) : ""
  }).join("")
}

function labelReferences(trigger: HTMLElement): Element[] {
  return (trigger.getAttribute("aria-labelledby") ?? "").split(/\s+/).filter(Boolean)
    .map((id) => trigger.ownerDocument.getElementById(id)).filter((element): element is HTMLElement => element !== null)
}

/** A text snapshot, never a clone of a consumer's rich children or their IDs. */
export function readMenuTriggerLabel(trigger: HTMLElement): string {
  const referenced = normalizeLabel(labelReferences(trigger).map((element) => visibleText(element, true)).join(" "))
  if (referenced) return referenced
  const labelled = normalizeLabel(trigger.getAttribute("aria-label") ?? "")
  if (labelled) return labelled
  return normalizeLabel(visibleText(trigger)) || "Collapse submenu"
}

export function focusPhoneSubmenuEntry(content: HTMLElement): void {
  const items = Array.from(content.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]'))
    .filter((item) => item.closest('[role="menu"]') === content && !item.hasAttribute("data-disabled") && item.getAttribute("aria-disabled") !== "true")
  const target = items.find((item) => !item.hasAttribute("data-submenu-collapse")) ?? items[0]
  target?.focus({ preventScroll: true })
}

export function samePhoneSubmenuState(a: PhoneSubmenuState, b: PhoneSubmenuState): boolean {
  return a.mobile === b.mobile && (!a.mobile || !b.mobile ||
    (a.ready === b.ready && a.unavailable === b.unavailable && a.label === b.label && a.sideOffset === b.sideOffset && a.alignOffset === b.alignOffset))
}

/** Own only these Phone attributes/variables. Primitive focus and dismissal stay intact. */
export function observePhoneSubmenu(
  trigger: HTMLElement,
  content: HTMLElement,
  boundary: MenuFloatingBoundary,
  update: (state: PhoneSubmenuState) => void,
): { refresh: () => void; dispose: () => void } {
  const view = content.ownerDocument.defaultView
  if (!view || trigger.ownerDocument !== content.ownerDocument) return { refresh: () => {}, dispose: () => {} }
  const parent = trigger.closest('[role="menu"]')
  if (!(parent instanceof view.HTMLElement)) return { refresh: () => {}, dispose: () => {} }
  const media = typeof view.matchMedia === "function" ? view.matchMedia("(max-width: 767px)") : null
  let disposed = false
  let frame: number | undefined
  let references: Element[] = []
  const setVariable = (name: string, value: number) => {
    const next = `${round(Math.max(0, value))}px`
    if (content.style.getPropertyValue(name) !== next) content.style.setProperty(name, next)
  }
  const clearPhone = () => {
    content.removeAttribute("data-submenu-phone")
    content.removeAttribute("data-submenu-positioned")
    content.removeAttribute("data-submenu-unavailable")
    content.style.removeProperty("--menu-phone-max-width")
    content.style.removeProperty("--menu-phone-max-height")
  }
  const labelObserver = new view.MutationObserver(() => schedule())
  const updateLabelTargets = () => {
    const next = labelReferences(trigger)
    if (next.length === references.length && next.every((element, index) => element === references[index])) return
    references = next
    labelObserver.disconnect()
    for (const element of references) {
      labelObserver.observe(element, { childList: true, characterData: true, subtree: true, attributes: true })
      // A localized label can be replaced while retaining its public ID.
      if (element.parentElement) labelObserver.observe(element.parentElement, { childList: true })
    }
  }
  const refresh = () => {
    if (disposed) return
    if (!(media?.matches ?? view.innerWidth <= 767)) {
      clearPhone()
      parent.removeAttribute("data-submenu-over")
      update({ mobile: false })
      return
    }
    content.setAttribute("data-submenu-phone", "")
    updateLabelTargets()
    const label = readMenuTriggerLabel(trigger)
    const available = readMenuBoundaryRect(content.ownerDocument, boundary)
    if (!available) return
    setVariable("--menu-phone-max-width", available.right - available.left)
    setVariable("--menu-phone-max-height", available.bottom - available.top)
    const style = view.getComputedStyle(content)
    const width = content.offsetWidth
    const height = content.offsetHeight
    const hasHeader = !!content.querySelector("[data-submenu-collapse]")
    const resting = readRestingMenuRects(parent, trigger)
    const placement = solvePhoneSubmenuPlacement({
      boundary: available,
      trigger: resting.trigger,
      parent: resting.parent,
      reference: resting.reference,
      width,
      height,
      paddingTop: Number.parseFloat(style.paddingTop) || 0,
      direction: style.direction === "rtl" ? "rtl" : "ltr",
    })
    // Wait for the header and real geometry, never flash the desktop cascade.
    const ready = !!placement && hasHeader
    // Header/zero-layout are still pending. After the CSS caps and header are
    // present, an empty boundary or measured overflow has no valid placement.
    const emptyBoundary = available.right <= available.left || available.bottom <= available.top
    const unavailable = hasHeader && !placement && (emptyBoundary || (width > 0 && height > 0))
    if (ready) content.setAttribute("data-submenu-positioned", "")
    else content.removeAttribute("data-submenu-positioned")
    if (unavailable) content.setAttribute("data-submenu-unavailable", "")
    else content.removeAttribute("data-submenu-unavailable")
    // The parent steps back while the submenu stands over it (Menu.module.css), not while it has nowhere to stand
    if (ready) parent.setAttribute("data-submenu-over", "")
    else parent.removeAttribute("data-submenu-over")
    update({ mobile: true, ready, unavailable, label, ...(placement ?? { sideOffset: 0, alignOffset: 0 }) })
    // A parent's enter transform moves its child trigger without resizing it.
    // Follow only that running transition, not an idle menu forever.
    if (typeof parent.getAnimations === "function" && parent.getAnimations().some((animation) => animation.playState === "running")) schedule()
  }
  const schedule = () => {
    if (!disposed && frame === undefined) frame = view.requestAnimationFrame(() => { frame = undefined; refresh() })
  }
  const resize = typeof view.ResizeObserver === "function" ? new view.ResizeObserver(schedule) : undefined
  for (const element of [trigger, parent, content, boundary.collisionBoundary]) if (element) resize?.observe(element)
  const mutations = new view.MutationObserver(schedule)
  mutations.observe(trigger, { attributes: true, characterData: true, childList: true, subtree: true })
  mutations.observe(parent, { attributes: true, attributeFilter: ["class", "style"] })
  if (parent.parentElement) mutations.observe(parent.parentElement, { attributes: true, attributeFilter: ["class", "style", "data-entering", "data-entering-active"] })
  media?.addEventListener("change", refresh)
  view.addEventListener("scroll", schedule, true)
  view.addEventListener("resize", schedule)
  view.visualViewport?.addEventListener("scroll", schedule)
  view.visualViewport?.addEventListener("resize", schedule)
  refresh()
  return {
    refresh,
    dispose: () => {
      disposed = true
      if (frame !== undefined) view.cancelAnimationFrame(frame)
      resize?.disconnect()
      mutations.disconnect()
      labelObserver.disconnect()
      media?.removeEventListener("change", refresh)
      view.removeEventListener("scroll", schedule, true)
      view.removeEventListener("resize", schedule)
      view.visualViewport?.removeEventListener("scroll", schedule)
      view.visualViewport?.removeEventListener("resize", schedule)
      // Retained transition nodes keep their last geometry through exit, and a parent that leaves with its submenu
      // leaves stepped back. A choice in the submenu closes it before the whole menu starts to leave, so the parent
      // steps forward a frame later, unless by then it is leaving or another of its submenus stands over it.
      view.requestAnimationFrame(() => {
        if (parent.closest("[data-exiting]") || parent.getAttribute("data-state") === "closed") return
        if (parent.querySelector('[aria-expanded="true"]')) return
        parent.removeAttribute("data-submenu-over")
      })
    },
  }
}
