import { computed, defineComponent, h, onBeforeUnmount, ref, watch, type PropType } from "vue"
import s from "@plexui/styles/components/IndexBar/IndexBar.module.css"

// Vue port of packages/ui/src/components/IndexBar/IndexBar.tsx: the same strip and slider, the same dots on a
// short screen, presses, drags and keys. React's `onSelect` becomes the `select` event.

/**
 * What the bar shows: the index of each title, or `null` for a dot. Every title shows while they fit in `capacity`
 * lines, or while `capacity` is not known (`undefined`). Otherwise the first and the last title keep their places
 * and titles spread evenly between them, a dot in each line between two, as UIKit's index shortens itself on a
 * short screen; two lines hold the first and the last title, one the first, none nothing.
 */
export const indexBarSlots = (count: number, capacity?: number): Array<number | null> => {
  const length = Math.max(0, count)
  if (capacity === undefined || !(capacity >= 0) || length <= capacity) return Array.from({ length }, (_, index) => index)
  if (capacity < 3) return [0, length - 1].slice(0, Math.floor(capacity))
  const lines = capacity % 2 === 0 ? capacity - 1 : capacity
  const shown = (lines + 1) / 2
  const slots: Array<number | null> = []
  for (let i = 0; i < shown; i++) {
    if (i > 0) slots.push(null)
    slots.push(Math.round((i * (length - 1)) / (shown - 1)))
  }
  return slots
}

/**
 * The title under a pointer. A letter is its own title; a dot stands for the titles hidden between the letters
 * on either side, and the finger moves through them across its line.
 */
const indexAt = (rail: HTMLElement, clientY: number, slots: Array<number | null>) => {
  const rect = rail.getBoundingClientRect()
  if (!(rect.height > 0) || slots.length < 1) return undefined
  const offset = ((clientY - rect.top) / rect.height) * slots.length
  const line = Math.min(slots.length - 1, Math.max(0, Math.floor(offset)))
  const slot = slots[line]
  if (slot !== null && slot !== undefined) return slot
  const before = slots[line - 1] ?? 0
  const after = slots[line + 1] ?? before
  const hidden = after - before - 1
  const within = Math.min(1, Math.max(0, offset - line))
  if (hidden < 1) return within < 0.5 ? before : after
  return before + 1 + Math.min(hidden - 1, Math.floor(within * hidden))
}

/**
 * How many lines fit in the strip: its height between the bars of the Page (or the safe areas) over the rail's
 * resolved line height, or `undefined` while the strip is not laid out (hidden from 768px up, or before layout).
 */
const capacityOf = (strip: HTMLElement, rail: HTMLElement | null) => {
  if (!(strip.clientHeight > 0) || !rail) return undefined
  const styles = getComputedStyle(strip)
  const available = strip.clientHeight - parseFloat(styles.paddingTop || "0") - parseFloat(styles.paddingBottom || "0")
  const line = parseFloat(getComputedStyle(rail).lineHeight)
  return line > 0 ? Math.max(0, Math.floor(available / line)) : undefined
}

const IndexBarComponent = defineComponent({
  name: "IndexBar",
  inheritAttrs: false,
  props: {
    /** The `id` of the index bar. */
    id: String,
    /** The titles of the sections, in order: usually letters, such as `"A"` to `"Z"` and `"#"`. */
    items: { type: Array as PropType<string[]>, required: true },
    /** Accessible name of the index bar. @default "Section index" */
    ariaLabel: { type: String, default: "Section index" },
    /** The `id` of the list the index scrolls. */
    ariaControls: String,
  },
  emits: {
    /** The section to show: on a press, on each new letter while dragging, and from the keys (React `onSelect`) */
    select: (item: string, index: number) => typeof item === "string" && typeof index === "number",
    /** The index bar gained focus */
    focus: (event: FocusEvent) => event.type === "focus",
    /** The index bar lost focus */
    blur: (event: FocusEvent) => event.type === "blur",
  },
  setup(props, { attrs, emit }) {
    const current = ref(0)
    const capacity = ref<number | undefined>(undefined)
    const pressed = ref(false)
    const strip = ref<HTMLElement | null>(null)
    const rail = ref<HTMLElement | null>(null)
    let press: { pointerId: number; index: number } | null = null
    let observer: ResizeObserver | null = null
    const count = computed(() => props.items.length)
    const index = computed(() => Math.min(current.value, Math.max(0, count.value - 1)))
    const slots = computed(() => indexBarSlots(count.value, capacity.value))

    // The strip changes with the screen, the rail with the line height.
    watch([strip, rail], ([element, railElement]) => {
      observer?.disconnect()
      observer = null
      if (!element || typeof ResizeObserver === "undefined") return
      const measure = () => { capacity.value = capacityOf(element, railElement) }
      observer = new ResizeObserver(measure)
      observer.observe(element)
      if (railElement) observer.observe(railElement)
      measure()
    }, { flush: "post" })
    onBeforeUnmount(() => observer?.disconnect())

    const select = (next: number) => {
      const item = props.items[next]
      if (item === undefined) return
      current.value = next
      emit("select", item, next)
    }

    const end = () => {
      press = null
      pressed.value = false
    }

    // A gesture ends with its rail: the letters can go away under the finger.
    watch(count, (value) => {
      if (value < 1 && press) end()
    })

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.currentTarget
      if (event.button !== 0 || press || !(target instanceof HTMLElement)) return
      const next = indexAt(target, event.clientY, slots.value)
      if (next === undefined) return
      target.setPointerCapture?.(event.pointerId)
      press = { pointerId: event.pointerId, index: next }
      pressed.value = true
      select(next)
    }

    const handlePointerMove = (event: PointerEvent) => {
      const state = press
      const target = event.currentTarget
      if (!state || state.pointerId !== event.pointerId || !(target instanceof HTMLElement)) return
      const next = indexAt(target, event.clientY, slots.value)
      if (next === undefined || next === state.index) return
      state.index = next
      select(next)
    }

    /** The pointer of the gesture lifted, was cancelled or lost its capture; another pointer ends nothing. */
    const handlePointerEnd = (event: PointerEvent) => {
      if (press?.pointerId === event.pointerId) end()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || slots.value.length < 1) return
      const keys: Record<string, number> = {
        ArrowDown: index.value + 1,
        ArrowRight: index.value + 1,
        ArrowUp: index.value - 1,
        ArrowLeft: index.value - 1,
        Home: 0,
        End: count.value - 1,
        Enter: index.value,
        " ": index.value,
      }
      const target = keys[event.key]
      if (target === undefined) return
      event.preventDefault()
      const next = Math.min(count.value - 1, Math.max(0, target))
      if (next !== index.value || event.key === "Enter" || event.key === " ") select(next)
    }

    return () => {
      if (count.value < 1) return null
      return h("div", { ...attrs, "ref": strip, "class": [s.IndexBar, attrs.class], "data-index-bar": "" }, [
        h("div", {
          "ref": rail,
          "id": props.id,
          "role": "slider",
          "tabindex": 0,
          "aria-orientation": "vertical",
          "aria-valuemin": 1,
          "aria-valuemax": count.value,
          "aria-valuenow": index.value + 1,
          "aria-valuetext": props.items[index.value],
          "aria-label": props.ariaLabel,
          "aria-controls": props.ariaControls,
          // No room for a line between the bars: the bar stays measurable and leaves the focus order.
          "hidden": slots.value.length < 1 ? true : undefined,
          "class": s.Rail,
          "data-pressed": pressed.value ? "" : undefined,
          "onPointerdown": handlePointerDown,
          "onPointermove": handlePointerMove,
          "onPointerup": handlePointerEnd,
          "onPointercancel": handlePointerEnd,
          "onLostpointercapture": handlePointerEnd,
          "onKeydown": handleKeyDown,
          "onFocus": (event: FocusEvent) => emit("focus", event),
          "onBlur": (event: FocusEvent) => emit("blur", event),
        }, slots.value.map((slot, position) => slot === null
          ? h("span", { "key": `dot-${position}`, "class": s.Item, "aria-hidden": "true", "data-dot": "" }, "•")
          : h("span", { "key": slot, "class": s.Item, "aria-hidden": "true", "data-index": slot }, props.items[slot]))),
      ])
    }
  },
})

type IndexBarOwnProps = InstanceType<typeof IndexBarComponent>["$props"]

/** IndexBar props. */
export type IndexBarProps = IndexBarOwnProps

/**
 * The section index of a phone list, as the iOS section index: a column of letters at the trailing edge of the
 * nearest positioned container (a Page), centred between the bars of the Page. A press shows the section of the letter under the
 * finger, and a drag moves through the sections letter by letter. On a short screen every other letter gives
 * way to a dot. It is one slider for assistive technology: Down and Up (or Right and Left) move one section, Home
 * and End go to the first and the last, and Enter or Space shows the current one again. A desktop list has no
 * index, so the bar renders under 768px only.
 */
export const IndexBar = IndexBarComponent
