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
import { hasContent as hasSlotContent } from "../../lib/slotContent.js"
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
// - React's `startAdornment` / `endAdornment` are the slots of those names.
// - `aria-label` / `aria-labelledby` are the `ariaLabel` / `ariaLabelledby` props.
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

/**
 * A press on the track of a range moves the thumb whose value lies nearest the press, which the slider primitive
 * (a port of Radix) focuses only once that value changes. Focusing it at once lets a phone draw the knob being
 * pressed as the lens of glass (Slider.module.css), even when the press leaves the value as it is. The thumb is
 * the one the primitive moves: the pointer mapped onto min to max across the root (from the right in a
 * right-to-left direction; the port maps left to right), the nearest value, the first on a tie. A press on a
 * thumb itself is left to the primitive, which focuses that thumb.
 */
const focusThumbToMove = (event: PointerEvent, root: HTMLElement, values: number[], min: number, max: number, vertical: boolean, rtl: boolean) => {
  const thumbs = Array.from(root.querySelectorAll<HTMLElement>('[role="slider"]'))
  if (thumbs.includes(event.target as HTMLElement)) return
  const rect = root.getBoundingClientRect()
  const ratio = vertical ? (rect.bottom - event.clientY) / rect.height : (rtl ? rect.right - event.clientX : event.clientX - rect.left) / rect.width
  const pointerValue = min + ratio * (max - min)
  const distances = values.map((value) => Math.abs(value - pointerValue))
  const thumb = thumbs[distances.indexOf(Math.min(...distances))]
  if (thumb && thumb !== document.activeElement) thumb.focus({ preventScroll: true, focusVisible: false } as FocusOptions)
}

/** A knob's value from 0 to 1, by which a phone stands the knob on its value as iOS does (Slider.module.css). */
const thumbPercentStyle = (value: number, min: number, max: number) => ({
  "--slider-thumb-percent": String(max > min ? clamp((value - min) / (max - min), 0, 1) : 0),
})

/**
 * Where a knob's centre stands at a value (0 to 1), from the start of a track `width` wide. The primitive (Radix)
 * eases the knob over the whole track to keep it inside; on a phone it stands on the value and stops half its
 * width from each end, as iOS (`clamped`, Slider.module.css).
 */
const thumbCentre = (percent: number, width: number, thumbHalf: number, clamped: boolean) =>
  clamped ? clamp(percent * width, thumbHalf, width - thumbHalf) : percent * width + thumbHalf * (1 - 2 * percent)

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
    // The knob's travel changes at the phone breakpoint (Slider.module.css), also where the width stays
    const tabletAndUp = useBreakpoint("md")
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

      // Its layout width: a pressed knob is scaled into the lens
      const thumbHalfWidth = thumb.offsetWidth / 2
      const clamped = getComputedStyle(thumb).getPropertyValue("--slider-thumb-travel").trim() === "clamped"

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

          // Under the knob's centre at the mark's value, accounting for the width of the mark itself
          let left = thumbCentre(valuePercent, width, thumbHalfWidth, clamped) - markHalfWidth

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
      // Placed against the slider's width: the marks show, at their own height (Slider.module.css)
      if (width) container.dataset.measured = ""
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

    watch([() => props.marks, () => props.min, () => props.max, sliderWidth, tabletAndUp], layoutMarks, { flush: "post" })

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
    /** Accessible name for the slider when there is no visible `label` */
    ariaLabel: String,
    /** Id of an element that names the slider; takes precedence over `label` */
    ariaLabelledby: String,
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
    "update:value": (_value: number | number[]) => { void _value; return true },
    /** Same payload as `update:value`, named after React's `onChange` */
    "change": (_value: number | number[]) => { void _value; return true },
    /** The value input or a thumb gained focus */
    "focus": (_event: FocusEvent) => { void _event; return true },
    /** The value input or a thumb lost focus */
    "blur": (_event: FocusEvent) => { void _event; return true },
  },
  setup(props, { attrs, slots, emit, expose }) {
    const id = useId()
    const labelId = `${id}-label`
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

    // prevents input from jumping around while the user is typing; an
    // immediate change (a key, blur) cancels the pending typed one
    const debouncedOnChange = debounce((value: number) => {
      if (!props.disabled && !isRange()) reportChange(value)
    }, 250)
    // Cancel pending input when its owner unmounts.
    onBeforeUnmount(() => debouncedOnChange.cancel())

    const pointerDown = ref(false)
    // A phone's reset is a button of its own beside the value (below)
    const tabletAndUp = useBreakpoint("md")
    // A press ends where the finger lifts, even when something else takes the pointer away (a sheet that a touch
    // drags, a scroll the browser takes over): the slider's own pointerup never comes then, so the window hears the
    // lift and a lost capture ends the press too.
    let releasePress: (() => void) | null = null
    const endPress = () => {
      releasePress?.()
      releasePress = null
      pointerDown.value = false
    }
    onBeforeUnmount(() => releasePress?.())
    const resetPending = ref(false)
    // Read the controlled owner after a reset request, including a refused request.
    watch([resetPending, () => props.value, isRange], () => {
      if (!resetPending.value) return
      resetPending.value = false
      if (!isRange()) setInputValueNumber(props.value as number)
    }, { flush: "post" })
    watch([() => props.disabled, isRange, () => props.value, precision], () => {
      if (!props.disabled) return
      debouncedOnChange.cancel()
      endPress()
      // A sync watcher runs at each prop as Vue sets them one by one: a disabled range switched to one thumb has
      // range off here while its value is still the array, and the number comes with the next prop
      if (!isRange() && typeof props.value === "number") setInputValueNumber(props.value)
    }, { flush: "sync" })
    const isMounted = ref(false)

    // Used to position the input over the thumb
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
    // Plex's usePrevious: the percent before its latest change (recorded after
    // the render that changed it), the same across renders that keep it
    let lastPercent = percent.value
    let previousPercent = percent.value
    watch(
      percent,
      (next) => {
        previousPercent = lastPercent
        lastPercent = next
      },
      { flush: "post" },
    )
    const getPreviousPercent = () => (Object.is(lastPercent, percent.value) ? previousPercent : lastPercent)

    // Sort marks for collision detection (again only when a value or label changes, as in React)
    const marksKey = () => JSON.stringify((props.marks ?? []).map(({ value, label }) => [value, label]))
    let sortedMarks: SliderMark[] = []
    let sortedMarksKey: string | undefined
    const getMarks = () => {
      const key = marksKey()
      if (key !== sortedMarksKey) {
        sortedMarks = [...(props.marks ?? [])].sort((a, b) => a.value - b.value)
        sortedMarksKey = key
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
    watch([marksKey, () => props.min, () => props.max], validateMarks, { flush: "post" })
    watch([() => props.min, () => props.max, precision, isRange], clampOutOfBounds, { flush: "post" })
    watch([() => props.value, precision, isRange], syncInputValue, { flush: "post" })

    // Single-mode keyboard handler: a key's change replaces a pending typed one
    const handleKeyDown = (evt: KeyboardEvent) => {
      if (props.disabled || isRange()) return
      const singleValue = props.value as number
      const { min, max, step } = props
      if (evt.key === "Home") {
        evt.preventDefault()
        debouncedOnChange.cancel()
        reportChange(min)
        setInputValueNumber(min)
      }
      if (evt.key === "End") {
        evt.preventDefault()
        debouncedOnChange.cancel()
        reportChange(max)
        setInputValueNumber(max)
      }
      if (evt.key === "ArrowUp") {
        evt.preventDefault()
        const multiplier = evt.shiftKey ? 10 : 1
        const next = clamp(singleValue + step * multiplier, min, max)
        debouncedOnChange.cancel()
        reportChange(next)
        setInputValueNumber(next)
      }
      if (evt.key === "ArrowDown") {
        evt.preventDefault()
        const multiplier = evt.shiftKey ? 10 : 1
        const next = clamp(singleValue - step * multiplier, min, max)
        debouncedOnChange.cancel()
        reportChange(next)
        setInputValueNumber(next)
      }
      if (evt.key === "Enter" || evt.key === "Escape") {
        evt.preventDefault()
        ;(evt.currentTarget as HTMLInputElement).blur()
      }
    }

    const handleInputChange = (evt: Event) => {
      if (props.disabled || isRange()) return
      const target = evt.currentTarget as HTMLInputElement
      // Mobile decimal keyboards may use a comma. A minus is valid only below zero.
      const nextValue = target.value.trim().replace(/,/g, ".").replace(props.min < 0 ? /(?!^-)[^\d.]/g : /[^\d.]/g, "")
      debouncedOnChange.cancel()
      let parsed = parseFloat(nextValue || "0")
      if (Number.isNaN(parsed)) {
        // A lone "-" or "." is a number still being typed: nothing to report yet
        inputValue.value = nextValue
        if (target.value !== nextValue) target.value = nextValue
        return
      }
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
      // Blur commits the typed text, so its pending debounced change is dropped
      debouncedOnChange.cancel()
      if (props.disabled) {
        setInputValueNumber(props.value as number)
        emit("blur", evt)
        return
      }
      let parsed = parseFloat((evt.target as HTMLInputElement).value.trim().replace(/,/g, ".")) || 0
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
    const handleValueChange = (values: number[]) => {
      if (props.disabled) return
      debouncedOnChange.cancel()
      reportChange(isRange() ? values : values[0]!)
    }

    return () => {
      // Read every piece of state, as a React render depends on all of them
      const currentInputValue = inputValue.value
      const isPointerDown = pointerDown.value
      const mounted = isMounted.value

      const { min, max, unit, prefixUnit, trackColor, rangeColor, disabled, orientation, value } = props
      const range = isRange()
      const isVertical = orientation === "vertical"
      const singleValue = range ? 0 : (value as number)

      const inputWidth = getValueWidth(currentInputValue)

      const animationDurationMS =
        range || !mounted || isPointerDown ? 0 : Math.max(Math.abs(percent.value - getPreviousPercent()) * 300, 100)

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
      // What names the thumbs: an explicit labelledby, else the visible label
      const nameId = props.ariaLabelledby ?? (labelContent ? labelId : undefined)
      const { ariaLabel } = props

      // With a symbol at either end the container is the middle column of a grid (Slider.module.css), left to right
      // as the primitive slides, so the start symbol stays at the minimum
      const startAdornment = isVertical ? undefined : slots.startAdornment?.()
      const endAdornment = isVertical ? undefined : slots.endAdornment?.()
      // An empty string is no symbol either, as in React
      const hasStart = hasSlotContent(startAdornment)
      const hasEnd = hasSlotContent(endAdornment)
      const wrapAdorned = (container: VNode) =>
        hasStart || hasEnd
          ? h("div", { "class": s.SliderAdorned, "dir": "ltr", "data-disabled": disabled ? "" : undefined }, [
              hasStart ? h("span", { "class": s.Adornment, "data-side": "start", "aria-hidden": "true" }, startAdornment) : null,
              container,
              hasEnd ? h("span", { "class": s.Adornment, "data-side": "end", "aria-hidden": "true" }, endAdornment) : null,
            ])
          : container

      return h("div", { "class": [s.SliderWrap, attrs.class], "data-orientation": orientation }, [
        labelContent
          ? h("div", { class: s.SliderLabel }, [
              // Range mode renders no value input, so the label only names the thumbs
              h("label", { for: range ? undefined : id, id: labelId, class: "flex-1" }, labelContent),
              !range && resetValue !== undefined
                ? h(
                    Tooltip,
                    { content: resetTooltip!, compact: true },
                    {
                      default: () =>
                        h(
                          Button,
                          {
                            // A phone draws the reset as the small round gray button of the iOS 27 kit beside the
                            // row's value: uniform and soft, touch.css makes it the 28px circle that takes touches
                            // 44px around it. A desktop one is the bare glyph that shows on hover.
                            "size": "2xs",
                            "variant": tabletAndUp.value ? "ghost" : "soft",
                            "color": "secondary",
                            "uniform": !tabletAndUp.value,
                            "pill": !tabletAndUp.value,
                            "class": s.Reset,
                            "aria-label": resetTooltip,
                            "disabled": disabled,
                            "data-hide": disabled || (resetValue === singleValue && !isPointerDown),
                            "onClick": () => {
                              if (disabled) return
                              debouncedOnChange.cancel()
                              reportChange(resetValue)
                              resetPending.value = true
                            },
                          },
                          { default: () => h(Reload) },
                        ),
                    },
                  )
                : null,
              range
                ? h("span", { class: s.RangeDisplay }, rangeDisplayText)
                : h("div", { class: s.SliderValue, onClick: () => { if (!disabled) inputRef.value?.focus() } }, [
                    prefixUnit ? h("span", { class: s.ValueUnit }, prefixUnit) : null,
                    h("input", {
                      "id": id,
                      "class": s.ValueInput,
                      "ref": inputRef,
                      "style": { width: inputWidth },
                      "onKeydown": handleKeyDown,
                      // React keeps the `value` attribute in sync with a controlled input
                      "^value": currentInputValue,
                      "value": currentInputValue,
                      "type": "text",
                      "inputmode": min < 0 ? "text" : Number.isInteger(min) && Number.isInteger(max) && Number.isInteger(props.step) ? "numeric" : "decimal",
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
        wrapAdorned(h("div", { class: s.SliderContainer }, [
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
              "onPointerdown": (event: PointerEvent) => {
                if (disabled) return
                pointerDown.value = true
                releasePress?.()
                const { pointerId } = event
                const end = (lift: PointerEvent) => {
                  if (lift.pointerId === pointerId) endPress()
                }
                window.addEventListener("pointerup", end, true)
                window.addEventListener("pointercancel", end, true)
                releasePress = () => {
                  window.removeEventListener("pointerup", end, true)
                  window.removeEventListener("pointercancel", end, true)
                }
                if (range) focusThumbToMove(event, event.currentTarget as HTMLElement, radixValue, props.min, props.max, isVertical, false)
              },
              "onPointerup": endPress,
              "onPointercancel": endPress,
              "onLostpointercapture": endPress,
              "data-pressed": isPointerDown ? "" : undefined,
              "data-range": range ? "" : undefined,
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
                  ? (value as number[]).map((_, i) =>
                      h(SliderThumb, {
                        "key": i,
                        "id": `${id}-thumb-${i}`,
                        "class": s.Thumb,
                        "style": thumbPercentStyle((value as number[])[i]!, props.min, props.max),
                        // The marks measure the first thumb (all thumbs are the same size)
                        "elementRef": i === 0 ? setThumb : undefined,
                        // Name plus the thumb's own Radix name ("Minimum" / "Maximum"),
                        // so the endpoints stay distinguishable
                        "aria-labelledby": nameId ? `${nameId} ${id}-thumb-${i}` : undefined,
                        // Only pass aria-label when set: it replaces the name Radix gives the thumb
                        ...(!nameId && ariaLabel
                          ? { "aria-label": `${ariaLabel} ${rangeThumbName(i, (value as number[]).length)}`.trim() }
                          : {}),
                      }),
                    )
                  : [
                      h(SliderThumb, {
                        "class": s.Thumb,
                        "style": thumbPercentStyle(value as number, props.min, props.max),
                        "elementRef": setThumb,
                        "aria-labelledby": nameId,
                        ...(!nameId && ariaLabel ? { "aria-label": ariaLabel } : {}),
                      }),
                    ]),
              ],
            },
          ),
          showMarks ? h(SliderMarks, { marks, getThumb, min, max }) : null,
        ])),
      ])
    }
  },
})

// Matches the names Radix gives range thumbs on its own
const rangeThumbName = (index: number, count: number) =>
  count === 2 ? (index === 0 ? "Minimum" : "Maximum") : count > 2 ? `Value ${index + 1} of ${count}` : ""

type SliderOwnProps = InstanceType<typeof SliderComponent>["$props"]

type SliderBaseProps = Omit<
  SliderOwnProps,
  "range" | "value" | "resetValue" | "resetTooltip" | "minStepsBetweenThumbs" | "onUpdate:value" | "onChange"
> & { class?: unknown }

// As in React, `range` decides the value's type and the props that apply
type SingleSliderProps = SliderBaseProps & {
  /** When false or omitted, the slider has a single thumb */
  range?: false
  /** The current value of the slider (`v-model:value`) */
  value: number
  /** Value offered as a "reset to default" option */
  resetValue?: number
  /** Text of the reset button's tooltip. @default "Reset to default" */
  resetTooltip?: string
  "onUpdate:value"?: (value: number) => void
  onChange?: (value: number) => void
}

type RangeSliderProps = SliderBaseProps & {
  /** The slider has one thumb per value */
  range: true
  /** One value per thumb (`v-model:value`) */
  value: number[]
  /** Minimum number of steps between thumbs */
  minStepsBetweenThumbs?: number
  "onUpdate:value"?: (value: number[]) => void
  onChange?: (value: number[]) => void
}

export type SliderProps = SingleSliderProps | RangeSliderProps

// The component's own `$props` type the value and the callbacks for both
// modes, so its instance type takes `SliderProps` in their place
type SliderInstance = Omit<InstanceType<typeof SliderComponent>, "$props"> & { $props: SliderProps }

export const Slider = SliderComponent as unknown as Omit<typeof SliderComponent, never> & {
  new (): SliderInstance
}

/**
 * The value field is as wide as its characters at any font size: tabular digits are one `ch` each, and a sign,
 * a decimal point or a separator about half of one, so a right-aligned value sits next to its prefix unit.
 */
const getValueWidth = (text: string): string => {
  const digits = text.replace(/[^0-9]/g, "").length
  return `calc(${Math.max(digits + (text.length - digits) / 2, 1)}ch + 1px)`
}
