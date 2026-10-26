import {
  Comment,
  Fragment,
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  watch,
  type PropType,
  type VNode,
  type VNodeArrayChildren,
} from "vue"
import { useBreakpoint } from "../../composables/useBreakpoints.js"
import { toCssVariables } from "../../lib/helpers.js"
import { Button } from "../Button/index.js"
import { Reload } from "../Icon/index.js"
import { Tooltip } from "../Tooltip/index.js"
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from "./sliderPrimitive.js"
import s from "@plexui/styles/components/Slider/Slider.module.css"

// Vue port of packages/ui/src/components/Slider/Slider.tsx. Props, defaults,
// rendered DOM and behaviour match React (checked by the parity tests).
// - `value` + `update:value` (also `change`, as React calls it `onChange`)
//   support `v-model:value`; the value is a number, or an array with `range`.
// - `label` is a prop or the `label` slot (rich content, e.g. a tooltip).
// - React's `onFocus` / `onBlur` become the `focus` / `blur` emits: from the
//   value input, and from the thumbs (React's bubbling focus events, so
//   `focusin` / `focusout` on the slider root).
// - React reads no other props, so other attributes are not passed on.
// - The slider itself is Radix's, ported in ./sliderPrimitive.ts.

export type SliderMark = {
  value: number
  label: string
}

/** lodash `clamp`: NaN stays NaN */
const clamp = (number: number, lower: number, upper: number) => {
  let result = number
  if (result === result) {
    result = result <= upper ? result : upper
    result = result >= lower ? result : lower
  }
  return result
}

/** lodash `round(number, precision)` */
const round = (number: number, precision: number) => {
  const digits = Math.min(Math.trunc(precision), 292)
  if (!digits || !Number.isFinite(number)) return Math.round(number)
  let pair = `${number}e`.split("e")
  const value = Math.round(Number(`${pair[0]}e${Number(pair[1]) + digits}`))
  pair = `${value}e`.split("e")
  return Number(`${pair[0]}e${Number(pair[1]) - digits}`)
}

/** lodash `debounce(func, wait)` with its defaults: trailing call only */
const debounce = <T>(func: (value: T) => void, wait: number) => {
  let timer: ReturnType<typeof setTimeout> | undefined
  let lastValue: T
  const debounced = (value: T) => {
    lastValue = value
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = undefined
      func(lastValue)
    }, wait)
  }
  debounced.cancel = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }
  return debounced
}

const hasContent = (nodes: VNodeArrayChildren | undefined): boolean =>
  !!nodes?.some((node) => {
    if (node == null || typeof node === "boolean") return false
    if (Array.isArray(node)) return hasContent(node)
    if (typeof node !== "object") return node !== ""
    const vnode = node as VNode
    if (vnode.type === Comment) return false
    if (vnode.type === Fragment) return hasContent(vnode.children as VNodeArrayChildren)
    return true
  })

type ResizeEntryBox = "contentBoxSize" | "borderBoxSize" | "devicePixelContentBoxSize"

// Same reading as usehooks-ts' useResizeObserver (content-box)
const extractSize = (entry: ResizeObserverEntry, box: ResizeEntryBox, sizeType: "inlineSize" | "blockSize") => {
  const boxSize = entry[box] as ResizeObserverSize[] | ResizeObserverSize | undefined
  if (!boxSize) {
    if (box === "contentBoxSize") {
      return entry.contentRect[sizeType === "inlineSize" ? "width" : "height"]
    }
    return undefined
  }
  return Array.isArray(boxSize) ? boxSize[0]![sizeType] : boxSize[sizeType]
}

// The minimum difference we enforce between marks, in pixels
const MINIMUM_MARK_SPACING_PX = 16

const SliderMarks = defineComponent({
  name: "SliderMarks",
  props: {
    marks: { type: Array as PropType<SliderMark[]>, required: true },
    getThumb: { type: Function as PropType<() => HTMLElement | null>, required: true },
    min: { type: Number, required: true },
    max: { type: Number, required: true },
  },
  setup(props) {
    // We seperate the container and measure divs so that our resize observer
    // does not fire when we adjust the height of the marks container.
    const marksContainerRef = ref<HTMLDivElement | null>(null)
    const measureRef = ref<HTMLDivElement | null>(null)

    // We measure the width of the slider within this component so that sliders
    // without marks do not pay a performance penalty.
    const sliderWidth = ref<number | undefined>(undefined)
    let observer: ResizeObserver | undefined

    // React's useLayoutEffect on [marks, thumbRef, min, max, sliderWidth]
    const layoutMarks = () => {
      const thumb = props.getThumb()
      const container = marksContainerRef.value

      // Impossible
      if (!thumb || !container) {
        return
      }

      const markElements = Array.from(container.querySelectorAll<HTMLDivElement>("[data-mark]"))

      const thumbHalfWidth = thumb.getBoundingClientRect().width / 2

      // Wipe all styles so we can accurately determine the positions of the marks
      markElements.forEach((markEl) => {
        markEl.style.width = ""
        markEl.style.display = ""
      })

      const width = sliderWidth.value
      const { marks, min, max } = props

      const positionMarks = () => {
        if (!width) {
          return
        }

        markElements.forEach((markEl, index) => {
          const markValue = marks[index]!.value
          const valuePercent = (markValue - min) / (max - min)
          const markWidth = markEl.getBoundingClientRect().width
          const markHalfWidth = markWidth / 2

          // Radix smoothes the width of the thumb over the entire track so
          // that the thumb is always within bounds. We need to duplicate
          // this smoothing so that the marks match the observed breakpoints.
          const smoothedThumb = thumbHalfWidth - valuePercent * (thumbHalfWidth / 0.5)

          // Calculate where we would naively put the mark based on the value
          const naiveLeftOffset = valuePercent * width

          // Add the thumb smoothing, and account for the width of the mark itself
          let left = naiveLeftOffset + smoothedThumb - markHalfWidth

          // Clamp to the left and right bounds of the container
          left = Math.max(0, Math.min(left, width - markWidth))

          markEl.style.left = `${left}px`
        })
      }

      const marksHaveCollisions = () => {
        for (let i = 0; i < markElements.length - 1; i++) {
          const currentRect = markElements[i]!.getBoundingClientRect()
          const nextRect = markElements[i + 1]!.getBoundingClientRect()

          if (currentRect.right + MINIMUM_MARK_SPACING_PX > nextRect.left) {
            return true
          }
        }
        return false
      }

      positionMarks()

      // If we have collisions, try to wrap the content
      if (marksHaveCollisions()) {
        markElements.forEach((markEl) => {
          markEl.style.width = "min-content"
        })

        positionMarks()

        // Hide all marks if we still have collisions
        if (marksHaveCollisions()) {
          markElements.forEach((markEl) => {
            markEl.style.display = "none"
          })
        }
      }

      const tallestHeight = Math.max(...markElements.map((markEl) => markEl.getBoundingClientRect().height))

      // Give our container a height so that we allocate space on the page
      // for the marks and push down other content when we have to wrap
      container.style.height = tallestHeight > 0 ? `${tallestHeight}px` : ""
    }

    onMounted(() => {
      layoutMarks()

      // usehooks-ts useResizeObserver: only a changed content box updates the width
      const measure = measureRef.value
      if (!measure || typeof window === "undefined" || !("ResizeObserver" in window)) {
        return
      }
      const previousSize: { width?: number; height?: number } = { width: undefined, height: undefined }
      observer = new ResizeObserver(([entry]) => {
        const width = extractSize(entry!, "contentBoxSize", "inlineSize")
        const height = extractSize(entry!, "contentBoxSize", "blockSize")
        if (previousSize.width === width && previousSize.height === height) {
          return
        }
        previousSize.width = width
        previousSize.height = height
        sliderWidth.value = width
      })
      observer.observe(measure, { box: "content-box" })
    })

    onBeforeUnmount(() => {
      observer?.disconnect()
    })

    watch([() => props.marks, () => props.min, () => props.max, sliderWidth], layoutMarks, { flush: "post" })

    return () =>
      h("div", { class: s.MarksContainer, ref: marksContainerRef }, [
        h(
          "div",
          { ref: measureRef },
          props.marks.map((mark) =>
            h("div", { "key": mark.value, "class": s.Mark, "data-mark": "true" }, [
              h("span", { class: s.MarkLabel }, mark.label),
            ]),
          ),
        ),
      ])
  },
})

const SliderComponent = defineComponent({
  name: "Slider",
  inheritAttrs: false,
  props: {
    /** The minimum value the slider can have */
    min: { type: Number, required: true },
    /** The maximum value the slider can have */
    max: { type: Number, required: true },
    /** The step increment between slider values */
    step: { type: Number, required: true },
    /**
     * The current value: a number, or an array of values (one per thumb)
     * with `range`. Bind with `v-model:value`.
     */
    value: { type: [Number, Array] as PropType<number | number[]>, required: true },
    /** When true, the slider has one thumb per value of the `value` array. @default false */
    range: { type: Boolean, default: false },
    /** Unit to display next to the slider value (e.g., ms, px) */
    unit: String,
    /** Unit to display before the slider value (e.g., $) */
    prefixUnit: String,
    /** Label for the slider; the `label` slot takes rich content */
    label: String,
    /** List of marks to display below the slider track (horizontal only) */
    marks: Array as PropType<SliderMark[]>,
    /** Color of the slider track */
    trackColor: String,
    /** Color of the slider progress along the track */
    rangeColor: String,
    /** Disables the slider and its value input. @default false */
    disabled: { type: Boolean, default: false },
    /** Orientation of the slider. @default "horizontal" */
    orientation: { type: String as PropType<"horizontal" | "vertical">, default: "horizontal" },
    /** Value offered as a "reset to default" option (single thumb only) */
    resetValue: Number,
    /** Text of the reset button's tooltip (single thumb only). @default "Reset to default" */
    resetTooltip: String,
    /** Minimum number of steps between thumbs (range only) */
    minStepsBetweenThumbs: Number,
  },
  emits: {
    /** The value changed (`v-model:value`): a number, or an array with `range` */
    "update:value": (_value: number | number[]) => true,
    /** Same payload as `update:value`, named after React's `onChange` */
    "change": (_value: number | number[]) => true,
    /** The value input or a thumb gained focus */
    "focus": (_event: FocusEvent) => true,
    /** The value input or a thumb lost focus */
    "blur": (_event: FocusEvent) => true,
  },
  setup(props, { attrs, slots, emit, expose }) {
    const id = useId()
    const isRange = () => props.range === true
    const precision = computed(() => String(props.step).split(".")[1]?.length ?? 0)

    const reportChange = (value: number | number[]) => {
      emit("update:value", value)
      emit("change", value)
    }

    // Single-mode state for editable input
    const inputValue = ref<string>(isRange() ? "" : String((props.value as number).toFixed(precision.value)))
    const setInputValueNumber = (nextValue: number) => {
      inputValue.value = nextValue.toFixed(precision.value)
    }

    // prevents input from jumping around while the user is typing
    const debouncedOnChange = debounce((value: number) => reportChange(value), 250)
    // React's useDebounceCallback means to cancel on unmount (and misses);
    // Vue drops emits after unmount anyway
    onBeforeUnmount(() => debouncedOnChange.cancel())

    const pointerDown = ref(false)
    const isMounted = ref(false)

    // Used to position the input over the thumb
    const isTabletAndUp = useBreakpoint("md")
    const inputRef = ref<HTMLInputElement | null>(null)
    const rootRef = ref<HTMLElement | null>(null)
    // We assume that the width of the thumb does not change from render to render
    let thumbElement: HTMLElement | null = null
    const setRoot = (element: HTMLElement | null) => {
      rootRef.value = element
    }
    const setThumb = (element: HTMLElement | null) => {
      thumbElement = element
    }
    const getThumb = () => thumbElement

    expose({ root: rootRef })

    // Calculate animation duration based on the distance the thumb needs to move
    // Skip custom animation for range mode: let Radix handle it
    const percent = computed(() => (isRange() ? 0 : ((props.value as number) - props.min) / (props.max - props.min)))
    // Plex's usePrevious: the value moves into the ref when the effect of the
    // previous value is cleaned up, i.e. after a commit that changed it
    let previousPercent = percent.value
    watch(
      percent,
      (_next, previous) => {
        previousPercent = previous
      },
      { flush: "post" },
    )

    // Sort marks for collision detection (re-sorted only when their count changes, as in React)
    let sortedMarks: SliderMark[] = []
    let sortedMarksLength = -1
    const getMarks = () => {
      const propMarks = props.marks ?? []
      if (propMarks.length !== sortedMarksLength) {
        sortedMarks = [...propMarks].sort((a, b) => a.value - b.value)
        sortedMarksLength = propMarks.length
      }
      return sortedMarks
    }

    // Validate marks
    const validateMarks = () => {
      const markValues = new Set<number>()
      for (const mark of getMarks()) {
        if (mark.value < props.min || mark.value > props.max) {
          throw new Error(`Slider mark value ${mark.value} is out of bounds [${props.min}, ${props.max}]`)
        }
        if (markValues.has(mark.value)) {
          throw new Error("Slider marks must have unique values")
        }
        markValues.add(mark.value)
      }
    }

    // Update value if out of bounds (single mode only)
    const clampOutOfBounds = () => {
      if (isRange()) return
      const v = props.value as number
      const clamped = clamp(v, props.min, props.max)
      if (clamped !== v) {
        reportChange(clamped)
        setInputValueNumber(clamped)
      }
    }

    const syncInputValue = () => {
      if (isRange()) return
      if (inputRef.value !== document.activeElement) {
        setInputValueNumber(props.value as number)
      }
    }

    // React's mount effects, in their order
    onMounted(() => {
      isMounted.value = true
      validateMarks()
      clampOutOfBounds()
      syncInputValue()
    })
    watch([() => props.marks?.length ?? 0, () => props.min, () => props.max], validateMarks, { flush: "post" })
    watch([() => props.min, () => props.max, precision, isRange], clampOutOfBounds, { flush: "post" })
    watch([() => props.value, precision, isRange], syncInputValue, { flush: "post" })

    // Single-mode keyboard handler
    const handleKeyDown = (evt: KeyboardEvent) => {
      if (isRange()) return
      const singleValue = props.value as number
      const { min, max, step } = props
      if (evt.key === "Home") {
        evt.preventDefault()
        reportChange(min)
        setInputValueNumber(min)
      }
      if (evt.key === "End") {
        evt.preventDefault()
        reportChange(max)
        setInputValueNumber(max)
      }
      if (evt.key === "ArrowUp") {
        evt.preventDefault()
        const multiplier = evt.shiftKey ? 10 : 1
        const next = clamp(singleValue + step * multiplier, min, max)
        reportChange(next)
        setInputValueNumber(next)
      }
      if (evt.key === "ArrowDown") {
        evt.preventDefault()
        const multiplier = evt.shiftKey ? 10 : 1
        const next = clamp(singleValue - step * multiplier, min, max)
        reportChange(next)
        setInputValueNumber(next)
      }
      if (evt.key === "Enter" || evt.key === "Escape") {
        evt.preventDefault()
        ;(evt.currentTarget as HTMLInputElement).blur()
      }
    }

    const handleInputChange = (evt: Event) => {
      if (isRange()) return
      const target = evt.currentTarget as HTMLInputElement
      // React strips the first non-numeric character only (no `g` flag)
      const nextValue = target.value.replace(/[^\d.]/, "").trim()
      let parsed = parseFloat(nextValue || "0")
      parsed = clamp(parsed, props.min, props.max)
      if (props.step >= 1) {
        parsed = Math.floor(parsed)
      }
      debouncedOnChange(parsed)
      inputValue.value = nextValue
      // A controlled React input shows its state again after the event
      if (target.value !== nextValue) target.value = nextValue
    }

    const handleInputBlur = (evt: FocusEvent) => {
      if (isRange()) return
      let parsed = parseFloat((evt.target as HTMLInputElement).value.trim()) || 0
      if (props.step >= 1) {
        parsed = Math.floor(parsed)
      } else {
        parsed = round(parsed, precision.value)
      }
      parsed = clamp(parsed, props.min, props.max)
      if (parsed !== (props.value as number)) {
        reportChange(parsed)
      }
      setInputValueNumber(parsed)
      emit("blur", evt)
    }

    const handleInputFocus = (evt: FocusEvent) => {
      const target = evt.currentTarget as HTMLInputElement
      target.setSelectionRange(0, target.value.length)
      emit("focus", evt)
    }

    // Radix value/onChange wiring
    const handleValueChange = (values: number[]) => reportChange(isRange() ? values : values[0]!)

    return () => {
      // Read every piece of state, as a React render depends on all of them
      const currentInputValue = inputValue.value
      const isPointerDown = pointerDown.value
      const mounted = isMounted.value
      const tabletAndUp = isTabletAndUp.value

      const { min, max, unit, prefixUnit, trackColor, rangeColor, disabled, orientation, value } = props
      const range = isRange()
      const isVertical = orientation === "vertical"
      const singleValue = range ? 0 : (value as number)

      // The input width is based on the number of characters in the input / font size
      const inputWidth = Math.max(currentInputValue.length, 1) * (tabletAndUp ? 7.8 : 9.5)

      const animationDurationMS =
        range || !mounted || isPointerDown ? 0 : Math.max(Math.abs(percent.value - previousPercent) * 300, 100)

      const marks = getMarks()

      // Radix value
      const radixValue = range ? (value as number[]) : [value as number]

      // Single-mode props
      const resetValue = !range ? props.resetValue : undefined
      const resetTooltip = !range ? (props.resetTooltip ?? "Reset to default") : undefined

      // Range-mode props
      const minStepsBetweenThumbs = range ? props.minStepsBetweenThumbs : undefined

      // Show marks only in horizontal orientation
      const showMarks = marks.length > 0 && !isVertical

      // Format range display text
      const rangeDisplayText = range
        ? (value as number[]).map((v) => `${prefixUnit ?? ""}${v.toFixed(precision.value)}${unit ?? ""}`).join(" – ")
        : ""

      const labelSlot = slots.label?.()
      const labelContent = hasContent(labelSlot) ? labelSlot : props.label

      return h("div", { "class": [s.SliderWrap, attrs.class], "data-orientation": orientation }, [
        labelContent
          ? h("div", { class: s.SliderLabel }, [
              h("label", { for: id, class: "flex-1" }, labelContent),
              !range && resetValue !== undefined
                ? h(
                    Tooltip,
                    { content: resetTooltip!, compact: true },
                    {
                      default: () =>
                        h(
                          Button,
                          {
                            "size": "2xs",
                            "variant": "ghost",
                            "color": "secondary",
                            "class": s.Reset,
                            "data-hide": disabled || (resetValue === singleValue && !isPointerDown),
                            "onClick": () => reportChange(resetValue),
                          },
                          { default: () => h(Reload) },
                        ),
                    },
                  )
                : null,
              range
                ? h("span", { class: s.RangeDisplay }, rangeDisplayText)
                : h("div", { class: s.SliderValue, onClick: () => inputRef.value?.focus() }, [
                    prefixUnit ? h("span", { class: s.ValueUnit }, prefixUnit) : null,
                    h("input", {
                      "id": id,
                      "class": s.ValueInput,
                      "ref": inputRef,
                      "style": { width: `${Math.ceil(inputWidth)}px` },
                      "onKeydown": handleKeyDown,
                      // React keeps the `value` attribute in sync with a controlled input
                      "^value": currentInputValue,
                      "value": currentInputValue,
                      "type": "text",
                      "onClick": (e: MouseEvent) => e.stopPropagation(),
                      "onBlur": handleInputBlur,
                      "onFocus": handleInputFocus,
                      "onInput": handleInputChange,
                      "disabled": disabled,
                    }),
                    unit ? h("span", { class: s.ValueUnit }, unit) : null,
                  ]),
            ])
          : null,
        h("div", { class: s.SliderContainer }, [
          h(
            SliderRoot,
            {
              "elementRef": setRoot,
              "class": s.Slider,
              "onValueChange": handleValueChange,
              "min": min,
              "max": max,
              "step": props.step,
              "disabled": disabled,
              "values": radixValue,
              "orientation": orientation,
              "minStepsBetweenThumbs": minStepsBetweenThumbs,
              // React's onFocus / onBlur bubble from the thumbs
              "onFocusin": (evt: FocusEvent) => emit("focus", evt),
              "onFocusout": (evt: FocusEvent) => emit("blur", evt),
              "onPointerdown": () => {
                pointerDown.value = true
              },
              "onPointerup": () => {
                pointerDown.value = false
              },
              "style": toCssVariables({
                "slider-duration": `${animationDurationMS}ms`,
                "slider-track-color": trackColor,
                "slider-range-color": rangeColor,
              }),
            },
            {
              default: () => [
                h(SliderTrack, { class: s.Track }, { default: () => h(SliderRange, { class: s.Range }) }),
                ...(range
                  ? (value as number[]).map((_, i) => h(SliderThumb, { key: i, class: s.Thumb }))
                  : [h(SliderThumb, { class: s.Thumb, elementRef: setThumb })]),
              ],
            },
          ),
          showMarks ? h(SliderMarks, { marks, getThumb, min, max }) : null,
        ]),
      ])
    }
  },
})

type SliderOwnProps = InstanceType<typeof SliderComponent>["$props"]

export type SliderProps = SliderOwnProps & { class?: unknown }

export const Slider = SliderComponent as typeof SliderComponent & { new (): { $props: SliderProps } }
