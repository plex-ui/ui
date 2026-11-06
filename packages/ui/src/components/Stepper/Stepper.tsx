"use client"

import clsx from "clsx"
import {
  type FocusEventHandler,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import s from "@plexui/styles/components/Stepper/Stepper.module.css"
import { useLatestValue } from "../../hooks/useLatestValue"
import { Minus, Plus } from "../Icon"

export type StepperProps = {
  /** The `id` of the stepper. */
  id?: string
  /** The controlled value. Use with `onChange`. */
  value?: number
  /** The value when it is initially rendered. Use when you do not need to control the value. @default min */
  defaultValue?: number
  /** Called with the next value after a step. */
  onChange?: (value: number) => void
  /** The lowest value. @default 0 */
  min?: number
  /** The highest value. @default 100 */
  max?: number
  /** The amount each step adds or removes. @default 1 */
  step?: number
  /** A step past `max` continues from `min`, and one below `min` from `max`. @default false */
  wrap?: boolean
  /** Holding a segment keeps stepping, as a native stepper does. @default true */
  autoRepeat?: boolean
  /** When `true`, prevents the user from interacting with the stepper. */
  disabled?: boolean
  /** Fully rounded ends. @default true */
  pill?: boolean
  /** Accessible name of the decrement segment. @default "Decrease" */
  decrementLabel?: string
  /** Accessible name of the increment segment. @default "Increase" */
  incrementLabel?: string
  /** The name of the stepper. Submits its value with the owning form. */
  name?: string
  /** Accessible name of the value the stepper changes, when no visible label names it. */
  "aria-label"?: string
  /** The `id` of the visible label of the value the stepper changes. */
  "aria-labelledby"?: string
  /** The `id` of an element that describes the stepper, such as the text that shows its value. */
  "aria-describedby"?: string
  /** Event handler called when the stepper gains focus. */
  onFocus?: FocusEventHandler<HTMLDivElement>
  /** Event handler called when the stepper loses focus. */
  onBlur?: FocusEventHandler<HTMLDivElement>
  /** CSS classes applied to the stepper */
  className?: string
}

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

/**
 * Two segments that decrease and increase a number, as the iOS 26 stepper does. It shows no value of its own:
 * name it with `aria-label` or `aria-labelledby` and show the value beside it. Keyboard focus lands on the
 * stepper, a spin button: Up and Down step, Page Up and Page Down step ten times, Home and End go to the range ends.
 */
export function Stepper({
  id,
  value: valueProp,
  defaultValue,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  wrap = false,
  autoRepeat = true,
  disabled = false,
  pill = true,
  decrementLabel = "Decrease",
  incrementLabel = "Increase",
  name,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  onFocus,
  onBlur,
  className,
}: StepperProps) {
  const [internalValue, setInternalValue] = useState(() => defaultValue ?? min)
  const value = valueProp ?? internalValue
  // Timers and key handlers read the value through this ref; an uncontrolled step advances it at once.
  const valueRef = useLatestValue(value)
  const onChangeRef = useLatestValue(onChange)
  const optionsRef = useLatestValue({ min, max, step, wrap, disabled, controlled: valueProp !== undefined })
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [pressed, setPressed] = useState<"decrement" | "increment" | null>(null)

  const commit = useCallback((next: number) => {
    if (next === valueRef.current) return false
    // A controlled value changes only when the owner passes it back, as in Vue.
    if (!optionsRef.current.controlled) {
      valueRef.current = next
      setInternalValue(next)
    }
    onChangeRef.current?.(next)
    return true
  }, [valueRef, optionsRef, onChangeRef])

  const stepBy = useCallback((direction: 1 | -1, times = 1) => {
    let next = valueRef.current
    for (let i = 0; i < times; i++) next = stepValue(next, direction, optionsRef.current)
    return commit(next)
  }, [commit, valueRef, optionsRef])

  const stopRepeat = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = undefined
    setPressed(null)
  }, [])

  useEffect(() => stopRepeat, [stopRepeat])

  const atMin = !wrap && value <= min
  const atMax = !wrap && value >= max

  const startPress = (segment: "decrement" | "increment", event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || disabled) return
    if (segment === "decrement" ? atMin : atMax) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setPressed(segment)
    const direction = segment === "decrement" ? -1 : 1
    stepBy(direction)
    if (!autoRepeat) return
    const repeat = () => {
      if (optionsRef.current.disabled || !stepBy(direction)) return stopRepeat()
      timer.current = setTimeout(repeat, REPEAT_INTERVAL)
    }
    timer.current = setTimeout(repeat, REPEAT_DELAY)
  }

  // A pointer steps on press, so only a click without one (assistive technology, `element.click()`) steps here.
  const handleClick = (segment: "decrement" | "increment", event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail !== 0 || disabled) return
    stepBy(segment === "decrement" ? -1 : 1)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || event.altKey || event.ctrlKey || event.metaKey) return
    const keys: Record<string, () => void> = {
      ArrowUp: () => stepBy(1),
      ArrowDown: () => stepBy(-1),
      PageUp: () => stepBy(1, 10),
      PageDown: () => stepBy(-1, 10),
      Home: () => commit(min),
      End: () => commit(max),
    }
    const action = keys[event.key]
    if (!action) return
    event.preventDefault()
    action()
  }

  const segment = (kind: "decrement" | "increment") => {
    const atEnd = kind === "decrement" ? atMin : atMax
    const Icon = kind === "decrement" ? Minus : Plus
    return (
      <button
        type="button"
        tabIndex={-1}
        aria-label={kind === "decrement" ? decrementLabel : incrementLabel}
        aria-disabled={atEnd || undefined}
        disabled={disabled}
        className={s.Segment}
        data-segment={kind}
        data-disabled={atEnd || disabled ? "" : undefined}
        data-pressed={pressed === kind && !disabled ? "" : undefined}
        // Keeps the focus where it is, as a native stepper takes none.
        onMouseDown={(event) => event.preventDefault()}
        onPointerDown={(event) => startPress(kind, event)}
        onPointerUp={stopRepeat}
        onPointerCancel={stopRepeat}
        onLostPointerCapture={stopRepeat}
        onClick={(event) => handleClick(kind, event)}
      >
        <Icon className={s.Icon} />
      </button>
    )
  }

  return (
    <div
      id={id}
      role="spinbutton"
      tabIndex={disabled ? -1 : 0}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      aria-disabled={disabled || undefined}
      className={clsx(s.Stepper, className)}
      data-disabled={disabled ? "" : undefined}
      data-pill={pill ? "" : undefined}
      onKeyDown={handleKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {segment("decrement")}
      <span className={s.Separator} aria-hidden="true" />
      {segment("increment")}
      {name !== undefined && <input type="hidden" name={name} value={value} disabled={disabled} />}
    </div>
  )
}
