/** Framework-independent lifecycle, mirrored in the Vue/React packages so neither
 * published port depends on the other framework. Vendor stores remain public. */
export type ToastId = string | number
export type Position = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right"
export type Direction = "top" | "bottom" | "left" | "right"
type ToastData = { id: ToastId; toasterId?: string; position?: Position; duration?: number; type?: string; dismissible?: boolean }
export type ToastConfig = { id?: string; position: Position; duration: number; gap: number; visibleToasts: number; expand?: boolean; swipeDirections?: Direction[] }
export type ToastEntry<T> = { toast: T; removed: boolean; detached?: boolean; mounted: boolean; height: number; x: number; y: number; swiping: boolean; swipeOut?: "up" | "down" | "left" | "right"; remaining: number; started?: number; timer?: ReturnType<typeof setTimeout>; exitTimer?: ReturnType<typeof setTimeout>; mountTimer?: ReturnType<typeof setTimeout>; exitOffset: number }
type Gesture = { id: ToastId; pointerId: number; x: number; y: number; started: number; axis?: "x" | "y" }
const EXIT_DURATION = 200
/** How long an announced line stays in the polite region before it leaves the DOM */
const ANNOUNCE_DURATION = 7000

export class ToastLifecycle<T extends ToastData> {
  entries: ToastEntry<T>[] = []
  config: ToastConfig = { position: "top-center", duration: 3000, gap: 14, visibleToasts: 3 }
  private listeners = new Set<() => void>()
  private revision = 0
  private doc: Document | null = null
  private hidden = false
  private hovered = false
  private focused = false
  private gesture?: Gesture
  private previousFocus: HTMLElement | null = null
  private nodes = new Map<ToastId, HTMLElement>()
  private lists = new Map<Position, HTMLElement>()
  private suppressed = new Map<ToastId, T>()
  private lastPointerType = ""
  private region: HTMLElement | null = null
  private announcers: { polite: HTMLElement | null; assertive: HTMLElement | null } = { polite: null, assertive: null }
  private announced = new Map<ToastId, string>()
  /** Alerts read by the assertive announcer: shown behind the stack, their own role could not speak */
  private assertive = new Set<ToastId>()
  private announceTimers = new Set<ReturnType<typeof setTimeout>>()
  private pending = new Map<ToastId, { text: string; assertive: boolean }>()
  private flushTimer?: ReturnType<typeof setTimeout>

  constructor(private dismissStore: (id: ToastId) => unknown, private notify: (reason: "dismiss" | "auto", toast: T) => void) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  snapshot = () => this.revision
  private emit() { this.revision++; this.listeners.forEach((listener) => listener()) }
  get expanded() { return this.hovered || this.focused }
  get paused() { return this.expanded || Boolean(this.gesture) || this.hidden }
  connect(doc: Document) {
    this.doc = doc; this.hidden = doc.hidden
    doc.addEventListener("visibilitychange", this.visibility)
    for (const type of ISOLATED_EVENTS) doc.addEventListener(type, this.isolate)
    this.refreshTimers()
  }
  private visibility = () => { this.hidden = Boolean(this.doc?.hidden); this.refreshTimers(); this.emit() }
  /* The region is a layer of its own, above any modal. A modal layer (Radix, Reka) listens on the
     document for focus and presses outside it: it would pull focus back out of a toast and close
     on a press of its close or action. This listener, added when the Toaster mounts and so before a
     Dialog opens, runs after the framework's own (React delegates to its root, Vue binds to the
     element) and stops the ones added after it, only while a modal layer has turned the page's
     pointer events off: then nothing under the toast should hear it. Without a modal, a Popover a
     custom toast opened still hears a press elsewhere in the toast. */
  private isolate = (event: Event) => {
    const region = this.region
    if (!region || this.doc?.body.style.pointerEvents !== "none") return
    const related = event.type === "focusout" ? (event as FocusEvent).relatedTarget : null
    if (event.target instanceof Node && region.contains(event.target) || related instanceof Node && region.contains(related)) event.stopImmediatePropagation()
  }
  setRegion(node: HTMLElement | null) { this.region = node }
  setAnnouncer(kind: "polite" | "assertive", node: HTMLElement | null) { this.announcers[kind] = node }
  /** An error that waits to be closed interrupts as an alert; every other toast is read politely. */
  alert(entry: ToastEntry<T>) { return entry.toast.type === "error" && (entry.toast.duration || this.config.duration) === Infinity }
  /** Whether a toast's content carries role="alert": an alert, unless it came in behind the stack and the assertive announcer read it. */
  alertRole(entry: ToastEntry<T>, custom: boolean) { return !custom && this.alert(entry) && !this.assertive.has(entry.toast.id) }
  private visible(entry: ToastEntry<T>) { return this.at(this.position(entry)).indexOf(entry) < this.config.visibleToasts }
  /** Reads a toast's words once, and again only when they change (a promise that settles, a custom toast's own state). */
  speak(id: ToastId, node: HTMLElement, custom: boolean) {
    const entry = this.entries.find((item) => item.toast.id === id)
    if (!entry || entry.removed) return
    const text = toastText(node)
    const alert = this.alert(entry) && !custom
    // An alert speaks at once, never also politely: words still waiting to be read politely are read as the alert
    if (alert && this.pending.get(id)?.assertive === false) { this.pending.delete(id); this.announced.delete(id) }
    if (!text || this.announced.get(id) === text) return
    this.announced.set(id, text)
    // A shown alert reads itself by its role; one that came in behind the stack (inert, aria-hidden) cannot
    if (alert && this.visible(entry) && !this.assertive.has(id)) return
    this.pending.set(id, { text, assertive: alert })
    // Its content then drops role="alert", so it does not speak again once the stack brings it forward
    if (alert && !this.assertive.has(id)) { this.assertive.add(id); this.emit() }
    // Toasts shown together are read together, the oldest first, whichever framework renders them first
    if (this.flushTimer === undefined) this.flushTimer = setTimeout(this.flush, 0)
  }
  private flush = () => {
    this.flushTimer = undefined
    const order = this.entries.map((entry) => entry.toast.id).reverse()
    const lines = [...this.pending].sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
    this.pending.clear()
    for (const [, { text, assertive }] of lines) {
      const node = this.announcers[assertive ? "assertive" : "polite"]
      if (!node) continue
      const line = node.ownerDocument.createElement("div")
      line.textContent = text
      node.append(line)
      const timer = setTimeout(() => { line.remove(); this.announceTimers.delete(timer) }, ANNOUNCE_DURATION)
      this.announceTimers.add(timer)
    }
  }
  disconnect() {
    this.doc?.removeEventListener("visibilitychange", this.visibility)
    for (const type of ISOLATED_EVENTS) this.doc?.removeEventListener(type, this.isolate)
    for (const timer of this.announceTimers) clearTimeout(timer)
    clearTimeout(this.flushTimer); this.flushTimer = undefined
    this.announceTimers.clear()
    this.announced.clear()
    this.assertive.clear()
    this.pending.clear()
    this.announcers.polite?.replaceChildren()
    this.announcers.assertive?.replaceChildren()
    for (const entry of this.entries) { clearTimeout(entry.timer); clearTimeout(entry.exitTimer); clearTimeout(entry.mountTimer); entry.timer = undefined; entry.started = undefined }
    this.doc = null
    this.gesture = undefined
    this.hovered = false
    this.focused = false
    this.previousFocus = null
  }
  sync(toasts: T[], config: ToastConfig) {
    const oldDuration = this.config.duration
    this.config = config
    const incoming = toasts.filter((toast) => config.id ? toast.toasterId === config.id : !toast.toasterId)
    const present = new Set(incoming.map((toast) => toast.id))
    for (const entry of this.entries) if (!present.has(entry.toast.id) && !entry.removed) this.close(entry.toast.id, toasts.some((toast) => toast.id === entry.toast.id) ? "detach" : "external")
    const ordered: ToastEntry<T>[] = []
    for (const toast of incoming) {
      if (this.suppressed.get(toast.id) === toast) continue
      let entry = this.entries.find((item) => item.toast.id === toast.id)
      if (!entry) {
        entry = { toast, removed: false, mounted: false, height: 0, x: 0, y: 0, swiping: false, remaining: toast.duration || config.duration, exitOffset: 0 }
        const mountedEntry = entry
        entry.mountTimer = setTimeout(() => { mountedEntry.mounted = true; this.emit() }, 0)
      } else if (entry.toast !== toast || entry.detached) {
        const restart = entry.removed || entry.toast.type !== toast.type || entry.toast.duration !== toast.duration
        entry.toast = toast
        entry.detached = false
        // Same-id updates restart the current budget; only an actual pause
        // subtracts elapsed time (the public Sonner store/update contract).
        clearTimeout(entry.timer); entry.timer = undefined; entry.started = undefined
        if (restart) {
          clearTimeout(entry.exitTimer); this.pause(entry); entry.removed = false; entry.swipeOut = undefined
          entry.remaining = toast.duration || config.duration
        }
      }
      if (this.gesture?.id === toast.id && (toast.type === "loading" || toast.dismissible === false)) { this.gesture = undefined; entry.swiping = false; entry.x = 0; entry.y = 0 }
      if (oldDuration !== config.duration && !toast.duration) { this.pause(entry); entry.remaining = config.duration }
      ordered.push(entry)
    }
    this.entries = [...ordered, ...this.entries.filter((entry) => entry.removed && !present.has(entry.toast.id))]
    for (const id of this.suppressed.keys()) if (!present.has(id)) this.suppressed.delete(id)
    this.refreshTimers()
    this.emit()
  }
  private pause(entry: ToastEntry<T>) {
    if (entry.started !== undefined) entry.remaining = Math.max(0, entry.remaining - (Date.now() - entry.started))
    clearTimeout(entry.timer); entry.timer = undefined; entry.started = undefined
  }
  private refreshTimers() {
    for (const entry of this.entries) {
      if (entry.removed || this.paused || entry.toast.type === "loading" || entry.remaining === Infinity) { this.pause(entry); continue }
      if (entry.timer !== undefined) continue
      entry.started = Date.now()
      entry.timer = setTimeout(() => this.close(entry.toast.id, "auto"), Math.max(0, entry.remaining))
    }
  }
  position(entry: ToastEntry<T>) { return entry.toast.position ?? this.config.position }
  at(position: Position) { return this.entries.filter((entry) => this.position(entry) === position) }
  offset(entry: ToastEntry<T>) {
    if (entry.removed) return entry.exitOffset
    const siblings = this.at(this.position(entry)).filter((item) => !item.removed)
    return siblings.slice(0, siblings.indexOf(entry)).reduce((sum, item) => sum + item.height + this.config.gap, 0)
  }
  setNode(id: ToastId, node: HTMLElement | null) { if (node) this.nodes.set(id, node); else this.nodes.delete(id) }
  setList(position: Position, node: HTMLElement | null) { if (node) this.lists.set(position, node); else this.lists.delete(position) }
  measure(id: ToastId, height: number) { const entry = this.entries.find((item) => item.toast.id === id); if (entry && entry.height !== height) { entry.height = height; this.emit() } }
  close(id: ToastId, reason: "dismiss" | "auto" | "action" | "external" | "detach") {
    const entry = this.entries.find((item) => item.toast.id === id)
    if (!entry || entry.removed || reason === "dismiss" && (entry.toast.dismissible === false || entry.toast.type === "loading")) return
    entry.exitOffset = this.offset(entry)
    entry.removed = true
    this.announced.delete(id)
    this.assertive.delete(id)
    this.pending.delete(id)
    entry.detached = reason === "detach"
    this.pause(entry)
    if (this.gesture?.id === id) this.gesture = undefined
    entry.swiping = false
    if (reason === "dismiss" || reason === "auto" || reason === "external") this.notify(reason === "external" ? "dismiss" : reason, entry.toast)
    const node = this.nodes.get(id)
    if (node?.contains(this.doc?.activeElement ?? null)) this.restoreFocus()
    entry.exitTimer = setTimeout(() => {
      if (reason !== "detach") this.suppressed.set(id, entry.toast)
      this.entries = this.entries.filter((item) => item !== entry)
      if (reason !== "external" && reason !== "detach") this.dismissStore(id)
      this.emit()
    }, EXIT_DURATION)
    this.refreshTimers(); this.emit()
  }
  private ownsFocus(target: EventTarget | null) { return target instanceof Node && [...this.lists.values()].some((list) => list.contains(target)) }
  focusIn(event: FocusEvent) {
    if (!this.focused && event.relatedTarget instanceof HTMLElement && !this.ownsFocus(event.relatedTarget)) this.previousFocus = event.relatedTarget
    this.focused = true; this.refreshTimers(); this.emit()
  }
  focusOut(event: FocusEvent) {
    if (this.ownsFocus(event.relatedTarget)) return
    this.focused = false
    // An intentional move to another control owns focus. Never bounce through the opener.
    if (event.relatedTarget instanceof HTMLElement) this.previousFocus = null
    this.refreshTimers(); this.emit()
  }
  private restoreFocus() {
    const previous = this.previousFocus
    this.previousFocus = null; this.focused = false
    if (previous?.isConnected) previous.focus({ preventScroll: true })
  }
  keyDown(event: KeyboardEvent, hotkey: string[]) {
    if (hotkey.length && hotkey.every((key) => key === event.code || (key === "altKey" && event.altKey) || (key === "ctrlKey" && event.ctrlKey) || (key === "metaKey" && event.metaKey) || (key === "shiftKey" && event.shiftKey))) {
      const list = this.lists.values().next().value
      if (list) { event.preventDefault(); list.focus({ preventScroll: true }) }
    } else if (event.key === "Escape" && this.ownsFocus(this.doc?.activeElement ?? null)) {
      this.hovered = false; this.restoreFocus(); this.refreshTimers(); this.emit()
    }
  }
  pointerEnter(event: PointerEvent) { this.lastPointerType = event.pointerType; this.hover(event.pointerType !== "touch") }
  hover(value: boolean) {
    if (value && (this.lastPointerType === "touch" || this.doc?.documentElement.dataset.input === "touch" || this.doc?.defaultView?.matchMedia?.("(hover: none) and (pointer: coarse)").matches)) return
    this.hovered = value; this.refreshTimers(); this.emit()
  }
  pointerDown(id: ToastId, event: PointerEvent) {
    this.lastPointerType = event.pointerType
    if (event.pointerType === "touch" && this.hovered) { this.hovered = false; this.refreshTimers(); this.emit() }
    const entry = this.entries.find((item) => item.toast.id === id)
    if (this.gesture || !entry || entry.removed || event.button !== 0 || entry.toast.type === "loading" || entry.toast.dismissible === false) return
    if (event.target instanceof Element && event.target.closest("button, a, input, textarea, select, [contenteditable='true']")) return
    this.gesture = { id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, started: Date.now() }
    entry.swiping = true
    this.nodes.get(id)?.setPointerCapture?.(event.pointerId)
    this.refreshTimers(); this.emit()
  }
  pointerMove(id: ToastId, event: PointerEvent) {
    const gesture = this.gesture
    const entry = this.entries.find((item) => item.toast.id === id)
    if (!gesture || gesture.id !== id || gesture.pointerId !== event.pointerId || !entry) return
    if (this.doc?.getSelection()?.toString()) return
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y
    if (!gesture.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 1) gesture.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y"
    const [vertical, horizontal] = this.position(entry).split("-")
    const allowed = this.config.swipeDirections ?? [vertical, horizontal]
    entry.x = gesture.axis === "x" && allowed.includes(dx > 0 ? "right" : "left") ? dx : 0
    entry.y = gesture.axis === "y" && allowed.includes(dy > 0 ? "bottom" : "top") ? dy : 0
    this.emit()
  }
  pointerEnd(id: ToastId, event: PointerEvent, cancelled = false) {
    const gesture = this.gesture
    const entry = this.entries.find((item) => item.toast.id === id)
    if (!gesture || gesture.id !== id || gesture.pointerId !== event.pointerId || !entry) return
    const distance = Math.max(Math.abs(entry.x), Math.abs(entry.y))
    this.gesture = undefined; entry.swiping = false
    if (!cancelled && (distance >= 45 || distance > 3 && distance / Math.max(1, Date.now() - gesture.started) > 0.11)) {
      entry.swipeOut = entry.x ? entry.x > 0 ? "right" : "left" : entry.y > 0 ? "down" : "up"
      this.close(id, "dismiss")
    } else { entry.x = 0; entry.y = 0 }
    this.refreshTimers(); this.emit()
  }
}

const ISOLATED_EVENTS = ["focusin", "focusout", "pointerdown"] as const

/** The words a toast says: its title and description, or a custom toast's text. */
export const toastText = (node: HTMLElement) => {
  const words = (element: Element | null | undefined) => element?.textContent?.replace(/\s+/g, " ").trim() ?? ""
  if (!node.querySelector("[data-content]")) return words(node)
  const title = words(node.querySelector("[data-title]"))
  const description = words(node.querySelector("[data-description]"))
  if (!title || !description) return title || description
  return `${/[.!?…:;。！？]$/u.test(title) ? title : `${title}.`} ${description}`
}

/** Hides the polite announcer from sight, not from a screen reader. */
export const announcerStyle = { position: "absolute", width: "1px", height: "1px", margin: "-1px", padding: "0", overflow: "hidden", clip: "rect(0 0 0 0)", clipPath: "inset(50%)", whiteSpace: "nowrap", border: "0" } as const

export type Offset = number | string | Partial<Record<"top" | "right" | "bottom" | "left", number | string>>
export const offsetStyles = (offset: Offset | undefined, mobileOffset: Offset | undefined) => {
  const style: Record<string, string> = {}
  for (const [prefix, value, fallback] of [["--offset", offset, "32px"], ["--mobile-offset", mobileOffset, "16px"]] as const) {
    for (const edge of ["top", "right", "bottom", "left"] as const) {
      const size = typeof value === "object" ? value[edge] ?? fallback : value ?? fallback
      style[`${prefix}-${edge}`] = typeof size === "number" ? `${size}px` : size
    }
  }
  return style
}

export const documentDirection = (doc: Document | undefined) => {
  const direction = doc?.documentElement.getAttribute("dir")
  if (direction === "ltr" || direction === "rtl") return direction
  return doc?.defaultView?.getComputedStyle(doc.documentElement).direction === "rtl" ? "rtl" : "ltr"
}
