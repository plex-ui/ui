import s from "@plexui/styles/components/Sortable/Sortable.module.css"
import { CONTEXT_MENU_HOLD, CONTEXT_MENU_LONG_PRESS_SLOP, heldContextMenu, type ContextMenuHold } from "./contextMenuHold"

// Drag to reorder, for any list of elements. Nothing moves until the drop: the
// item leaves a flat slot and shrinks to a chip at the cursor, a line marks the
// nearest gap, and only the drop changes the order. Items that stand apart part
// at the gap. Rows that touch hold still: their text would run over the hairlines.
// Lists of one group trade items, and a target outside them takes an item whole.
// A list may keep its items to itself (reach "list") or only hand them to targets
// (reach "targets"): then nothing parts, no line shows and the keys leave the order.

export type SortableLayout = "list" | "grid"

/** Where a drag from the list may go: the lists of its group and their targets, the list itself and the targets, or
 * the targets only */
export type SortableReach = "group" | "list" | "targets"

/** Applies a move to the list. Resolves once the DOM shows the new order. */
export type SortableCommit = (from: number, to: number) => void | Promise<void>

/** A move inside a list, into another list of its group or onto a target */
export type SortableMove<T = unknown> = {
  /** The entry of `value` that moved */
  item: T
  /** The `name` of the list it left */
  from: string
  /** Its place there */
  fromIndex: number
  /** The `name` of the list or the target it reached */
  to: string
  /** Its place after the move. A target has no places: the app decides. */
  toIndex?: number
}

/** What a list does when an item leaves it. Resolves once the DOM shows the move. */
export type SortableLink = {
  move: (fromIndex: number, to: string, toIndex?: number) => void | Promise<void>
  hold?: (name: string) => void
}

type Slot = {
  gap: number
  /** Offsets from the list's corner, so a scroll under the drag keeps them true */
  x: number
  y: number
  length: number
  before?: Element
  after?: Element
}

type Area = {
  list: HTMLElement
  items: HTMLElement[]
  slots: Slot[]
  scrollLeft: number
  scrollTop: number
}

type Found = {
  area: Area
  slot: Slot
}

const START_DISTANCE = 4
const TOUCH_HOLD = 200
// Long enough to pass over a target on the way to another
const TARGET_HOLD = 500
const SCROLL_EDGE = 80
const SCROLL_SLOW = 4
const SCROLL_FAST = 30
const NEAR_LIST = 40
const LINE_INSET = 16
const PART = 4
// --cubic-enter: an animation here cannot read a CSS variable
const EASING = "cubic-bezier(.19,1,.22,1)"
// One pointer owns a pending hold or drag in this document.
const activeDrags = new WeakMap<Document, () => void>()
const HANDLE = "[data-sortable-handle]"
const GRAB = "[data-sortable-grab]"
const STATIC = "data-sortable-static"
const INTERACTIVE = [
  "a[href]",
  "button",
  "input",
  "select",
  "summary",
  "textarea",
  "[contenteditable]",
  "[role=button]",
  "[role=checkbox]",
  "[role=combobox]",
  "[role=link]",
  "[role=radio]",
  "[role=slider]",
  "[role=switch]",
  "[role=tab]",
].join(",")

// Read at the moment of use: the setting can change while the page is open
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** How far the line stands in from the sides of the list */
const lineInset = (list: HTMLElement) => {
  const inset = parseFloat(getComputedStyle(list).getPropertyValue("--sortable-line-inset"))
  return Number.isNaN(inset) ? LINE_INSET : inset
}

/** A head row or an empty message stands among the items and is not one of them */
const itemsOf = (list: HTMLElement) => ([...list.children] as HTMLElement[]).filter((item) => !item.hasAttribute(STATIC))

const reachOf = (list: HTMLElement): SortableReach => {
  const { reach } = list.dataset
  return reach === "list" || reach === "targets" ? reach : "group"
}

/** The lists a drag from this one can reach, in the order of the page. A list that keeps its items to itself or only
 * hands them to targets takes none from the others either. */
const listsOf = (list: HTMLElement) => {
  const { group } = list.dataset
  if (!group || reachOf(list) !== "group") return [list]
  return [...document.querySelectorAll<HTMLElement>(`[data-sortable][data-group="${CSS.escape(group)}"]:not([data-disabled])`)]
    .filter((entry) => entry === list || reachOf(entry) === "group")
}

/** Grips stand in a table, elsewhere only when the list asks for them */
const showsHandles = (list: HTMLElement) => (list.dataset.handles ?? String(list.tagName === "TBODY")) === "true"

/** The direct child of the list that holds `target` */
const itemOf = (list: HTMLElement, target: Element) => {
  let node: Element | null = target
  while (node && node.parentElement !== list) node = node.parentElement
  return node as HTMLElement | null
}

/** The order after a move. `to` counts the list without the moved item. */
export const moveItem = <T>(items: readonly T[], from: number, to: number) => {
  const next = [...items]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}

const labelOf = (item: HTMLElement) => {
  const named = item.dataset.sortableLabel ?? item.querySelector("[data-sortable-label], label")?.textContent
  if (named) return named.trim()
  // The cells of a row or the lines of a card run together: the first one is the name
  const texts = document.createTreeWalker(item, NodeFilter.SHOW_TEXT)
  while (texts.nextNode()) {
    if (texts.currentNode.textContent?.trim()) return texts.currentNode.parentElement?.textContent?.trim() ?? ""
  }
  return ""
}

/** What a screen reader hears: a picture has no text of its own */
const nameOf = (item: HTMLElement) => labelOf(item) || item.querySelector("img")?.alt || ""

function makeChip(item: HTMLElement) {
  const chip = document.createElement("div")
  chip.className = s.Chip
  const image = item.querySelector<HTMLElement>("[data-sortable-image], img")
  if (image instanceof HTMLImageElement) {
    const picture = document.createElement("img")
    picture.className = s.ChipImage
    picture.src = image.currentSrc || image.src
    picture.alt = ""
    chip.append(picture)
  } else if (image) {
    // A cropped background: the chip takes the element as it stands, at the chip's size
    const picture = image.cloneNode(false) as HTMLElement
    picture.className = s.ChipImage
    picture.hidden = false
    chip.append(picture)
  }
  const text = labelOf(item)
  if (text) {
    const label = document.createElement("span")
    label.className = s.ChipLabel
    label.textContent = text
    chip.append(label)
  }
  document.body.append(chip)
  return chip
}

function announce(text: string) {
  let region = document.querySelector("[data-sortable-live]")
  if (!region) {
    region = document.createElement("div")
    region.className = s.Live
    region.setAttribute("aria-live", "polite")
    region.setAttribute("data-sortable-live", "")
    document.body.append(region)
  }
  region.textContent = text
}

const scrollParent = (start: Element | null) => {
  for (let node = start; node && node !== document.body; node = node.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight) return node
  }
  return undefined
}

// The nearer the edge the faster: slow to aim at a row, fast across a long list
const scrollStep = (depth: number) =>
  SCROLL_SLOW + (SCROLL_FAST - SCROLL_SLOW) * Math.min(depth / SCROLL_EDGE, 1)

function listSlots(list: HTMLElement, items: HTMLElement[]) {
  const box = list.getBoundingClientRect()
  const inset = lineInset(list)
  if (!items.length) {
    // Above a message or an empty row: the line must not cross its text
    const rest = (list.lastElementChild ?? list).getBoundingClientRect()
    return [{ gap: 0, x: inset, y: rest.top - box.top, length: box.width - inset * 2 }]
  }
  const rects = items.map((item) => item.getBoundingClientRect())
  return Array.from({ length: items.length + 1 }, (_, gap): Slot => {
    const above = rects[gap - 1]
    const below = rects[gap]
    const y = above && below ? (above.bottom + below.top) / 2 : (below?.top ?? above.bottom)
    return {
      gap,
      x: inset,
      y: y - box.top,
      length: box.width - inset * 2,
      before: items[gap - 1],
      after: items[gap],
    }
  })
}

// One slot per gap, and two where a line wraps: the end of one line and the start of the next
function gridSlots(list: HTMLElement, items: HTMLElement[]) {
  const box = list.getBoundingClientRect()
  if (!items.length) return [{ gap: 0, x: 0, y: 0, length: box.height }]
  const half = (parseFloat(getComputedStyle(list).columnGap) || 8) / 2
  const rects = items.map((item) => item.getBoundingClientRect())
  const slots: Slot[] = []
  const add = (gap: number, x: number, rect: DOMRect, before?: Element, after?: Element) =>
    slots.push({ gap, x: x - box.left, y: rect.top - box.top, length: rect.height, before, after })

  rects.forEach((rect, gap) => {
    const previous = rects[gap - 1]
    if (previous && Math.abs(previous.top - rect.top) < rect.height / 2) {
      add(gap, (previous.right + rect.left) / 2, rect, items[gap - 1], items[gap])
      return
    }
    if (previous) add(gap, previous.right + half, previous, items[gap - 1])
    add(gap, rect.left - half, rect, undefined, items[gap])
  })
  const last = rects.length - 1
  add(rects.length, rects[last].right + half, rects[last], items[last])
  return slots
}

// The chip keeps its size and fades out: grown to the item, its text would stand over the item's own
function flyChip(chip: HTMLElement, to: DOMRect | undefined, layout: SortableLayout) {
  if (reduced() || !to) {
    chip.remove()
    return
  }
  const from = chip.getBoundingClientRect()
  const x = layout === "grid" ? to.left + (to.width - from.width) / 2 : to.left
  const y = to.top + (to.height - from.height) / 2
  chip.animate(
    [
      { transform: `translate(${from.left}px, ${from.top}px)`, opacity: 1 },
      { transform: `translate(${x}px, ${y}px)`, opacity: 0 },
    ],
    { duration: 200, easing: EASING, fill: "forwards" },
  ).onfinish = () => chip.remove()
}

/** The items that changed place slide there from where they stood */
async function flip(items: HTMLElement[], work: () => void | Promise<void>, skip?: HTMLElement) {
  const before = new Map(items.map((item) => [item, item.getBoundingClientRect()]))
  await work()
  if (reduced()) return
  items
    .filter((item) => item !== skip && item.isConnected)
    .forEach((item) => {
      const was = before.get(item) as DOMRect
      const now = item.getBoundingClientRect()
      const x = was.left - now.left
      const y = was.top - now.top
      if (x || y) item.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: "none" }], { duration: 200, easing: EASING })
    })
}

const swallow = (event: Event) => {
  event.stopPropagation()
  event.preventDefault()
}

function startDrag(
  event: PointerEvent,
  list: HTMLElement,
  source: HTMLElement,
  layout: SortableLayout,
  immediate: boolean,
  commit: SortableCommit,
  link?: SortableLink,
) {
  const doc = list.ownerDocument
  const pointerId = event.pointerId
  const validSource = () => list.isConnected && !list.hasAttribute("data-disabled")
    && source.parentElement === list && !source.hasAttribute(STATIC)
  const cancel = () => finish(false, true)
  activeDrags.set(doc, cancel)
  const touch = event.pointerType === "touch" && !immediate
  const origin = { x: event.clientX, y: event.clientY }
  const pointer = { ...origin }
  // An item with a context menu shares one hold with it, as an iOS preview: the drag waits for the menu, and once
  // the menu stands the finger moving on closes it and drags the item
  const menu = touch ? heldContextMenu(event.target, source) : undefined
  let lifted: { x: number; y: number; close: () => void } | undefined
  const holdTimer = touch && !menu ? setTimeout(begin, TOUCH_HOLD) : undefined
  const style = getComputedStyle(list)
  const part = parseFloat(layout === "grid" ? style.columnGap : style.rowGap) ? PART : 0
  const scroller = scrollParent(list)
  const { group } = list.dataset
  const targets = group ? `[data-sortable-target="${CSS.escape(group)}"]` : undefined
  let drag:
    | {
        chip: HTMLElement
        line: HTMLElement
        width: number
        height: number
        areas: Area[]
        frame?: number
        found?: Found
        under?: Element | null
        target?: HTMLElement
        rest?: ReturnType<typeof setTimeout>
      }
    | undefined

  window.addEventListener("pointermove", onMove)
  window.addEventListener("pointerup", onUp)
  window.addEventListener("pointercancel", onCancel)
  window.addEventListener("blur", cancel)
  menu?.addEventListener(CONTEXT_MENU_HOLD, onMenuHold)

  function onMenuHold(holdEvent: Event) {
    const hold = (holdEvent as CustomEvent<ContextMenuHold>).detail
    if (hold.pointerId !== pointerId || lifted || drag) return
    lifted = { x: pointer.x, y: pointer.y, close: hold.close }
    // The finger now holds the preview: moving it drags, the page under it stays
    window.addEventListener("touchmove", blockScroll, { passive: false })
  }

  function onMove(event: PointerEvent) {
    if (event.pointerId !== pointerId) return
    if (!validSource()) { cancel(); return }
    const { clientX, clientY } = event
    pointer.x = clientX
    pointer.y = clientY
    if (drag) return
    if (lifted) {
      if (Math.hypot(clientX - lifted.x, clientY - lifted.y) < START_DISTANCE) return
      lifted.close()
      begin()
      return
    }
    const travel = Math.hypot(clientX - origin.x, clientY - origin.y)
    // Before the menu opens, a touch that moves as far as the menu lets it scrolls
    if (menu) {
      if (travel > CONTEXT_MENU_LONG_PRESS_SLOP) stopListening()
      return
    }
    const moved = travel >= START_DISTANCE
    if (moved && touch) stopListening()
    else if (moved) begin()
  }

  function onUp(event: PointerEvent) {
    if (event.pointerId === pointerId) finish(true)
  }

  function onCancel(event: PointerEvent) {
    if (event.pointerId === pointerId) cancel()
  }

  function onKey(keyEvent: KeyboardEvent) {
    if (keyEvent.key !== "Escape") return
    keyEvent.stopPropagation()
    finish(false)
  }

  function blockScroll(touchEvent: TouchEvent) {
    touchEvent.preventDefault()
  }

  function stopListening() {
    clearTimeout(holdTimer)
    menu?.removeEventListener(CONTEXT_MENU_HOLD, onMenuHold)
    window.removeEventListener("pointermove", onMove)
    window.removeEventListener("pointerup", onUp)
    window.removeEventListener("pointercancel", onCancel)
    window.removeEventListener("blur", cancel)
    if (activeDrags.get(doc) === cancel) activeDrags.delete(doc)
    window.removeEventListener("keydown", onKey, true)
    window.removeEventListener("touchmove", blockScroll)
  }

  // Only onto a target: the list has no gaps to drop in, so nothing parts, no line shows and a drop elsewhere puts
  // the item back
  const onlyTargets = reachOf(list) === "targets"

  function measure() {
    return listsOf(list).map((entry) => {
      const items = itemsOf(entry)
      entry.setAttribute("data-dragging", "")
      return {
        list: entry, items,
        slots: onlyTargets ? [] : layout === "grid" ? gridSlots(entry, items) : listSlots(entry, items),
        scrollLeft: entry.scrollLeft, scrollTop: entry.scrollTop,
      }
    })
  }

  function begin() {
    if (!validSource()) { cancel(); return }
    const areas = measure()
    window.getSelection()?.removeAllRanges()
    document.documentElement.classList.add(s.Dragging)
    source.setAttribute("data-sortable-source", "")
    window.addEventListener("keydown", onKey, true)
    window.addEventListener("touchmove", blockScroll, { passive: false })
    const chip = makeChip(source)
    const line = document.createElement("div")
    line.className = s.Line
    line.hidden = true
    document.body.append(line)
    const { width, height } = chip.getBoundingClientRect()
    drag = { chip, line, width, height, areas }
    tick()
  }

  function tick() {
    if (!drag) return
    if (!validSource()) { cancel(); return }
    drag.under = targets ? document.elementFromPoint(pointer.x, pointer.y) : undefined
    autoScroll()
    update()
    drag.frame = requestAnimationFrame(tick)
  }

  /** A reachable list or target scrolls in its own pane, not the source pane. */
  function panelUnder() {
    const panel = drag?.under ? scrollParent(drag.under) : undefined
    if (!panel || panel === scroller) return undefined
    const acceptsList = drag?.areas.some(({ list: entry }) =>
      entry.isConnected && !entry.hasAttribute("data-disabled") && panel.contains(entry))
    const acceptsTarget = targets && panel.querySelector(targets)
    return acceptsList || acceptsTarget ? panel : undefined
  }

  function autoScroll() {
    const area = panelUnder() ?? scroller
    const box = area?.getBoundingClientRect() ?? { top: 0, bottom: window.innerHeight }
    const above = box.top + SCROLL_EDGE - pointer.y
    const below = pointer.y - box.bottom + SCROLL_EDGE
    const step = above > 0 ? -scrollStep(above) : below > 0 ? scrollStep(below) : 0
    if (!step) return
    if (area) area.scrollTop += step
    else window.scrollBy(0, step)
  }

  function update() {
    if (!drag) return
    drag.chip.style.transform = `translate(${pointer.x - drag.width / 2}px, ${pointer.y - drag.height / 2}px)`
    const target = (targets && drag.under?.closest<HTMLElement>(targets)) || undefined
    if (target !== drag.target) pointAt(target)
    const box = source.getBoundingClientRect()
    const overSource = pointer.x >= box.left && pointer.x <= box.right && pointer.y >= box.top && pointer.y <= box.bottom
    source.toggleAttribute("data-sortable-away", !overSource)
    showGap(target || overSource ? undefined : nearestSlot())
  }

  function pointAt(target: HTMLElement | undefined) {
    if (!drag) return
    clearTimeout(drag.rest)
    drag.target?.removeAttribute("data-over")
    drag.target = target
    if (!target) return
    target.setAttribute("data-over", "")
    drag.rest = setTimeout(() => {
      link?.hold?.(target.dataset.name as string)
      // What the hold changed is drawn two frames on: a list opened, the page jumped
      requestAnimationFrame(() => requestAnimationFrame(() => drag && (drag.areas = measure())))
    }, TARGET_HOLD)
  }

  // Slots retain their measured offsets while the list itself may scroll.
  function slotOrigin(area: Area, box = area.list.getBoundingClientRect()) {
    return {
      left: box.left + area.scrollLeft - area.list.scrollLeft,
      top: box.top + area.scrollTop - area.list.scrollTop,
    }
  }

  function distance(slot: Slot, box: { left: number; top: number }) {
    if (layout === "list") return Math.abs(pointer.y - (box.top + slot.y))
    const top = box.top + slot.y
    return Math.hypot(pointer.x - (box.left + slot.x), Math.max(top - pointer.y, 0, pointer.y - top - slot.length))
  }

  function nearestSlot() {
    if (!drag) return undefined
    let best: Found | undefined
    let closest = Infinity
    for (const area of drag.areas) {
      if (!area.list.isConnected || area.list.hasAttribute("data-disabled")) continue
      const box = area.list.getBoundingClientRect()
      const near =
        pointer.x >= box.left - NEAR_LIST &&
        pointer.x <= box.right + NEAR_LIST &&
        pointer.y >= box.top - NEAR_LIST &&
        pointer.y <= box.bottom + NEAR_LIST
      if (!near) continue
      const origin = slotOrigin(area, box)
      for (const slot of area.slots) {
        const away = distance(slot, origin)
        if (away < closest) {
          closest = away
          best = { area, slot }
        }
      }
    }
    if (!best) return undefined
    const index = best.area.items.indexOf(source)
    return index >= 0 && (best.slot.gap === index || best.slot.gap === index + 1) ? undefined : best
  }

  function shift(slot: Slot | undefined, by: number) {
    const move = (item: Element | undefined, offset: number) => {
      if (!item || !part) return
      ;(item as HTMLElement).style.transform = by
        ? layout === "grid"
          ? `translateX(${offset}px)`
          : `translateY(${offset}px)`
        : ""
    }
    move(slot?.before, -by)
    move(slot?.after, by)
  }

  function showGap(found: Found | undefined) {
    if (!drag) return
    if (found?.slot !== drag.found?.slot) {
      shift(drag.found?.slot, 0)
      shift(found?.slot, part)
    }
    drag.found = found
    drag.line.hidden = !found
    if (!found) return
    const box = slotOrigin(found.area)
    if (layout === "grid") {
      drag.line.style.transform = `translate(${box.left + found.slot.x - 1}px, ${box.top + found.slot.y}px)`
      drag.line.style.height = `${found.slot.length}px`
    } else {
      drag.line.style.transform = `translate(${box.left + found.slot.x}px, ${box.top + found.slot.y - 1}px)`
      drag.line.style.width = `${found.slot.length}px`
    }
  }

  function restoreSource() {
    source.removeAttribute("data-sortable-source")
    source.removeAttribute("data-sortable-away")
  }

  function settle(chip: HTMLElement, item: HTMLElement | undefined = source) {
    const shown = item?.isConnected ? item : undefined
    flyChip(chip, shown?.getBoundingClientRect(), layout)
    if (!reduced() && shown) shown.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: EASING })
  }

  async function land(chip: HTMLElement, areas: Area[], { area, slot: { gap } }: Found, clear: () => void) {
    const from = itemsOf(list).indexOf(source)
    restoreSource()
    if (area.list === list) {
      const to = gap > from ? gap - 1 : gap
      await flip(
        area.items,
        () => {
          clear()
          return commit(from, to)
        },
        source,
      )
      announce(`${nameOf(source)}, ${to + 1} / ${area.items.length}`)
      settle(chip)
      return
    }
    const name = nameOf(source)
    await flip(
      areas.flatMap(({ items }) => items),
      () => {
        clear()
        return link?.move(from, area.list.dataset.name as string, gap)
      },
      source,
    )
    announce(`${name}, ${gap + 1} / ${area.items.length + 1}`)
    // A framework builds the row anew under its new parent
    settle(chip, source.isConnected ? source : itemsOf(area.list)[gap])
  }

  async function dropOn(chip: HTMLElement, areas: Area[], name: string, clear: () => void) {
    const from = itemsOf(list).indexOf(source)
    restoreSource()
    await flip(
      areas.flatMap(({ items }) => items),
      () => {
        clear()
        return link?.move(from, name)
      },
      source,
    )
    flyChip(chip, undefined, layout)
  }

  function finish(drop: boolean, dispose = false) {
    const mayDrop = drop && validSource()
    stopListening()
    if (!drag) return
    const { chip, line, found, areas, frame, target, rest } = drag
    if (frame) cancelAnimationFrame(frame)
    clearTimeout(rest)
    target?.removeAttribute("data-over")
    // The pointer lifts over a row: that click must not act on it
    window.addEventListener("click", swallow, { capture: true, once: true })
    setTimeout(() => window.removeEventListener("click", swallow, { capture: true }))
    line.remove()
    drag = undefined
    // On a drop this waits for the flip to read where the parted items stand
    const clear = () => {
      areas.forEach((area) => area.list.removeAttribute("data-dragging"))
      document.documentElement.classList.remove(s.Dragging)
      shift(found?.slot, 0)
    }
    const targetName = target?.isConnected ? target.dataset.name : undefined
    if (mayDrop && targetName && targetName !== list.dataset.name) {
      void dropOn(chip, areas, targetName, clear)
      return
    }
    if (mayDrop && found && !target && found.area.list.isConnected && !found.area.list.hasAttribute("data-disabled")) {
      void land(chip, areas, found, clear)
      return
    }
    clear()
    restoreSource()
    if (dispose) chip.remove()
    else settle(chip)
  }

  return cancel
}

/** Starts a drag from a press inside the list. Goes on the list's `pointerdown`. */
export function sortablePointerDown(
  event: PointerEvent,
  list: HTMLElement,
  layout: SortableLayout,
  commit: SortableCommit,
  link?: SortableLink,
) {
  const target = event.target
  if (event.defaultPrevented || event.button || list.hasAttribute("data-disabled")
    || activeDrags.has(list.ownerDocument) || !(target instanceof Element)
    || target.closest("[data-sortable]") !== list) return
  const source = itemOf(list, target)
  if (!source || source.hasAttribute(STATIC)) return
  const handle = target.closest(HANDLE)
  const control = target.closest(INTERACTIVE)
  // A grip in sight is the only way to drag, otherwise anything but a control
  // starts it, and a control that opens its row on a click may let a pull through
  if (source.querySelector(HANDLE) && showsHandles(list) ? !handle : control && !control.closest(GRAB)) return
  return startDrag(event, list, source, layout, !!handle, commit, link)
}

const KEY_STEPS: Record<string, number> = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }

/** Moves the focused handle's item with the arrow keys. Goes on the list's `keydown`. */
export async function sortableKeyDown(event: KeyboardEvent, list: HTMLElement, commit: SortableCommit, link?: SortableLink) {
  const step = KEY_STEPS[event.key]
  const target = event.target as HTMLElement
  if (!step || event.defaultPrevented || list.hasAttribute("data-disabled") || target.closest("[data-sortable]") !== list) return
  const source = itemOf(list, target)
  if (!source || source.hasAttribute(STATIC) || (target !== source && !target.closest(HANDLE))) return
  // A list that only hands its items to targets has no order to change
  if (reachOf(list) === "targets") return
  const items = itemsOf(list)
  const from = items.indexOf(source)
  const to = from + step
  if (to < 0 || to >= items.length) {
    // Past the end of the list: on to the next list of the group
    const lists = listsOf(list)
    const next = lists[lists.indexOf(list) + step]
    if (!next || !link) return
    event.preventDefault()
    const place = step > 0 ? 0 : itemsOf(next).length
    const name = nameOf(source)
    await flip(lists.flatMap(itemsOf), () => link.move(from, next.dataset.name as string, place))
    const landed = itemsOf(next)[place]
    ;(landed?.querySelector<HTMLElement>(HANDLE) ?? landed)?.focus()
    announce(`${name}, ${place + 1} / ${itemsOf(next).length}`)
    return
  }
  event.preventDefault()
  await flip(items, () => commit(from, to))
  // Moving an element in the document drops its focus
  if (target.isConnected && document.activeElement !== target) target.focus()
  announce(`${nameOf(source)}, ${to + 1} / ${items.length}`)
}
