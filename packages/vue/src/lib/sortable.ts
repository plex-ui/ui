import s from "@plexui/styles/components/Sortable/Sortable.module.css"

// Drag to reorder, for any list of elements. Nothing moves until the drop: the
// item leaves a flat slot and shrinks to a chip at the cursor, a line marks the
// nearest gap, and only the drop changes the order. Items that stand apart part
// at the gap. Rows that touch hold still: their text would run over the hairlines.

export type SortableLayout = "list" | "grid"

/** Applies a move to the list. Resolves once the DOM shows the new order. */
export type SortableCommit = (from: number, to: number) => void | Promise<void>

type Slot = {
  gap: number
  /** Offsets from the list's corner, so a scroll under the drag keeps them true */
  x: number
  y: number
  length: number
  before?: Element
  after?: Element
}

const START_DISTANCE = 4
const TOUCH_HOLD = 200
const SCROLL_EDGE = 80
const SCROLL_SLOW = 4
const SCROLL_FAST = 30
const NEAR_LIST = 40
const LINE_INSET = 16
const PART = 4
// --cubic-enter: an animation here cannot read a CSS variable
const EASING = "cubic-bezier(.19,1,.22,1)"
const HANDLE = "[data-sortable-handle]"
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

const itemsOf = (list: HTMLElement) => [...list.children] as HTMLElement[]

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
  const image = item.querySelector("img")
  if (image) {
    const picture = document.createElement("img")
    picture.className = s.ChipImage
    picture.src = image.currentSrc || image.src
    picture.alt = ""
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

const scrollParent = (list: HTMLElement) => {
  for (let node = list.parentElement; node && node !== document.body; node = node.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight) return node
  }
  return undefined
}

// The nearer the edge the faster: slow to aim at a row, fast across a long list
const scrollStep = (depth: number) =>
  SCROLL_SLOW + (SCROLL_FAST - SCROLL_SLOW) * Math.min(depth / SCROLL_EDGE, 1)

function listSlots(list: HTMLElement, items: HTMLElement[]) {
  const box = list.getBoundingClientRect()
  const rects = items.map((item) => item.getBoundingClientRect())
  return Array.from({ length: items.length + 1 }, (_, gap): Slot => {
    const above = rects[gap - 1]
    const below = rects[gap]
    const y = above && below ? (above.bottom + below.top) / 2 : (below?.top ?? above.bottom)
    return {
      gap,
      x: LINE_INSET,
      y: y - box.top,
      length: box.width - LINE_INSET * 2,
      before: items[gap - 1],
      after: items[gap],
    }
  })
}

// One slot per gap, and two where a line wraps: the end of one line and the start of the next
function gridSlots(list: HTMLElement, items: HTMLElement[]) {
  const box = list.getBoundingClientRect()
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
async function commitWithFlip(items: HTMLElement[], from: number, to: number, commit: SortableCommit, skip?: HTMLElement) {
  const before = new Map(items.map((item) => [item, item.getBoundingClientRect()]))
  await commit(from, to)
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

function startDrag(event: PointerEvent, list: HTMLElement, source: HTMLElement, layout: SortableLayout, immediate: boolean, commit: SortableCommit) {
  const touch = event.pointerType === "touch" && !immediate
  const origin = { x: event.clientX, y: event.clientY }
  const pointer = { ...origin }
  const holdTimer = touch ? setTimeout(begin, TOUCH_HOLD) : undefined
  const style = getComputedStyle(list)
  const part = parseFloat(layout === "grid" ? style.columnGap : style.rowGap) ? PART : 0
  const scroller = scrollParent(list)
  let drag:
    | {
        chip: HTMLElement
        line: HTMLElement
        width: number
        height: number
        items: HTMLElement[]
        slots: Slot[]
        frame?: number
        found?: Slot
      }
    | undefined

  window.addEventListener("pointermove", onMove)
  window.addEventListener("pointerup", onUp)
  window.addEventListener("pointercancel", onCancel)

  function onMove({ clientX, clientY }: PointerEvent) {
    pointer.x = clientX
    pointer.y = clientY
    if (drag) return
    const moved = Math.hypot(clientX - origin.x, clientY - origin.y) >= START_DISTANCE
    if (moved && touch) stopListening()
    else if (moved) begin()
  }

  function onUp() {
    finish(true)
  }

  function onCancel() {
    finish(false)
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
    window.removeEventListener("pointermove", onMove)
    window.removeEventListener("pointerup", onUp)
    window.removeEventListener("pointercancel", onCancel)
    window.removeEventListener("keydown", onKey, true)
    window.removeEventListener("touchmove", blockScroll)
  }

  function begin() {
    const items = itemsOf(list)
    const slots = layout === "grid" ? gridSlots(list, items) : listSlots(list, items)
    window.getSelection()?.removeAllRanges()
    document.documentElement.classList.add(s.Dragging)
    list.setAttribute("data-dragging", "")
    source.setAttribute("data-sortable-source", "")
    window.addEventListener("keydown", onKey, true)
    window.addEventListener("touchmove", blockScroll, { passive: false })
    const chip = makeChip(source)
    const line = document.createElement("div")
    line.className = s.Line
    line.hidden = true
    document.body.append(line)
    const { width, height } = chip.getBoundingClientRect()
    drag = { chip, line, width, height, items, slots }
    tick()
  }

  function tick() {
    if (!drag) return
    autoScroll()
    update()
    drag.frame = requestAnimationFrame(tick)
  }

  function autoScroll() {
    const box = scroller?.getBoundingClientRect() ?? { top: 0, bottom: window.innerHeight }
    const above = box.top + SCROLL_EDGE - pointer.y
    const below = pointer.y - box.bottom + SCROLL_EDGE
    const step = above > 0 ? -scrollStep(above) : below > 0 ? scrollStep(below) : 0
    if (!step) return
    if (scroller) scroller.scrollTop += step
    else window.scrollBy(0, step)
  }

  function update() {
    if (!drag) return
    drag.chip.style.transform = `translate(${pointer.x - drag.width / 2}px, ${pointer.y - drag.height / 2}px)`
    const box = source.getBoundingClientRect()
    const overSource = pointer.x >= box.left && pointer.x <= box.right && pointer.y >= box.top && pointer.y <= box.bottom
    source.toggleAttribute("data-sortable-away", !overSource)
    showGap(overSource ? undefined : nearestSlot())
  }

  function nearestSlot() {
    if (!drag) return undefined
    const box = list.getBoundingClientRect()
    const near =
      pointer.x >= box.left - NEAR_LIST &&
      pointer.x <= box.right + NEAR_LIST &&
      pointer.y >= box.top - NEAR_LIST &&
      pointer.y <= box.bottom + NEAR_LIST
    if (!near) return undefined
    const distance = (slot: Slot) => {
      if (layout === "list") return Math.abs(pointer.y - (box.top + slot.y))
      const top = box.top + slot.y
      return Math.hypot(pointer.x - (box.left + slot.x), Math.max(top - pointer.y, 0, pointer.y - top - slot.length))
    }
    const best = drag.slots.reduce((nearest, slot) => (distance(slot) < distance(nearest) ? slot : nearest))
    const index = drag.items.indexOf(source)
    return best.gap === index || best.gap === index + 1 ? undefined : best
  }

  function shift(slot: Slot | undefined, distance: number) {
    const move = (item: Element | undefined, by: number) => {
      if (!item || !part) return
      ;(item as HTMLElement).style.transform = distance
        ? layout === "grid"
          ? `translateX(${by}px)`
          : `translateY(${by}px)`
        : ""
    }
    move(slot?.before, -distance)
    move(slot?.after, distance)
  }

  function showGap(found: Slot | undefined) {
    if (!drag) return
    if (found !== drag.found) {
      shift(drag.found, 0)
      shift(found, part)
    }
    drag.found = found
    drag.line.hidden = !found
    if (!found) return
    const box = list.getBoundingClientRect()
    if (layout === "grid") {
      drag.line.style.transform = `translate(${box.left + found.x - 1}px, ${box.top + found.y}px)`
      drag.line.style.height = `${found.length}px`
    } else {
      drag.line.style.transform = `translate(${box.left + found.x}px, ${box.top + found.y - 1}px)`
      drag.line.style.width = `${found.length}px`
    }
  }

  function restoreSource() {
    source.removeAttribute("data-sortable-source")
    source.removeAttribute("data-sortable-away")
  }

  function settle(chip: HTMLElement) {
    flyChip(chip, source.isConnected ? source.getBoundingClientRect() : undefined, layout)
    if (!reduced() && source.isConnected) source.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: EASING })
  }

  async function land(chip: HTMLElement, items: HTMLElement[], { gap }: Slot, clear: () => void) {
    const from = items.indexOf(source)
    const to = gap > from ? gap - 1 : gap
    restoreSource()
    const clearAndCommit: SortableCommit = (moved, place) => {
      clear()
      return commit(moved, place)
    }
    await commitWithFlip(items, from, to, clearAndCommit, source)
    announce(`${nameOf(source)}, ${to + 1} / ${items.length}`)
    settle(chip)
  }

  function finish(drop: boolean) {
    stopListening()
    if (!drag) return
    const { chip, line, found, items, frame } = drag
    if (frame) cancelAnimationFrame(frame)
    // The pointer lifts over a row: that click must not act on it
    window.addEventListener("click", swallow, { capture: true, once: true })
    setTimeout(() => window.removeEventListener("click", swallow, { capture: true }))
    line.remove()
    drag = undefined
    // On a drop this waits for the flip to read where the parted items stand
    const clear = () => {
      list.removeAttribute("data-dragging")
      document.documentElement.classList.remove(s.Dragging)
      shift(found, 0)
    }
    if (drop && found) {
      void land(chip, items, found, clear)
      return
    }
    clear()
    restoreSource()
    settle(chip)
  }
}

/** Starts a drag from a press inside the list. Goes on the list's `pointerdown`. */
export function sortablePointerDown(event: PointerEvent, list: HTMLElement, layout: SortableLayout, commit: SortableCommit) {
  const target = event.target as Element
  if (event.button || target.closest("[data-sortable]") !== list) return
  const source = itemOf(list, target)
  if (!source) return
  const handle = target.closest(HANDLE)
  // A grip in sight is the only way to drag, otherwise anything but a control starts it
  if (source.querySelector(HANDLE) && showsHandles(list) ? !handle : target.closest(INTERACTIVE)) return
  startDrag(event, list, source, layout, !!handle, commit)
}

const KEY_STEPS: Record<string, number> = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }

/** Moves the focused handle's item with the arrow keys. Goes on the list's `keydown`. */
export async function sortableKeyDown(event: KeyboardEvent, list: HTMLElement, commit: SortableCommit) {
  const step = KEY_STEPS[event.key]
  const target = event.target as HTMLElement
  if (!step || target.closest("[data-sortable]") !== list) return
  const source = itemOf(list, target)
  if (!source || (target !== source && !target.closest(HANDLE))) return
  const items = itemsOf(list)
  const from = items.indexOf(source)
  const to = from + step
  if (to < 0 || to >= items.length) return
  event.preventDefault()
  await commitWithFlip(items, from, to, commit)
  // Moving an element in the document drops its focus
  if (target.isConnected && document.activeElement !== target) target.focus()
  announce(`${nameOf(source)}, ${to + 1} / ${items.length}`)
}
