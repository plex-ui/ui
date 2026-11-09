import { defineComponent, h, type Component, type PropType, type Ref } from "vue"

// Radix RovingFocusGroup and composeEventHandlers behaviour on top of Reka's RovingFocusGroup and RovingFocusItem,
// shared by the Radix ToggleGroup ports (Tabs, ToggleGroup).

// Radix RovingFocusGroup's focusFirst
export const focusFirst = (candidates: HTMLElement[]) => {
  const previouslyFocused = document.activeElement
  for (const candidate of candidates) {
    if (candidate === previouslyFocused) return
    candidate.focus({ preventScroll: false })
    if (document.activeElement !== previouslyFocused) return
  }
}

export const callHandlers = (handlers: unknown, event: Event) => {
  for (const handler of Array.isArray(handlers) ? handlers : [handlers]) {
    if (typeof handler === "function") handler(event)
  }
}

// Events a caller's handler called preventDefault() on. React's synthetic
// event reports that call in `defaultPrevented` even when the native event is
// not cancelable (focus), for every later handler of the same event.
const preventedEvents = new WeakSet<Event>()

export const isPrevented = (event: Event) => event.defaultPrevented || preventedEvents.has(event)

export const callCallerHandlers = (handlers: unknown, event: Event) => {
  if (!handlers) return
  const preventDefault = event.preventDefault
  event.preventDefault = () => {
    preventedEvents.add(event)
    preventDefault.call(event)
  }
  try {
    callHandlers(handlers, event)
  } finally {
    Reflect.deleteProperty(event, "preventDefault")
  }
}

// Internal: the element a group and its items render through Reka's
// RovingFocusGroup and RovingFocusItem with `asChild` (Tabs, ToggleGroup). Reka merges its
// handlers into these attrs and would run them before the caller's. Radix
// composes them the other way (composeEventHandlers): the caller's handler
// runs first, and Radix skips its own once the event is default-prevented.
// So the caller's listeners for the `composed` events arrive separately in
// `listeners` and are composed that way here.
// React's onBlur is the bubbling focusout: Radix ends a Shift+Tab out of the group (its tab stop given back to the
// group) once focus leaves any item, where Reka's handler listens to the group's own blur. So Reka's blur handler
// runs on focusout, after the caller's focusout listeners; the caller's blur listeners stay on blur.
const INTERNAL_EVENT: Record<string, string> = { onFocusout: "onBlur" }

export const RovingElement = defineComponent({
  name: "RovingElement",
  inheritAttrs: false,
  props: {
    /** The element, or a component that renders one (such as Button) */
    as: { type: [String, Object] as PropType<string | Component>, required: true },
    elementRef: Object as PropType<Ref<HTMLElement | null>>,
    /** Events whose Reka handler Radix composes after the caller's */
    composed: { type: Array as PropType<string[]>, required: true },
    /** The caller's listeners for the `composed` events */
    listeners: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  setup(props, { attrs, slots }) {
    // The caller's `.once` listeners that have run, by event, as Vue removes a `.once` listener from its element
    // once it has run: a new callback in its place does not run again, one detached and added again does
    const ranOnce = new Set<string>()

    return () => {
      const rest: Record<string, unknown> = { ...attrs }
      // Every composed event gets a listener, a caller's or not, so the element has it from the start: Reka adds
      // its item keydown listener once the item is mounted, after it, so a caller's keydown added later still
      // runs first and can cancel the arrow keys (Reka skips a default-prevented keydown)
      const handlers: Record<string, (event: Event) => void> = {}
      for (const key of props.composed) {
        const onceKey = `${key}Once`
        const caller = props.listeners[key]
        const callerOnce = props.listeners[onceKey]
        if (!callerOnce) ranOnce.delete(onceKey)
        const internal = key === "onBlur" ? undefined : attrs[INTERNAL_EVENT[key] ?? key]
        delete rest[key]
        handlers[key] = (event: Event) => {
          callCallerHandlers(caller, event)
          if (callerOnce && !ranOnce.has(onceKey)) {
            ranOnce.add(onceKey)
            callCallerHandlers(callerOnce, event)
          }
          if (!isPrevented(event)) callHandlers(internal, event)
        }
      }
      const elementProps = { ...rest, ...handlers, ref: props.elementRef }
      // A component takes its content as a slot, an element as children
      return typeof props.as === "string"
        ? h(props.as, elementProps, slots.default?.())
        : h(props.as, elementProps, { default: () => slots.default?.() })
    }
  },
})

/** Splits the caller's listeners for `keys`, `.once` ones (`onFocusOnce`) too, from the other attributes. */
export const splitListeners = (attrs: Record<string, unknown>, keys: string[]) => {
  const listeners: Record<string, unknown> = {}
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (keys.includes(key) || (key.endsWith("Once") && keys.includes(key.slice(0, -4)))) listeners[key] = value
    else rest[key] = value
  }
  return { listeners, rest }
}

// Radix RovingFocusGroup composes mousedown, focus and blur (React's, a focusout); its items
// mousedown, focus and keydown (Reka's keydown is its own listener, which skips a default-prevented event). An
// item's focusout and blur go through the wrapper too: focusout cannot be cancelled natively, and React's item
// onBlur that calls preventDefault keeps the group's Shift+Tab state as the event bubbles to it
export const GROUP_COMPOSED = ["onMousedown", "onFocus", "onBlur", "onFocusout"]
export const ITEM_COMPOSED = ["onMousedown", "onFocus", "onKeydown", "onFocusout", "onBlur"]
