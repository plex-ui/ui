import { inject, onBeforeUnmount, provide, ref, shallowRef, type ComputedRef, type InjectionKey, type Ref, type ShallowRef } from "vue"

// Radix Menu behaviour (radix-ui DropdownMenu / Menu / RovingFocusGroup) that
// Reka UI implements differently. Reka keeps the root contexts, the popper,
// the dismissable layer, the focus scope and the portal; the items, their
// roving focus, typeahead and the submenu pointer grace area are Radix's,
// ported here so the DOM (tabindex, data-highlighted, data-orientation) and
// the handler order match React.

export const SELECTION_KEYS = ["Enter", " "]
const FIRST_KEYS = ["ArrowDown", "PageUp", "Home"]
const LAST_KEYS = ["ArrowUp", "PageDown", "End"]
export const FIRST_LAST_KEYS = [...FIRST_KEYS, ...LAST_KEYS]
export const isLastKey = (key: string) => LAST_KEYS.includes(key)
export const SUB_OPEN_KEYS = { ltr: [...SELECTION_KEYS, "ArrowRight"], rtl: [...SELECTION_KEYS, "ArrowLeft"] }
export const SUB_CLOSE_KEYS = { ltr: ["ArrowLeft"], rtl: ["ArrowRight"] }
export const ITEM_SELECT = "menu.itemSelect"

export type Direction = "ltr" | "rtl"
export type CheckedState = boolean | "indeterminate"
type Point = { x: number; y: number }
type Polygon = Point[]
type Side = "left" | "right"
export type GraceIntent = { area: Polygon; side: Side }

/** A `{ current }` box, like a React ref: plain state no render depends on. */
export type Box<T> = { current: T }
export const box = <T>(current: T): Box<T> => ({ current })

// ---------------------------------------------------------------------------
// Root (Radix Menu root context)

export type MenuRootInternals = {
  /** Radix `rootContext.onClose`: closes the whole menu */
  onClose: () => void
  /** Set by keydown, cleared by the next pointer event (Radix's isUsingKeyboardRef) */
  isUsingKeyboard: Box<boolean>
  dir: ComputedRef<Direction>
  modal: () => boolean
  /** The root trigger element, focused when the menu closes */
  trigger: ShallowRef<HTMLElement | null>
}

export const MenuRootInternalsKey: InjectionKey<MenuRootInternals> = Symbol("PlexUIMenuRootInternals")

export const useMenuRootInternals = () => {
  const context = inject(MenuRootInternalsKey, null)
  if (!context) throw new Error("Menu components must be wrapped in <Menu />")
  return context
}

/** Radix's keyboard tracking: any keydown, until the next pointer event. */
export const trackKeyboardUse = (isUsingKeyboard: Box<boolean>) => {
  const handlePointer = () => {
    isUsingKeyboard.current = false
  }
  const handleKeyDown = () => {
    isUsingKeyboard.current = true
    document.addEventListener("pointerdown", handlePointer, { capture: true, once: true })
    document.addEventListener("pointermove", handlePointer, { capture: true, once: true })
  }
  document.addEventListener("keydown", handleKeyDown, { capture: true })
  return () => {
    document.removeEventListener("keydown", handleKeyDown, { capture: true })
    document.removeEventListener("pointerdown", handlePointer, { capture: true })
    document.removeEventListener("pointermove", handlePointer, { capture: true })
  }
}

// ---------------------------------------------------------------------------
// One menu level, the root or a submenu (Radix MenuContext)

export type MenuLevel = {
  open: () => boolean
  /** Radix's controlled `setOpen`: reports a change only when it differs */
  onOpenChange: (open: boolean) => void
  /** The level's content element while it is mounted */
  content: ShallowRef<HTMLElement | null>
}

export const MenuLevelKey: InjectionKey<MenuLevel> = Symbol("PlexUIMenuLevel")

export const useMenuLevel = () => {
  const context = inject(MenuLevelKey, null)
  if (!context) throw new Error("Menu components must be wrapped in <Menu />")
  return context
}

// ---------------------------------------------------------------------------
// Submenu (Radix MenuSubContext)

export type MenuSubInternals = {
  triggerId: string
  contentId: string
  trigger: ShallowRef<HTMLElement | null>
}

export const MenuSubInternalsKey: InjectionKey<MenuSubInternals> = Symbol("PlexUIMenuSubInternals")

export const useMenuSubInternals = () => {
  const context = inject(MenuSubInternalsKey, null)
  if (!context) throw new Error("Submenu components must be wrapped in <Sub />")
  return context
}

// ---------------------------------------------------------------------------
// Content (Radix MenuContentContext, the menu collection and the roving focus group)

export type ItemRecord = {
  id: symbol
  element: () => HTMLElement | null
  disabled: () => boolean
}

export type MenuContentContext = {
  register: (item: ItemRecord) => () => void
  /** Items in document order */
  getItems: () => ItemRecord[]
  searchRef: Box<string>
  currentTabStopId: Ref<symbol | null>
  onItemFocus: (id: symbol) => void
  onItemShiftTab: () => void
  onItemEnter: (event: PointerEvent) => void
  onItemLeave: (event: PointerEvent) => void
  onTriggerLeave: (event: PointerEvent) => void
  pointerGraceTimer: Box<number>
  onPointerGraceIntentChange: (intent: GraceIntent | null) => void
}

export const MenuContentContextKey: InjectionKey<MenuContentContext> = Symbol("PlexUIMenuContent")

export const useMenuContentContext = () => {
  const context = inject(MenuContentContextKey, null)
  if (!context) throw new Error("Menu items must be rendered inside <MenuContent /> or <MenuSubContent />")
  return context
}

const byDocumentPosition = (a: ItemRecord, b: ItemRecord) => {
  const elementA = a.element()
  const elementB = b.element()
  if (!elementA || !elementB || elementA === elementB) return 0
  return elementA.compareDocumentPosition(elementB) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
}

/**
 * State and callbacks of one content element (root or submenu): the item
 * collection, typeahead buffer, current tab stop and pointer grace area.
 */
export const provideMenuContentContext = (getContent: () => HTMLElement | null) => {
  const items = new Set<ItemRecord>()
  const searchRef = box("")
  const timer = box(0)
  const currentTabStopId = ref<symbol | null>(null)
  const isTabbingBackOut = ref(false)
  const isClickFocus = box(false)
  const pointerGraceTimer = box(0)
  const pointerGraceIntent = box<GraceIntent | null>(null)
  const pointerDir = box<Side>("right")
  const lastPointerX = box(0)

  const isPointerMovingToSubmenu = (event: PointerEvent) => {
    const isMovingTowards = pointerDir.current === pointerGraceIntent.current?.side
    return isMovingTowards && isPointerInGraceArea(event, pointerGraceIntent.current?.area)
  }

  const getItems = () => Array.from(items).filter((item) => item.element()).sort(byDocumentPosition)

  const context: MenuContentContext = {
    register: (item) => {
      items.add(item)
      return () => items.delete(item)
    },
    getItems,
    searchRef,
    currentTabStopId,
    onItemFocus: (id) => {
      currentTabStopId.value = id
    },
    onItemShiftTab: () => {
      isTabbingBackOut.value = true
    },
    onItemEnter: (event) => {
      if (isPointerMovingToSubmenu(event)) event.preventDefault()
    },
    onItemLeave: (event) => {
      if (isPointerMovingToSubmenu(event)) return
      getContent()?.focus()
      currentTabStopId.value = null
    },
    onTriggerLeave: (event) => {
      if (isPointerMovingToSubmenu(event)) event.preventDefault()
    },
    pointerGraceTimer,
    onPointerGraceIntentChange: (intent) => {
      pointerGraceIntent.current = intent
    },
  }

  provide(MenuContentContextKey, context)
  onBeforeUnmount(() => window.clearTimeout(timer.current))

  const handleTypeaheadSearch = (key: string) => {
    const search = searchRef.current + key
    const enabled = getItems().filter((item) => !item.disabled())
    const currentItem = document.activeElement
    const textOf = (item: ItemRecord) => (item.element()?.textContent ?? "").trim()
    const currentMatch = enabled.find((item) => item.element() === currentItem)
    const values = enabled.map(textOf)
    const nextMatch = getNextMatch(values, search, currentMatch ? textOf(currentMatch) : undefined)
    const newItem = enabled.find((item) => textOf(item) === nextMatch)?.element()

    const updateSearch = (value: string) => {
      searchRef.current = value
      window.clearTimeout(timer.current)
      if (value !== "") timer.current = window.setTimeout(() => updateSearch(""), 1000)
    }
    updateSearch(search)

    if (newItem) {
      setTimeout(() => newItem.focus())
    }
  }

  /** Clears the typeahead buffer (Radix: a blur from a portalled child) */
  const resetSearch = () => {
    window.clearTimeout(timer.current)
    searchRef.current = ""
  }

  /**
   * The content element's own handlers: Radix MenuContentImpl's content
   * props plus the RovingFocusGroup root's, run before Reka's.
   * `isUsingKeyboard` gates the entry focus like MenuContentImpl's
   * `onEntryFocus`.
   */
  const contentHandlers = (isUsingKeyboard: Box<boolean>) => ({
    onKeydown: (event: KeyboardEvent) => {
      // Radix composes this after the items' handlers: it is skipped when one
      // of them already handled the key
      if (event.defaultPrevented) return
      const target = event.target as HTMLElement
      const currentTarget = event.currentTarget as HTMLElement
      const isKeyDownInside = target.closest("[data-reka-menu-content]") === currentTarget
      const isModifierKey = event.ctrlKey || event.altKey || event.metaKey
      const isCharacterKey = event.key.length === 1
      if (isKeyDownInside) {
        // menus should not be navigated using tab key so we prevent it
        if (event.key === "Tab") event.preventDefault()
        if (!isModifierKey && isCharacterKey) handleTypeaheadSearch(event.key)
      }
      // focus first/last item based on key pressed
      if (event.target !== getContent()) return
      if (!FIRST_LAST_KEYS.includes(event.key)) return
      event.preventDefault()
      const candidateNodes = getItems()
        .filter((item) => !item.disabled())
        .map((item) => item.element())
        .filter((element): element is HTMLElement => !!element)
      if (isLastKey(event.key)) candidateNodes.reverse()
      focusFirst(candidateNodes)
    },
    onPointermove: whenMouse((event) => {
      const target = event.target as HTMLElement
      const pointerXHasChanged = lastPointerX.current !== event.clientX
      // We don't use `event.movementX` for this check because Safari will
      // always return `0` on a pointer event.
      if ((event.currentTarget as HTMLElement).contains(target) && pointerXHasChanged) {
        pointerDir.current = event.clientX > lastPointerX.current ? "right" : "left"
        lastPointerX.current = event.clientX
      }
    }),
    // RovingFocusGroup root: entry focus moves to the first item when the
    // content is focused from the keyboard
    onMousedown: () => {
      isClickFocus.current = true
    },
    onFocusin: (event: FocusEvent) => {
      const isKeyboardFocus = !isClickFocus.current
      if (event.target === event.currentTarget && isKeyboardFocus && !isTabbingBackOut.value) {
        if (isUsingKeyboard.current) {
          const focusable = getItems().filter((item) => !item.disabled())
          const currentItem = focusable.find((item) => item.id === currentTabStopId.value)
          const candidates = [currentItem, ...focusable].filter((item): item is ItemRecord => !!item)
          focusFirst(candidates.map((item) => item.element()).filter((element): element is HTMLElement => !!element))
        }
      }
      isClickFocus.current = false
    },
    onFocusout: () => {
      isTabbingBackOut.value = false
    },
  })

  return { context, contentHandlers, resetSearch }
}

// ---------------------------------------------------------------------------
// Radix helpers

export const whenMouse =
  <E extends PointerEvent>(handler: (event: E) => void) =>
  (event: E) =>
    event.pointerType === "mouse" ? handler(event) : undefined

export const focusFirst = (candidates: HTMLElement[]) => {
  const PREVIOUSLY_FOCUSED_ELEMENT = document.activeElement
  for (const candidate of candidates) {
    // if focus is already where we want to go, we don't want to keep going through the candidates
    if (candidate === PREVIOUSLY_FOCUSED_ELEMENT) return
    candidate.focus()
    if (document.activeElement !== PREVIOUSLY_FOCUSED_ELEMENT) return
  }
}

const wrapArray = <T>(array: T[], startIndex: number) =>
  array.map((_, index) => array[(startIndex + index) % array.length]!)

/**
 * The next item matching the typeahead search: repeated characters cycle
 * through items starting with that character, and the current match is
 * skipped for a single character so it moves on.
 */
const getNextMatch = (values: string[], search: string, currentMatch?: string) => {
  const isRepeated = search.length > 1 && Array.from(search).every((char) => char === search[0])
  const normalizedSearch = isRepeated ? search[0]! : search
  const currentMatchIndex = currentMatch ? values.indexOf(currentMatch) : -1
  let wrappedValues = wrapArray(values, Math.max(currentMatchIndex, 0))
  const excludeCurrentMatch = normalizedSearch.length === 1
  if (excludeCurrentMatch) wrappedValues = wrappedValues.filter((v) => v !== currentMatch)
  const nextMatch = wrappedValues.find((value) => value.toLowerCase().startsWith(normalizedSearch.toLowerCase()))
  return nextMatch !== currentMatch ? nextMatch : undefined
}

const isPointInPolygon = (point: Point, polygon: Polygon) => {
  const { x, y } = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const ii = polygon[i]!
    const jj = polygon[j]!
    const xi = ii.x
    const yi = ii.y
    const xj = jj.x
    const yj = jj.y
    // prettier-ignore
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

const isPointerInGraceArea = (event: PointerEvent, area?: Polygon) => {
  if (!area) return false
  return isPointInPolygon({ x: event.clientX, y: event.clientY }, area)
}

const MAP_KEY_TO_FOCUS_INTENT: Record<string, "first" | "last" | "prev" | "next"> = {
  ArrowLeft: "prev",
  ArrowUp: "prev",
  ArrowRight: "next",
  ArrowDown: "next",
  PageUp: "first",
  Home: "first",
  PageDown: "last",
  End: "last",
}

/** RovingFocusGroup's focus intent for a vertical group */
export const getFocusIntent = (event: KeyboardEvent, dir: Direction) => {
  const key =
    dir !== "rtl" ? event.key : event.key === "ArrowLeft" ? "ArrowRight" : event.key === "ArrowRight" ? "ArrowLeft" : event.key
  if (["ArrowLeft", "ArrowRight"].includes(key)) return undefined
  return MAP_KEY_TO_FOCUS_INTENT[key]
}

export const getOpenState = (open: boolean) => (open ? "open" : "closed")
export const isIndeterminate = (checked?: CheckedState) => checked === "indeterminate"
export const getCheckedState = (checked: CheckedState) =>
  isIndeterminate(checked) ? "indeterminate" : checked ? "checked" : "unchecked"

// ---------------------------------------------------------------------------
// Event handler composition

type Handler<E extends Event = Event> = (event: E) => void

/** Calls a Vue listener value (a function or an array of them). */
export const callListener = (listener: unknown, event: Event) => {
  if (Array.isArray(listener)) for (const fn of listener) (fn as Handler)(event)
  else if (typeof listener === "function") (listener as Handler)(event)
}

/**
 * Calls the listener(s) and tells whether one of them called
 * `preventDefault()`, also on an event that was canceled already.
 */
const callListenerTrackingCancel = (listener: unknown, event: Event) => {
  let canceled = false
  const preventDefault = event.preventDefault
  event.preventDefault = function (this: Event) {
    canceled = true
    preventDefault.call(this)
  }
  try {
    callListener(listener, event)
  } finally {
    // Back to the prototype's method
    delete (event as { preventDefault?: unknown }).preventDefault
  }
  return canceled
}

/**
 * Radix's composeEventHandlers: the consumer's handler runs first, ours only
 * when it did not call preventDefault().
 */
export const compose =
  <E extends Event>(consumer: unknown, ours?: Handler<E>, { checkForDefaultPrevented = true } = {}) =>
  (event: E) => {
    callListener(consumer, event)
    if (checkForDefaultPrevented === false || !event.defaultPrevented) ours?.(event)
  }

// ---------------------------------------------------------------------------
// Items (Radix MenuItemImpl + RovingFocusGroupItem)

export type ItemImplHandlers = {
  onClick?: Handler<MouseEvent>
  onClickCapture?: Handler<MouseEvent>
  onPointerdown?: Handler<PointerEvent>
  onPointerup?: Handler<PointerEvent>
  onPointermove?: Handler<PointerEvent>
  onPointerleave?: Handler<PointerEvent>
  onKeydown?: Handler<KeyboardEvent>
  onFocusin?: Handler<FocusEvent>
  onFocusout?: Handler<FocusEvent>
  onMousedown?: Handler<MouseEvent>
}

/**
 * One focusable menu item: registers in the content's collection and
 * returns its attributes plus the handlers of MenuItemImpl and the roving
 * focus item, run after `outer` (the item kind's own handlers) the way Radix
 * composes them.
 */
export const useMenuItemImpl = (disabled: () => boolean) => {
  const contentContext = useMenuContentContext()
  const rootInternals = useMenuRootInternals()
  const element = shallowRef<HTMLElement | null>(null)
  const isFocused = ref(false)
  const id = Symbol("menu-item")

  const unregister = contentContext.register({ id, element: () => element.value, disabled })
  onBeforeUnmount(unregister)

  const setElement = (el: unknown) => {
    const node = el && typeof el === "object" && "$el" in el ? (el as { $el: unknown }).$el : el
    element.value = node instanceof HTMLElement ? node : null
  }

  const attrs = () => ({
    "role": "menuitem",
    "tabindex": contentContext.currentTabStopId.value === id ? 0 : -1,
    "data-orientation": "vertical",
    "data-highlighted": isFocused.value ? "" : undefined,
    "aria-disabled": disabled() || undefined,
    "data-disabled": disabled() ? "" : undefined,
  })

  const rovingKeydown = (event: KeyboardEvent) => {
    if (event.key === "Tab" && event.shiftKey) {
      contentContext.onItemShiftTab()
      return
    }
    if (event.target !== event.currentTarget) return
    const focusIntent = getFocusIntent(event, rootInternals.dir.value)
    if (focusIntent !== undefined) {
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return
      event.preventDefault()
      let candidateNodes = contentContext
        .getItems()
        .filter((item) => !item.disabled())
        .map((item) => item.element())
        .filter((node): node is HTMLElement => !!node)
      if (focusIntent === "last") candidateNodes.reverse()
      else if (focusIntent === "prev" || focusIntent === "next") {
        if (focusIntent === "prev") candidateNodes.reverse()
        const currentIndex = candidateNodes.indexOf(event.currentTarget as HTMLElement)
        // The menu's roving focus group does not loop
        candidateNodes = candidateNodes.slice(currentIndex + 1)
      }
      setTimeout(() => focusFirst(candidateNodes))
    }
  }

  const handlers = (outer: ItemImplHandlers): ItemImplHandlers => ({
    ...outer,
    onPointermove: compose(
      outer.onPointermove,
      whenMouse((event: PointerEvent) => {
        if (disabled()) {
          contentContext.onItemLeave(event)
        } else {
          contentContext.onItemEnter(event)
          if (!event.defaultPrevented) {
            const item = event.currentTarget as HTMLElement
            item.focus({ preventScroll: true })
          }
        }
      }),
    ),
    onPointerleave: compose(
      outer.onPointerleave,
      whenMouse((event: PointerEvent) => contentContext.onItemLeave(event)),
    ),
    onFocusin: (event) => {
      compose(outer.onFocusin, () => {
        isFocused.value = true
      })(event)
      if (!event.defaultPrevented) contentContext.onItemFocus(id)
    },
    onFocusout: compose(outer.onFocusout, () => {
      isFocused.value = false
    }),
    onMousedown: (event) => {
      callListener(outer.onMousedown, event)
      if (event.defaultPrevented) return
      // We prevent focusing non-focusable items on `mousedown`.
      // Even though the item has tabIndex={-1}, that only means take it out of the tab order.
      if (disabled()) event.preventDefault()
      // Safari doesn't focus a button when clicked so we run our logic on mousedown also
      else contentContext.onItemFocus(id)
    },
    onKeydown: compose(outer.onKeydown, rovingKeydown),
  })

  return { element, setElement, attrs, handlers, contentContext, rootInternals }
}

/**
 * Radix MenuItem's select behaviour on top of `useMenuItemImpl`: click,
 * pointer-up selection after a pointer-down elsewhere, Enter / Space.
 */
export const useMenuItemSelect = (
  impl: ReturnType<typeof useMenuItemImpl>,
  disabled: () => boolean,
  onSelect: () => ((event: Event) => void) | undefined,
) => {
  let isPointerDown = false

  const handleSelect = () => {
    const menuItem = impl.element.value
    if (!disabled() && menuItem) {
      const itemSelectEvent = new CustomEvent(ITEM_SELECT, { bubbles: true, cancelable: true })
      menuItem.addEventListener(ITEM_SELECT, (event) => onSelect()?.(event), { once: true })
      menuItem.dispatchEvent(itemSelectEvent)
      if (itemSelectEvent.defaultPrevented) {
        isPointerDown = false
      } else {
        impl.rootInternals.onClose()
      }
    }
  }

  // Whether the click was canceled before it reached the item (capture phase)
  let canceledBeforeItem = false

  /**
   * Handlers of the item itself; `consumer` holds the item's own listeners.
   * `linkComponent`: the item renders a link component (a router link).
   */
  const handlers = (consumer: Record<string, unknown>, linkComponent = false): ItemImplHandlers => ({
    onClickCapture: (event) => {
      callListener(consumer.onClickCapture, event)
      canceledBeforeItem = event.defaultPrevented
    },
    // A canceled click is not selected, as in Radix. A router link component
    // runs its own click handler (which prevents the navigation) before the
    // listeners passed to it, where React's runs after, so a link
    // component's cancel from after the capture phase is its own and is
    // ignored; only the consumer's preventDefault() then skips the selection
    // (also when the link had canceled the event already).
    onClick: (event) => {
      const canceledByLink = linkComponent && event.defaultPrevented && !canceledBeforeItem
      const canceledByConsumer = callListenerTrackingCancel(consumer.onClick, event)
      if (canceledByLink ? canceledByConsumer : event.defaultPrevented) return
      handleSelect()
    },
    onPointerdown: (event) => {
      callListener(consumer.onPointerdown, event)
      isPointerDown = true
    },
    onPointerup: compose(consumer.onPointerup, (event: PointerEvent) => {
      // Pointer down can move to a different menu item which should activate it on pointer up.
      // We dispatch a click for selection to allow composition with click based triggers and to
      // prevent Firefox from getting stuck in text selection mode when the menu closes.
      if (!isPointerDown) (event.currentTarget as HTMLElement | null)?.click()
    }),
    onKeydown: compose(consumer.onKeydown, (event: KeyboardEvent) => {
      const isTypingAhead = impl.contentContext.searchRef.current !== ""
      if (disabled() || (isTypingAhead && event.key === " ")) return
      if (SELECTION_KEYS.includes(event.key)) {
        ;(event.currentTarget as HTMLElement).click()
        /**
         * We prevent default browser behaviour for selection keys as they should trigger
         * a selection only:
         * - prevents space from scrolling the page.
         * - if keydown causes focus to move, prevents keydown from firing on the new target.
         */
        event.preventDefault()
      }
    }),
  })

  return { handlers }
}

const ITEM_LISTENERS = [
  "onClick",
  "onClickCapture",
  "onPointerdown",
  "onPointerup",
  "onKeydown",
  "onPointermove",
  "onPointerleave",
  "onFocusin",
  "onFocusout",
  "onMousedown",
]

/**
 * Every listener of a selectable item: the element's own `listeners` first,
 * then the item's handlers (the order of Radix's Slot), plus `after`
 * handlers that run between the two for pointer moves and leaves.
 */
export const selectableItemListeners = (
  impl: ReturnType<typeof useMenuItemImpl>,
  select: ReturnType<typeof useMenuItemSelect>,
  listeners: Record<string, unknown>,
  after: { onPointermove?: Handler<PointerEvent>; onPointerleave?: Handler<PointerEvent> } = {},
  linkComponent = false,
) => {
  const own = (key: string) => (event: Event) => callListener(listeners[key], event)
  const chain = (key: "onPointermove" | "onPointerleave") => (event: PointerEvent) => {
    callListener(listeners[key], event)
    after[key]?.(event)
  }
  const rest = Object.fromEntries(Object.entries(listeners).filter(([key]) => !ITEM_LISTENERS.includes(key)))
  return {
    ...rest,
    ...impl.handlers({
      ...select.handlers(listeners, linkComponent),
      onPointermove: chain("onPointermove"),
      onPointerleave: chain("onPointerleave"),
      onFocusin: own("onFocusin"),
      onFocusout: own("onFocusout"),
      onMousedown: own("onMousedown"),
    }),
  }
}

/** Splits Vue attrs into listeners (`onX`) and the rest. */
export const splitListeners = (attrs: Record<string, unknown>) => {
  const listeners: Record<string, unknown> = {}
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (/^on[A-Z]/.test(key)) listeners[key] = value
    else rest[key] = value
  }
  return { listeners, rest }
}
