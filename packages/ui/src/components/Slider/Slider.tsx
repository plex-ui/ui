"use client"

import clsx from "clsx"
import clamp from "lodash/clamp"
import round from "lodash/round"
import { Slider as RadixSlider } from "radix-ui"
import {
  type ChangeEventHandler,
  type ElementRef,
  type FocusEventHandler,
  type KeyboardEventHandler,
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useDebounceCallback, useResizeObserver } from "usehooks-ts"
import { useBreakpoint } from "../../hooks/useBreakpoints"
import { useIsMounted } from "../../hooks/useIsMounted"
import { useLatestValue } from "../../hooks/useLatestValue"
import { usePrevious } from "../../hooks/usePrevious"
import { toCssVariables } from "../../lib/helpers"
import { Button } from "../Button"
import { Reload } from "../Icon"
import { Tooltip } from "../Tooltip"
import s from "@plexui/styles/components/Slider/Slider.module.css"

export type SliderMark = {
  value: number
  label: string
}

type SliderBaseProps = {
  /**
   * The minimum value the slider can have
   */
  min: number
  /**
   * The maximum value the slider can have
   */
  max: number
  /**
   * The step increment between slider values
   */
  step: number
  /**
   * Unit to display next to the slider value (e.g., ms, px)
   */
  unit?: string
  /**
   * Unit to display to the right of the slider value (e.g., $)
   */
  prefixUnit?: string
  /**
   * Optional label for the slider, which can be a string or React node.
   */
  label?: ReactNode
  /**
   * Accessible name for the slider when there is no visible `label`
   */
  "aria-label"?: string
  /**
   * Id of an element that names the slider; takes precedence over `label`
   */
  "aria-labelledby"?: string
  /**
   * List of marks to display below the slider track
   */
  marks?: SliderMark[]
  /**
   * Color of the slider track
   */
  trackColor?: string
  /**
   * Color of the slider progress along the track
   */
  rangeColor?: string
  className?: string
  disabled?: boolean
  /**
   * Orientation of the slider
   * @default "horizontal"
   */
  orientation?: "horizontal" | "vertical"
  onBlur?: FocusEventHandler<HTMLInputElement>
  onFocus?: FocusEventHandler<HTMLInputElement>
  ref?: React.Ref<ElementRef<typeof RadixSlider.Root> | null>
}

type SingleSliderProps = SliderBaseProps & {
  /**
   * When false or omitted, the slider has a single thumb
   */
  range?: false
  /**
   * The current value of the slider
   */
  value: number
  /**
   * Callback function invoked when the slider value changes.
   */
  onChange: (value: number) => void
  /**
   * Value that will be offered as a "reset to default" option
   */
  resetValue?: number
  /**
   * String that will be displayed in the tooltip
   * @default Reset to default
   */
  resetTooltip?: string
}

type RangeSliderProps = SliderBaseProps & {
  /**
   * When true, the slider supports multiple thumbs
   */
  range: true
  /**
   * Array of values, one per thumb
   */
  value: number[]
  /**
   * Callback function invoked when slider values change.
   */
  onChange: (value: number[]) => void
  /**
   * Minimum number of steps between thumbs
   */
  minStepsBetweenThumbs?: number
}

export type SliderProps = SingleSliderProps | RangeSliderProps

export const Slider = memo((props: SliderProps) => {
  const {
    className,
    onChange,
    min,
    max,
    step,
    disabled,
    value,
    onBlur,
    onFocus,
    unit,
    prefixUnit,
    label,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    marks: propMarks = [],
    trackColor,
    rangeColor,
    orientation = "horizontal",
    ref: forwardedRef,
  } = props

  const isRange = props.range === true
  const isVertical = orientation === "vertical"

  const id = useId()
  const labelId = `${id}-label`
  // What names the thumbs: an explicit labelledby, else the visible label
  const nameId = ariaLabelledBy ?? (label ? labelId : undefined)
  const precision = useMemo(() => String(step).split(".")[1]?.length ?? 0, [step])

  // Single-mode state for editable input
  const singleValue = isRange ? 0 : (value as number)
  const [inputValue, setInputValue] = useState<string>(
    isRange ? "" : String((value as number).toFixed(precision)),
  )
  const setInputValueNumber = useCallback(
    (nextValue: number) => {
      setInputValue(nextValue.toFixed(precision))
    },
    [precision],
  )

  // prevents input from jumping around while the user is typing
  const singleOnChange = isRange ? undefined : (onChange as (v: number) => void)
  const debouncedOnChange = useDebounceCallback(singleOnChange ?? (() => {}), 250)
  const [pointerDown, setPointerDown] = useState(false)
  const isMounted = useIsMounted()

  // Used to position the input over the thumb
  const isTabletAndUp = useBreakpoint("md")
  const inputRef = useRef<HTMLInputElement>(null)

  // The input width is based on the number of characters in the input / font size
  const inputWidth = Math.max(inputValue.length, 1) * (isTabletAndUp ? 7.8 : 9.5)

  // Calculate animation duration based on the distance the thumb needs to move
  // Skip custom animation for range mode — let Radix handle it
  const percent = isRange ? 0 : ((value as number) - min) / (max - min)
  const previousPercent = usePrevious(percent)
  const animationDurationMS =
    isRange || !isMounted || pointerDown
      ? 0
      : Math.max(Math.abs(percent - previousPercent) * 300, 100)

  // We assume that the width of the thumb does not change from render to render
  const thumbRef = useRef<HTMLDivElement>(null)

  // Sort marks for collision detection
  const marks = useMemo<SliderMark[]>(
    () => [...propMarks].sort((a, b) => a.value - b.value),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [propMarks.length],
  )

  // Validate marks
  useEffect(() => {
    if (!marks) return
    const markValues = new Set<number>()
    for (const mark of marks) {
      if (mark.value < min || mark.value > max) {
        throw new Error(`Slider mark value ${mark.value} is out of bounds [${min}, ${max}]`)
      }
      if (markValues.has(mark.value)) {
        throw new Error("Slider marks must have unique values")
      }
      markValues.add(mark.value)
    }
  }, [marks, max, min])

  // Update value if out of bounds (single mode only)
  const latestValue = useLatestValue(value)
  const latestOnChange = useLatestValue(onChange)
  useEffect(() => {
    if (isRange) return
    const v = latestValue.current as number
    const clamped = clamp(v, min, max)
    if (clamped !== v) {
      ;(latestOnChange.current as (v: number) => void)(clamped)
      setInputValueNumber(clamped)
    }
  }, [max, min, latestValue, latestOnChange, setInputValueNumber, isRange])

  useEffect(() => {
    if (isRange) return
    if (inputRef.current !== document.activeElement) {
      setInputValueNumber(value as number)
    }
  }, [value, setInputValueNumber, isRange])

  // Single-mode keyboard handler
  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (evt) => {
    if (isRange || !singleOnChange) return
    if (evt.key === "Home") {
      evt.preventDefault()
      singleOnChange(min)
      setInputValueNumber(min)
    }
    if (evt.key === "End") {
      evt.preventDefault()
      singleOnChange(max)
      setInputValueNumber(max)
    }
    if (evt.key === "ArrowUp") {
      evt.preventDefault()
      const multiplier = evt.shiftKey ? 10 : 1
      const next = clamp(singleValue + step * multiplier, min, max)
      singleOnChange(next)
      setInputValueNumber(next)
    }
    if (evt.key === "ArrowDown") {
      evt.preventDefault()
      const multiplier = evt.shiftKey ? 10 : 1
      const next = clamp(singleValue - step * multiplier, min, max)
      singleOnChange(next)
      setInputValueNumber(next)
    }
    if (evt.key === "Enter" || evt.key === "Escape") {
      evt.preventDefault()
      evt.currentTarget.blur()
    }
  }

  const handleInputChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    if (isRange || !singleOnChange) return
    const nextValue = evt.currentTarget.value.replace(/[^\d.]/, "").trim()
    let parsed = parseFloat(nextValue || "0")
    parsed = clamp(parsed, min, max)
    if (step >= 1) {
      parsed = Math.floor(parsed)
    }
    debouncedOnChange(parsed)
    setInputValue(nextValue)
  }

  const handleInputBlur: FocusEventHandler<HTMLInputElement> = (evt) => {
    if (isRange || !singleOnChange) return
    let parsed = parseFloat(evt.target.value.trim()) || 0
    if (step >= 1) {
      parsed = Math.floor(parsed)
    } else {
      parsed = round(parsed, precision)
    }
    parsed = clamp(parsed, min, max)
    if (parsed !== singleValue) {
      singleOnChange(parsed)
    }
    setInputValueNumber(parsed)
    onBlur?.(evt)
  }

  // Radix value/onChange wiring
  const radixValue = isRange ? (value as number[]) : [value as number]
  const handleValueChange = isRange
    ? (values: number[]) => (onChange as (v: number[]) => void)(values)
    : (values: number[]) => (onChange as (v: number) => void)(values[0])

  // Single-mode props
  const resetValue = !isRange ? (props as SingleSliderProps).resetValue : undefined
  const resetTooltip = !isRange
    ? (props as SingleSliderProps).resetTooltip ?? "Reset to default"
    : undefined

  // Range-mode props
  const minStepsBetweenThumbs = isRange
    ? (props as RangeSliderProps).minStepsBetweenThumbs
    : undefined

  // Show marks only in horizontal orientation
  const showMarks = marks.length > 0 && !isVertical

  // Format range display text
  const rangeDisplayText = isRange
    ? (value as number[])
        .map((v) => `${prefixUnit ?? ""}${v.toFixed(precision)}${unit ?? ""}`)
        .join(" – ")
    : ""

  return (
    <div
      className={clsx(s.SliderWrap, className)}
      data-orientation={orientation}
    >
      {label && (
        <div className={s.SliderLabel}>
          {/* Range mode renders no value input, so the label only names the thumbs */}
          <label htmlFor={isRange ? undefined : id} id={labelId} className="flex-1">
            {label}
          </label>
          {!isRange && resetValue !== undefined && (
            <Tooltip content={resetTooltip!} compact>
              <Button
                size="2xs"
                variant="ghost"
                color="secondary"
                className={s.Reset}
                aria-label={resetTooltip}
                data-hide={disabled || (resetValue === singleValue && !pointerDown)}
                onClick={() => singleOnChange!(resetValue)}
              >
                <Reload />
              </Button>
            </Tooltip>
          )}
          {isRange ? (
            <span className={s.RangeDisplay}>{rangeDisplayText}</span>
          ) : (
            <div className={s.SliderValue} onClick={() => inputRef.current?.focus()}>
              {prefixUnit && <span className={s.ValueUnit}>{prefixUnit}</span>}
              <input
                id={id}
                className={s.ValueInput}
                ref={inputRef}
                style={{ width: `${Math.ceil(inputWidth)}px` }}
                onKeyDown={handleKeyDown}
                value={inputValue}
                type="text"
                onClick={(e) => e.stopPropagation()}
                onBlur={handleInputBlur}
                onFocus={(e) => {
                  e.currentTarget.setSelectionRange(0, e.currentTarget.value.length)
                  onFocus?.(e)
                }}
                onChange={handleInputChange}
                disabled={disabled}
              />
              {unit && <span className={s.ValueUnit}>{unit}</span>}
            </div>
          )}
        </div>
      )}
      <div className={s.SliderContainer}>
        <RadixSlider.Root
          ref={forwardedRef}
          className={s.Slider}
          onValueChange={handleValueChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          value={radixValue}
          orientation={orientation}
          minStepsBetweenThumbs={minStepsBetweenThumbs}
          onBlur={onBlur}
          onFocus={onFocus}
          onPointerDown={() => setPointerDown(true)}
          onPointerUp={() => setPointerDown(false)}
          style={toCssVariables({
            "slider-duration": `${animationDurationMS}ms`,
            "slider-track-color": trackColor,
            "slider-range-color": rangeColor,
          })}
        >
          <RadixSlider.Track className={s.Track}>
            <RadixSlider.Range className={s.Range} />
          </RadixSlider.Track>
          {isRange ? (
            (value as number[]).map((_, i) => (
              <RadixSlider.Thumb
                key={i}
                id={`${id}-thumb-${i}`}
                className={s.Thumb}
                // Name plus the thumb's own Radix name ("Minimum" / "Maximum"),
                // so the endpoints stay distinguishable
                aria-labelledby={nameId ? `${nameId} ${id}-thumb-${i}` : undefined}
                // Only pass aria-label when set: an explicit undefined would
                // replace the name Radix gives the thumb
                {...(!nameId && ariaLabel
                  ? {
                      "aria-label":
                        `${ariaLabel} ${rangeThumbName(i, (value as number[]).length)}`.trim(),
                    }
                  : {})}
              />
            ))
          ) : (
            <RadixSlider.Thumb
              className={s.Thumb}
              ref={thumbRef}
              aria-labelledby={nameId}
              {...(!nameId && ariaLabel ? { "aria-label": ariaLabel } : {})}
            />
          )}
        </RadixSlider.Root>
        {showMarks && <SliderMarks marks={marks} thumbRef={thumbRef} min={min} max={max} />}
      </div>
    </div>
  )
})
Slider.displayName = "Slider"

// Matches the names Radix gives range thumbs on its own
const rangeThumbName = (index: number, count: number) =>
  count === 2 ? (index === 0 ? "Minimum" : "Maximum") : count > 2 ? `Value ${index + 1} of ${count}` : ""

type MarksProps = {
  marks: SliderMark[]
  thumbRef: React.RefObject<HTMLDivElement | null>
  min: number
  max: number
}

// The minimum difference we enforce between marks, in pixels
const MINIMUM_MARK_SPACING_PX = 16

const SliderMarks = memo(({ marks, thumbRef, min, max }: MarksProps) => {
  // We seperate the container and measure divs so that our resize observer
  // does not fire when we adjust the height of the marks container.
  const marksContainerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)

  // We measure the width of the slider within this component so that sliders
  // without marks do not pay a performance penalty.
  // @ts-expect-error(2322) -- bug in types: https://github.com/juliencrn/usehooks-ts/issues/663
  const { width: sliderWidth } = useResizeObserver({ ref: measureRef })

  useLayoutEffect(() => {
    // Impossible
    if (!thumbRef.current || !marksContainerRef.current) {
      return
    }

    const markElements = Array.from(
      marksContainerRef.current.querySelectorAll("[data-mark]"),
    ) as HTMLDivElement[]

    const thumbHalfWidth = thumbRef.current.getBoundingClientRect().width / 2

    // Wipe all styles so we can accurately determine the positions of the marks
    markElements.forEach((markEl) => {
      markEl.style.width = ""
      markEl.style.display = ""
    })

    const positionMarks = () => {
      if (!sliderWidth) {
        return
      }

      markElements.forEach((markEl, index) => {
        const markValue = marks[index].value
        const valuePercent = (markValue - min) / (max - min)
        const markWidth = markEl.getBoundingClientRect().width
        const markHalfWidth = markWidth / 2

        // Radix smoothes the width of the thumb over the entire track so
        // that the thumb is always within bounds. We need to duplicate
        // this smoothing so that the marks match the observed breakpoints.
        const smoothedThumb = thumbHalfWidth - valuePercent * (thumbHalfWidth / 0.5)

        // Calculate where we would naively put the mark based on the value
        const naiveLeftOffset = valuePercent * sliderWidth

        // Add the thumb smoothing, and account for the width of the mark itself
        let left = naiveLeftOffset + smoothedThumb - markHalfWidth

        // Clamp to the left and right bounds of the container
        left = Math.max(0, Math.min(left, sliderWidth - markWidth))

        markEl.style.left = `${left}px`
      })
    }

    const marksHaveCollisions = () => {
      for (let i = 0; i < markElements.length - 1; i++) {
        const currentRect = markElements[i].getBoundingClientRect()
        const nextRect = markElements[i + 1].getBoundingClientRect()

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

    const tallestHeight = Math.max(
      ...markElements.map((markEl) => markEl.getBoundingClientRect().height),
    )

    // Give our container a height so that we allocate space on the page
    // for the marks and push down other content when we have to wrap
    marksContainerRef.current.style.height = tallestHeight > 0 ? `${tallestHeight}px` : ""
  }, [marks, thumbRef, marksContainerRef, min, max, sliderWidth])

  return (
    <div className={s.MarksContainer} ref={marksContainerRef}>
      <div ref={measureRef}>
        {marks.map((mark) => (
          <div key={mark.value} className={s.Mark} data-mark>
            <span className={s.MarkLabel}>{mark.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
})
SliderMarks.displayName = "SliderMarks"
