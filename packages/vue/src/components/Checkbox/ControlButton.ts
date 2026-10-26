import { defineComponent, h, type PropType } from "vue"

// Internal: the <button> that Checkbox and Switch render through Reka's root
// with `asChild`. Reka merges its own handlers (toggle on click, Enter key
// handling) into these attrs and would run them before the consumer's.
// Radix composes them the other way (composeEventHandlers): the consumer's
// handler runs first, and Radix skips its own when that one called
// preventDefault(). So the consumer's listeners arrive separately in
// `listeners` and are composed that way here.

type Handler = (event: Event) => void
export type Listeners = Record<string, unknown>

export const isListener = (key: string) => /^on[A-Z]/.test(key)

const call = (handler: unknown, event: Event) => {
  if (Array.isArray(handler)) for (const fn of handler) (fn as Handler)(event)
  else if (typeof handler === "function") (handler as Handler)(event)
}

export const ControlButton = defineComponent({
  name: "ControlButton",
  inheritAttrs: false,
  props: {
    /** The consumer's listeners (`onClick`, `onKeydown`, ...), run first */
    listeners: { type: Object as PropType<Listeners>, default: () => ({}) },
    /** Internal work Radix does in the same handler, after Reka's */
    after: { type: Object as PropType<Listeners>, default: () => ({}) },
    /** Reka handlers that Radix does not have */
    drop: { type: Array as PropType<string[]>, default: () => [] },
  },
  setup(props, { attrs, slots }) {
    return () => {
      const handlers: Record<string, Handler> = {}
      const own = Object.keys(attrs).filter(isListener)
      const keys = new Set([...Object.keys(props.listeners), ...own, ...Object.keys(props.after)])

      for (const key of keys) {
        const consumer = props.listeners[key]
        const internal = [props.drop.includes(key) ? undefined : attrs[key], props.after[key]]
        handlers[key] = (event: Event) => {
          call(consumer, event)
          if (event.defaultPrevented) return
          for (const handler of internal) call(handler, event)
        }
      }

      return h("button", { ...attrs, ...handlers }, slots.default?.())
    }
  },
})
