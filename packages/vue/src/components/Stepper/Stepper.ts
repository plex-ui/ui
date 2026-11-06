import { computed, defineComponent, h, onBeforeUnmount, ref } from "vue"
import s from "@plexui/styles/components/Stepper/Stepper.module.css"
import { Minus, Plus } from "../Icon/index.js"

// Vue port of packages/ui/src/components/Stepper/Stepper.tsx: the same DOM (a spin button with two
// unfocusable segments and an optional hidden input), keys, hold-to-repeat and clamped or wrapped steps.
// React's `value` + `onChange` become `value` + `update:value` (`v-model:value`) and `change`.

/** Delay before a held segment starts repeating, and the time between repeats, in ms. */
const REPEAT_DELAY = 400
const REPEAT_INTERVAL = 100

const decimals = (n: number) => {
  const [, fraction = ""] = String(n).split(".")
  return fraction.length
}

/** The value one step away, clamped to the range or wrapped, without floating point drift. */
export const stepValue = (current: number, direction: 1 | -1, { min, max, step, wrap }: { min: number; max: number; step: number; wrap: boolean }) => {
  const precision = Math.max(decimals(step), decimals(min), decimals(current))
  const next = Number((current + direction * step).toFixed(precision))
  if (next > max) return wrap ? min : max
  if (next < min) return wrap ? max : min
  return next
}

type Segment = "decrement" | "increment"

const StepperComponent = defineComponent({
  name: "Stepper",
  inheritAttrs: false,
  props: {
    /** The `id` of the stepper. */
    id: String,
    /** The controlled value. Bind with `v-model:value`. */
    value: { type: Number, default: undefined },
    /** The value when it is initially rendered. Use when you do not need to control the value. @default min */
    defaultValue: { type: Number, default: undefined },
    /** The lowest value. @default 0 */
    min: { type: Number, default: 0 },
    /** The highest value. @default 100 */
    max: { type: Number, default: 100 },
    /** The amount each step adds or removes. @default 1 */
    step: { type: Number, default: 1 },
    /** A step past `max` continues from `min`, and one below `min` from `max`. @default false */
    wrap: { type: Boolean, default: false },
    /** Holding a segment keeps stepping, as a native stepper does. @default true */
    autoRepeat: { type: Boolean, default: true },
    /** When `true`, prevents the user from interacting with the stepper. */
    disabled: { type: Boolean, default: false },
    /** Fully rounded ends. @default true */
    pill: { type: Boolean, default: true },
    /** Accessible name of the decrement segment. @default "Decrease" */
    decrementLabel: { type: String, default: "Decrease" },
    /** Accessible name of the increment segment. @default "Increase" */
    incrementLabel: { type: String, default: "Increase" },
    /** The name of the stepper. Submits its value with the owning form. */
    name: String,
    /** Accessible name of the value the stepper changes, when no visible label names it. */
    ariaLabel: String,
    /** The `id` of the visible label of the value the stepper changes. */
    ariaLabelledby: String,
    /** The `id` of an element that describes the stepper, such as the text that shows its value. */
    ariaDescribedby: String,
  },
  emits: {
    /** The value changed */
    "update:value": (value: number) => typeof value === "number",
    /** The value changed (React `onChange`) */
    change: (value: number) => typeof value === "number",
    /** The stepper gained focus */
    focus: (event: FocusEvent) => event.type === "focus",
    /** The stepper lost focus */
    blur: (event: FocusEvent) => event.type === "blur",
  },
  setup(props, { attrs, emit }) {
    const internalValue = ref(props.defaultValue ?? props.min)
    const value = computed(() => props.value ?? internalValue.value)
    const pressed = ref<Segment | null>(null)
    let timer: ReturnType<typeof setTimeout> | undefined

    const commit = (next: number) => {
      if (next === value.value) return false
      if (props.value === undefined) internalValue.value = next
      emit("update:value", next)
      emit("change", next)
      return true
    }

    const stepBy = (direction: 1 | -1, times = 1) => {
      let next = value.value
      for (let i = 0; i < times; i++) next = stepValue(next, direction, props)
      return commit(next)
    }

    const stopRepeat = () => {
      clearTimeout(timer)
      timer = undefined
      pressed.value = null
    }
    onBeforeUnmount(stopRepeat)

    const atMin = computed(() => !props.wrap && value.value <= props.min)
    const atMax = computed(() => !props.wrap && value.value >= props.max)

    const startPress = (segment: Segment, event: PointerEvent) => {
      if (event.button !== 0 || props.disabled) return
      if (segment === "decrement" ? atMin.value : atMax.value) return
      const target = event.currentTarget
      if (target instanceof HTMLElement) target.setPointerCapture?.(event.pointerId)
      pressed.value = segment
      const direction = segment === "decrement" ? -1 : 1
      stepBy(direction)
      if (!props.autoRepeat) return
      const repeat = () => {
        if (props.disabled || !stepBy(direction)) return stopRepeat()
        timer = setTimeout(repeat, REPEAT_INTERVAL)
      }
      timer = setTimeout(repeat, REPEAT_DELAY)
    }

    // A pointer steps on press, so only a click without one (assistive technology, `element.click()`) steps here.
    const handleClick = (segment: Segment, event: MouseEvent) => {
      if (event.detail !== 0 || props.disabled) return
      stepBy(segment === "decrement" ? -1 : 1)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (props.disabled || event.altKey || event.ctrlKey || event.metaKey) return
      const keys: Record<string, () => void> = {
        ArrowUp: () => stepBy(1),
        ArrowDown: () => stepBy(-1),
        PageUp: () => stepBy(1, 10),
        PageDown: () => stepBy(-1, 10),
        Home: () => commit(props.min),
        End: () => commit(props.max),
      }
      const action = keys[event.key]
      if (!action) return
      event.preventDefault()
      action()
    }

    const segment = (kind: Segment) => {
      const atEnd = kind === "decrement" ? atMin.value : atMax.value
      return h("button", {
        "type": "button",
        "tabindex": -1,
        "aria-label": kind === "decrement" ? props.decrementLabel : props.incrementLabel,
        "aria-disabled": atEnd || undefined,
        "disabled": props.disabled,
        "class": s.Segment,
        "data-segment": kind,
        "data-disabled": atEnd || props.disabled ? "" : undefined,
        "data-pressed": pressed.value === kind && !props.disabled ? "" : undefined,
        // Keeps the focus where it is, as a native stepper takes none.
        "onMousedown": (event: MouseEvent) => event.preventDefault(),
        "onPointerdown": (event: PointerEvent) => startPress(kind, event),
        "onPointerup": stopRepeat,
        "onPointercancel": stopRepeat,
        "onLostpointercapture": stopRepeat,
        "onClick": (event: MouseEvent) => handleClick(kind, event),
      }, [h(kind === "decrement" ? Minus : Plus, { class: s.Icon })])
    }

    return () => h("div", {
      ...attrs,
      "id": props.id,
      "role": "spinbutton",
      "tabindex": props.disabled ? -1 : 0,
      "aria-valuenow": value.value,
      "aria-valuemin": props.min,
      "aria-valuemax": props.max,
      "aria-label": props.ariaLabel,
      "aria-labelledby": props.ariaLabelledby,
      "aria-describedby": props.ariaDescribedby,
      "aria-disabled": props.disabled || undefined,
      "class": [s.Stepper, attrs.class],
      "data-disabled": props.disabled ? "" : undefined,
      "data-pill": props.pill ? "" : undefined,
      "onKeydown": handleKeyDown,
      "onFocus": (event: FocusEvent) => emit("focus", event),
      "onBlur": (event: FocusEvent) => emit("blur", event),
    }, [
      segment("decrement"),
      h("span", { "class": s.Separator, "aria-hidden": "true" }),
      segment("increment"),
      props.name !== undefined ? h("input", { type: "hidden", name: props.name, value: value.value, disabled: props.disabled }) : null,
    ])
  },
})

type StepperOwnProps = InstanceType<typeof StepperComponent>["$props"]

/** Stepper props. */
export type StepperProps = StepperOwnProps

/**
 * Two segments that decrease and increase a number, as the iOS 26 stepper does. It shows no value of its own:
 * name it with `aria-label` or `aria-labelledby` and show the value beside it. Keyboard focus lands on the
 * stepper, a spin button: Up and Down step, Page Up and Page Down step ten times, Home and End go to the range ends.
 */
export const Stepper = StepperComponent
