"use client"

import clsx from "clsx"
import { type FocusEventHandler, type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from "react"
import s from "@plexui/styles/components/IndexBar/IndexBar.module.css"
import { useLatestValue } from "../../hooks/useLatestValue"

export type IndexBarProps = {
  /** The `id` of the index bar. */
  id?: string
  /** The titles of the sections, in order: usually letters, such as `"A"` to `"Z"` and `"#"`. */
  items: string[]
  /** Called with the title and the index of the section to show: on a press, on each new letter while dragging, and from the keys. */
  onSelect?: (item: string, index: number) => void
  /** Accessible name of the index bar. @default "Section index" */
  "aria-label"?: string
  /** The `id` of the list the index scrolls. */
  "aria-controls"?: string
  /** Event handler called when the index bar gains focus. */
  onFocus?: FocusEventHandler<HTMLDivElement>
  /** Event handler called when the index bar loses focus. */
  onBlur?: FocusEventHandler<HTMLDivElement>
  /** CSS classes applied to the index bar */
  className?: string
}

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

/**
 * The section index of a phone list, as the iOS section index: a column of letters at the trailing edge of the
 * nearest positioned container (a Page), centred between the bars of the Page. A press shows the section of the letter under the
 * finger, and a drag moves through the sections letter by letter. On a short screen every other letter gives
 * way to a dot. It is one slider for assistive technology: Down and Up (or Right and Left) move one section, Home
 * and End go to the first and the last, and Enter or Space shows the current one again. A desktop list has no
 * index, so the bar renders under 768px only.
 */
export function IndexBar({
  id,
  items,
  onSelect,
  "aria-label": ariaLabel = "Section index",
  "aria-controls": ariaControls,
  onFocus,
  onBlur,
  className,
}: IndexBarProps) {
  const count = items.length
  const [current, setCurrent] = useState(0)
  const [capacity, setCapacity] = useState<number | undefined>(undefined)
  const [pressed, setPressed] = useState(false)
  const strip = useRef<HTMLDivElement>(null)
  const rail = useRef<HTMLDivElement>(null)
  const press = useRef<{ pointerId: number; index: number } | null>(null)
  const itemsRef = useLatestValue(items)
  const onSelectRef = useLatestValue(onSelect)
  const index = Math.min(current, Math.max(0, count - 1))
  const slots = indexBarSlots(count, capacity)

  // The strip changes with the screen, the rail with the line height.
  useEffect(() => {
    const element = strip.current
    if (!element || typeof ResizeObserver === "undefined") return
    const measure = () => setCapacity(capacityOf(element, rail.current))
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    if (rail.current) observer.observe(rail.current)
    measure()
    return () => observer.disconnect()
  }, [count])

  const select = (next: number) => {
    const item = itemsRef.current[next]
    if (item === undefined) return
    setCurrent(next)
    onSelectRef.current?.(item, next)
  }

  const end = () => {
    press.current = null
    setPressed(false)
  }

  // A gesture ends with its rail: the letters can go away under the finger.
  useEffect(() => {
    if (count < 1 && press.current) end()
  }, [count])

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || press.current) return
    const next = indexAt(event.currentTarget, event.clientY, slots)
    if (next === undefined) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    press.current = { pointerId: event.pointerId, index: next }
    setPressed(true)
    select(next)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = press.current
    if (!state || state.pointerId !== event.pointerId) return
    const next = indexAt(event.currentTarget, event.clientY, slots)
    if (next === undefined || next === state.index) return
    state.index = next
    select(next)
  }

  /** The pointer of the gesture lifted, was cancelled or lost its capture; another pointer ends nothing. */
  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (press.current?.pointerId === event.pointerId) end()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || slots.length < 1) return
    const keys: Record<string, number> = {
      ArrowDown: index + 1,
      ArrowRight: index + 1,
      ArrowUp: index - 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: count - 1,
      Enter: index,
      " ": index,
    }
    const target = keys[event.key]
    if (target === undefined) return
    event.preventDefault()
    const next = Math.min(count - 1, Math.max(0, target))
    if (next !== index || event.key === "Enter" || event.key === " ") select(next)
  }

  if (count < 1) return null

  return (
    <div ref={strip} className={clsx(s.IndexBar, className)} data-index-bar="">
      <div
        ref={rail}
        id={id}
        role="slider"
        tabIndex={0}
        aria-orientation="vertical"
        aria-valuemin={1}
        aria-valuemax={count}
        aria-valuenow={index + 1}
        aria-valuetext={items[index]}
        aria-label={ariaLabel}
        aria-controls={ariaControls}
        // No room for a line between the bars: the bar stays measurable and leaves the focus order.
        hidden={slots.length < 1 || undefined}
        className={s.Rail}
        data-pressed={pressed ? "" : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={handlePointerEnd}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
      >
        {slots.map((slot, position) => slot === null ? (
          <span key={`dot-${position}`} className={s.Item} aria-hidden="true" data-dot="">{"•"}</span>
        ) : (
          <span key={slot} className={s.Item} aria-hidden="true" data-index={slot}>{items[slot]}</span>
        ))}
      </div>
    </div>
  )
}
