import {
  computed,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  watch,
  type ComputedRef,
  type InjectionKey,
  type PropType,
} from "vue"
import { useIsFormControl, useSize } from "../Checkbox/bubbleInput.js"

// Internal: Radix Slider (Root, Track, Range, Thumb) as Plex's Slider uses
// it, rendered the Radix way. Reka's Slider renders different markup (no
// positioning wrapper around the thumb, `data-slider-impl`,
// `--reka-slider-thumb-transform`, its own hidden input), runs its handlers
// before the caller's and has no counterpart for Radix's thumb focus order,
// so the Radix primitive is ported here. Plex always controls the value
// (`values` + `onValueChange`), so Radix's uncontrolled state and
// `onValueCommit` (unused by Plex) are left out.

type SliderOrientation = "horizontal" | "vertical"

type OrientationContext = {
  startEdge: "left" | "bottom"
  endEdge: "right" | "top"
  size: "width" | "height"
  direction: 1
}

type SliderContextValue = {
  values: ComputedRef<number[]>
  min: ComputedRef<number>
  max: ComputedRef<number>
  disabled: ComputedRef<boolean>
  orientation: ComputedRef<SliderOrientation>
  edges: ComputedRef<OrientationContext>
  valueIndexToChange: { current: number }
  /** Thumb elements in mount order (Radix keeps them in a Set) */
  thumbs: Set<HTMLElement>
  /** Index of a thumb among the slider's thumbs, in DOM order (Radix's collection) */
  thumbIndex: (thumb: HTMLElement) => number
}

const SliderContextKey: InjectionKey<SliderContextValue> = Symbol("PlexUISliderPrimitive")

const useSliderContext = () => inject(SliderContextKey)!

const PAGE_KEYS = ["PageUp", "PageDown"]
const ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]
const BACK_KEYS: Record<"from-left" | "from-bottom", string[]> = {
  "from-left": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
  "from-bottom": ["Home", "PageDown", "ArrowDown", "ArrowLeft"],
}

// Radix's left-to-right horizontal and bottom-to-top vertical slider (Plex
// passes neither `dir` nor `inverted`)
const HORIZONTAL: OrientationContext = { startEdge: "left", endEdge: "right", size: "width", direction: 1 }
const VERTICAL: OrientationContext = { startEdge: "bottom", endEdge: "top", size: "height", direction: 1 }

const clampNumber = (value: number, [min, max]: [number, number]) => Math.min(max, Math.max(min, value))

const getNextSortedValues = (prevValues: number[] = [], nextValue: number, atIndex: number) => {
  const nextValues = [...prevValues]
  nextValues[atIndex] = nextValue
  return nextValues.sort((a, b) => a - b)
}

const convertValueToPercentage = (value: number, min: number, max: number) => {
  const maxSteps = max - min
  const percentPerStep = 100 / maxSteps
  const percentage = percentPerStep * (value - min)
  return clampNumber(percentage, [0, 100])
}

const getLabel = (index: number, totalValues: number) => {
  if (totalValues > 2) {
    return `Value ${index + 1} of ${totalValues}`
  } else if (totalValues === 2) {
    return ["Minimum", "Maximum"][index]
  } else {
    return undefined
  }
}

const getClosestValueIndex = (values: number[], nextValue: number) => {
  if (values.length === 1) return 0
  const distances = values.map((value) => Math.abs(value - nextValue))
  const closestDistance = Math.min(...distances)
  return distances.indexOf(closestDistance)
}

const linearScale = (input: readonly [number, number], output: readonly [number, number]) => (value: number) => {
  if (input[0] === input[1] || output[0] === output[1]) return output[0]
  const ratio = (output[1] - output[0]) / (input[1] - input[0])
  return output[0] + ratio * (value - input[0])
}

const getThumbInBoundsOffset = (width: number, left: number, direction: number) => {
  const halfWidth = width / 2
  const halfPercent = 50
  const offset = linearScale([0, halfPercent], [0, halfWidth])
  return (halfWidth - offset(left) * direction) * direction
}

const getStepsBetweenValues = (values: number[]) => values.slice(0, -1).map((value, index) => values[index + 1]! - value)

const hasMinStepsBetweenValues = (values: number[], minStepsBetweenValues: number) => {
  if (minStepsBetweenValues > 0) {
    const stepsBetweenValues = getStepsBetweenValues(values)
    const actualMinStepsBetweenValues = Math.min(...stepsBetweenValues)
    return actualMinStepsBetweenValues >= minStepsBetweenValues
  }
  return true
}

const getDecimalCount = (value: number) => (String(value).split(".")[1] || "").length

const roundValue = (value: number, decimalCount: number) => {
  const rounder = Math.pow(10, decimalCount)
  return Math.round(value * rounder) / rounder
}

const callHandlers = (handlers: unknown, event: Event) => {
  for (const handler of Array.isArray(handlers) ? handlers : [handlers]) {
    if (typeof handler === "function") handler(event)
  }
}

/**
 * Radix `Slider.Root`. `class`, `style` and the caller's `onPointerdown`,
 * `onPointerup` (run before Radix's, which they can cancel), `onFocusin` and
 * `onFocusout` land on the root `<span>`.
 */
export const SliderRoot = defineComponent({
  name: "SliderRoot",
  inheritAttrs: false,
  props: {
    values: { type: Array as PropType<number[]>, required: true },
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    step: { type: Number, required: true },
    disabled: { type: Boolean, default: false },
    orientation: { type: String as PropType<SliderOrientation>, default: "horizontal" },
    minStepsBetweenThumbs: { type: Number, default: 0 },
    onValueChange: Function as PropType<(values: number[]) => void>,
    /** Receives the root element, like React's forwarded ref */
    elementRef: Function as PropType<(element: HTMLElement | null) => void>,
  },
  setup(props, { attrs, slots }) {
    const root = ref<HTMLElement | null>(null)
    const thumbs = new Set<HTMLElement>()
    const valueIndexToChange = { current: 0 }
    let rect: DOMRect | undefined

    const isHorizontal = () => props.orientation === "horizontal"

    const setRoot = (element: unknown) => {
      root.value = (element as HTMLElement | null) ?? null
      props.elementRef?.(root.value)
    }

    provide(SliderContextKey, {
      values: computed(() => props.values),
      min: computed(() => props.min),
      max: computed(() => props.max),
      disabled: computed(() => props.disabled),
      orientation: computed(() => props.orientation),
      edges: computed(() => (isHorizontal() ? HORIZONTAL : VERTICAL)),
      valueIndexToChange,
      thumbs,
      thumbIndex: (thumb) => Array.from(root.value?.querySelectorAll('[role="slider"]') ?? []).indexOf(thumb),
    })

    // Radix's controlled useControllableState: the updater runs against the
    // current prop, and only a new array is reported (focusing the thumb first)
    const updateValues = (value: number, atIndex: number) => {
      const decimalCount = getDecimalCount(props.step)
      const snapToStep = roundValue(Math.round((value - props.min) / props.step) * props.step + props.min, decimalCount)
      const nextValue = clampNumber(snapToStep, [props.min, props.max])
      const prevValues = props.values
      let result = prevValues
      const nextValues = getNextSortedValues(prevValues, nextValue, atIndex)
      if (hasMinStepsBetweenValues(nextValues, props.minStepsBetweenThumbs * props.step)) {
        valueIndexToChange.current = nextValues.indexOf(nextValue)
        const hasChanged = String(nextValues) !== String(prevValues)
        result = hasChanged ? nextValues : prevValues
      }
      if (result !== prevValues) {
        const thumbList = [...thumbs]
        thumbList[valueIndexToChange.current]?.focus()
        props.onValueChange?.(result)
      }
    }

    const getValueFromPointer = (event: PointerEvent) => {
      const element = root.value!
      const bounds = rect || element.getBoundingClientRect()
      rect = bounds
      if (isHorizontal()) {
        const value = linearScale([0, bounds.width], [props.min, props.max])
        return value(event.clientX - bounds.left)
      }
      const value = linearScale([0, bounds.height], [props.max, props.min])
      return value(event.clientY - bounds.top)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Home") {
        if (!props.disabled) updateValues(props.min, 0)
        event.preventDefault()
      } else if (event.key === "End") {
        if (!props.disabled) updateValues(props.max, props.values.length - 1)
        event.preventDefault()
      } else if (PAGE_KEYS.concat(ARROW_KEYS).includes(event.key)) {
        const slideDirection = isHorizontal() ? "from-left" : "from-bottom"
        const isBackKey = BACK_KEYS[slideDirection].includes(event.key)
        const stepDirection = isBackKey ? -1 : 1
        if (!props.disabled) {
          const isPageKey = PAGE_KEYS.includes(event.key)
          const isSkipKey = isPageKey || (event.shiftKey && ARROW_KEYS.includes(event.key))
          const multiplier = isSkipKey ? 10 : 1
          const atIndex = valueIndexToChange.current
          const value = props.values[atIndex]!
          const stepInDirection = props.step * multiplier * stepDirection
          updateValues(value + stepInDirection, atIndex)
        }
        event.preventDefault()
      }
    }

    const handlePointerDown = (event: PointerEvent) => {
      callHandlers(attrs.onPointerdown, event)
      if (event.defaultPrevented) return
      const target = event.target as HTMLElement
      target.setPointerCapture(event.pointerId)
      event.preventDefault()
      if (thumbs.has(target)) {
        target.focus()
      } else {
        const value = getValueFromPointer(event)
        if (!props.disabled) updateValues(value, getClosestValueIndex(props.values, value))
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      const target = event.target as HTMLElement
      if (target.hasPointerCapture(event.pointerId)) {
        const value = getValueFromPointer(event)
        if (!props.disabled) updateValues(value, valueIndexToChange.current)
      }
    }

    const handlePointerUp = (event: PointerEvent) => {
      callHandlers(attrs.onPointerup, event)
      if (event.defaultPrevented) return
      const target = event.target as HTMLElement
      if (target.hasPointerCapture(event.pointerId)) {
        target.releasePointerCapture(event.pointerId)
        rect = undefined
      }
    }

    return () => {
      const { class: className, style, onPointerdown: _down, onPointerup: _up, ...restAttrs } = attrs
      const horizontal = isHorizontal()

      return h(
        "span",
        {
          // Radix renders SliderHorizontal or SliderVertical: switching remounts the slider
          "key": props.orientation,
          "ref": setRoot,
          "dir": horizontal ? "ltr" : undefined,
          "data-orientation": props.orientation,
          "aria-disabled": props.disabled,
          "data-disabled": props.disabled ? "" : undefined,
          "class": className,
          ...restAttrs,
          "style": [
            style,
            { "--radix-slider-thumb-transform": horizontal ? "translateX(-50%)" : "translateY(50%)" },
          ],
          "onKeydown": handleKeyDown,
          "onPointerdown": handlePointerDown,
          "onPointermove": handlePointerMove,
          "onPointerup": handlePointerUp,
        },
        slots.default?.(),
      )
    }
  },
})

/** Radix `Slider.Track` */
export const SliderTrack = defineComponent({
  name: "SliderTrack",
  setup(_props, { slots }) {
    const context = useSliderContext()
    return () =>
      h(
        "span",
        {
          "data-disabled": context.disabled.value ? "" : undefined,
          "data-orientation": context.orientation.value,
        },
        slots.default?.(),
      )
  },
})

/** Radix `Slider.Range` */
export const SliderRange = defineComponent({
  name: "SliderRange",
  inheritAttrs: false,
  setup(_props, { attrs }) {
    const context = useSliderContext()
    return () => {
      const values = context.values.value
      const edges = context.edges.value
      const percentages = values.map((value) => convertValueToPercentage(value, context.min.value, context.max.value))
      const offsetStart = values.length > 1 ? Math.min(...percentages) : 0
      const offsetEnd = 100 - Math.max(...percentages)
      const { style, ...restAttrs } = attrs

      return h("span", {
        "data-orientation": context.orientation.value,
        "data-disabled": context.disabled.value ? "" : undefined,
        ...restAttrs,
        "style": [style, { [edges.startEdge]: `${offsetStart}%`, [edges.endEdge]: `${offsetEnd}%` }],
      })
    }
  },
})

// Radix's SliderBubbleInput: a hidden input whose value follows the thumb's.
// A change sets it through the native setter and dispatches a bubbling
// `input` event, so form listeners see it.
const SliderBubbleInput = defineComponent({
  name: "SliderBubbleInput",
  props: {
    value: { type: Number, default: undefined },
  },
  setup(props) {
    const input = ref<HTMLInputElement | null>(null)

    onMounted(() => {
      // React creates the input by setting its `value` property
      if (input.value && props.value !== undefined) input.value.value = String(props.value)
    })

    watch(
      () => props.value,
      (next, previous) => {
        const element = input.value
        if (!element || previous === next) return
        const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
        if (!setValue) return
        setValue.call(element, next as unknown as string)
        element.dispatchEvent(new Event("input", { bubbles: true }))
      },
      { flush: "post" },
    )

    return () =>
      h("input", {
        "ref": input,
        "style": { display: "none" },
        // React's `defaultValue`, updated on every render
        "^value": props.value === undefined ? undefined : String(props.value),
      })
  },
})

/**
 * Radix `Slider.Thumb`: a positioning `<span>` holding the thumb and, inside
 * a form, a hidden input that reports value changes with an `input` event.
 */
export const SliderThumb = defineComponent({
  name: "SliderThumb",
  inheritAttrs: false,
  props: {
    /** Receives the thumb element, like React's ref */
    elementRef: Function as PropType<(element: HTMLElement | null) => void>,
  },
  setup(props, { attrs }) {
    const context = useSliderContext()
    const thumb = ref<HTMLElement | null>(null)
    // Radix finds the index once the thumb has mounted; until then the thumb is hidden
    const index = ref(-1)
    const isFormControl = useIsFormControl(thumb, () => undefined)
    const size = useSize(() => thumb.value)
    const value = computed<number | undefined>(() => context.values.value[index.value])

    const setThumb = (element: unknown) => {
      thumb.value = (element as HTMLElement | null) ?? null
      props.elementRef?.(thumb.value)
    }

    let registered: HTMLElement | null = null
    onMounted(() => {
      const element = thumb.value
      if (!element) return
      registered = element
      context.thumbs.add(element)
      index.value = context.thumbIndex(element)
    })
    onBeforeUnmount(() => {
      if (registered) context.thumbs.delete(registered)
    })

    const handleFocus = () => {
      context.valueIndexToChange.current = index.value
    }

    return () => {
      const edges = context.edges.value
      const currentValue = value.value
      const percent =
        currentValue === undefined ? 0 : convertValueToPercentage(currentValue, context.min.value, context.max.value)
      const label = getLabel(index.value, context.values.value.length)
      const orientationSize = size.value?.[edges.size]
      const thumbInBoundsOffset = orientationSize
        ? getThumbInBoundsOffset(orientationSize, percent, edges.direction)
        : 0
      const { "aria-label": ariaLabel, style, ...thumbAttrs } = attrs
      const disabled = context.disabled.value

      return h(
        "span",
        {
          style: {
            transform: "var(--radix-slider-thumb-transform)",
            position: "absolute",
            [edges.startEdge]: `calc(${percent}% + ${thumbInBoundsOffset}px)`,
          },
        },
        [
          h("span", {
            "role": "slider",
            "aria-label": (ariaLabel as string | undefined) || label,
            "aria-valuemin": context.min.value,
            "aria-valuenow": currentValue,
            "aria-valuemax": context.max.value,
            "aria-orientation": context.orientation.value,
            "data-orientation": context.orientation.value,
            "data-disabled": disabled ? "" : undefined,
            "tabindex": disabled ? undefined : 0,
            ...thumbAttrs,
            "ref": setThumb,
            "style": currentValue === undefined ? { display: "none" } : style,
            "onFocus": handleFocus,
          }),
          // Keyed by the index like Radix's, so the input remounts once the
          // index is known (and never reports the initial value)
          isFormControl.value ? h(SliderBubbleInput, { key: index.value, value: currentValue }) : null,
        ],
      )
    }
  },
})
