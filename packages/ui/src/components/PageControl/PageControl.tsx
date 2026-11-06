"use client"

import clsx from "clsx"
import { type FocusEventHandler, type KeyboardEvent, type PointerEvent, useRef, useState } from "react"
import s from "@plexui/styles/components/PageControl/PageControl.module.css"
import { useLatestValue } from "../../hooks/useLatestValue"

/** How an indicator shows: full size, one of the two shrinking sizes past the window, or hidden. */
export type PageControlDotSize = "full" | "small" | "smaller" | "hidden"

export type PageControlChangeDetails = {
  /** The change came from scrubbing: show the page without the scrolling animation, as the HIG asks. */
  scrubbing: boolean
}

export type PageControlProps = {
  /** The `id` of the page control. */
  id?: string
  /** The number of pages. */
  count: number
  /** The controlled index of the current page, from 0. Use with `onChange`. */
  value?: number
  /** The index of the page when it is initially rendered. Use when you do not need to control the page. @default 0 */
  defaultValue?: number
  /** Called with the index of the next page. */
  onChange?: (index: number, details: PageControlChangeDetails) => void
  /**
   * The rounded background behind the indicators: `automatic` shows it while a pointer presses or scrubs,
   * `prominent` always, `minimal` never and turns off scrubbing, as in iOS. @default "automatic"
   */
  background?: "automatic" | "prominent" | "minimal"
  /** The text assistive technology reads for the current page. @default (index, count) => `Page ${index + 1} of ${count}` */
  valueText?: (index: number, count: number) => string
  /** Accessible name of the page control, when no visible label names it. @default "Pages" */
  "aria-label"?: string
  /** The `id` of the visible label of the page control. */
  "aria-labelledby"?: string
  /** The `id` of the element that shows the pages. */
  "aria-controls"?: string
  /** Event handler called when the page control gains focus. */
  onFocus?: FocusEventHandler<HTMLDivElement>
  /** Event handler called when the page control loses focus. */
  onBlur?: FocusEventHandler<HTMLDivElement>
  /** CSS classes applied to the page control */
  className?: string
}

/**
 * The size of each indicator, after the variants of the iOS 26 kit Page control (507:24679). Up to six pages
 * show full size. Seven show six, and the one past them at 6px. From eight a window of full dots holds the current
 * page: six at either end, otherwise five with the current one in the middle, and the two dots past each side of
 * the window shrink to 6px and 4px; the rest hide.
 */
export const pageControlDots = (count: number, current: number): PageControlDotSize[] => {
  const sizes: PageControlDotSize[] = Array.from({ length: Math.max(0, count) }, () => "hidden")
  const show = (from: number, to: number, size: PageControlDotSize) => {
    for (let i = Math.max(0, from); i <= Math.min(sizes.length - 1, to); i++) sizes[i] = size
  }
  if (count <= 6) {
    show(0, count - 1, "full")
    return sizes
  }
  if (count === 7) {
    const start = current >= 6 ? 1 : 0
    show(0, 6, "small")
    show(start, start + 5, "full")
    return sizes
  }
  const [from, to] = current <= 3 ? [0, 5] : current >= count - 4 ? [count - 6, count - 1] : [current - 2, current + 2]
  show(from - 2, from - 2, "smaller")
  show(from - 1, from - 1, "small")
  show(to + 1, to + 1, "small")
  show(to + 2, to + 2, "smaller")
  show(from, to, "full")
  return sizes
}

const clampIndex = (index: number, count: number) => Math.min(Math.max(index, 0), Math.max(0, count - 1))
const defaultValueText = (index: number, count: number) => `Page ${index + 1} of ${count}`
/** A drag shorter than this is a tap. */
const SCRUB_THRESHOLD = 8

type Press = { pointerId: number; pointerType: string; startX: number; startIndex: number; scrubbing: boolean }

const isRtl = (element: HTMLElement) => element.closest("[dir]")?.getAttribute("dir") === "rtl"

/** Distance between the centers of two full dots: the dot size plus the gap. */
const pitchOf = (element: HTMLElement) => {
  const styles = getComputedStyle(element)
  const pitch = parseFloat(styles.getPropertyValue("--page-control-dot-size")) + parseFloat(styles.columnGap)
  return Number.isFinite(pitch) && pitch > 0 ? pitch : 16
}

/**
 * A row of dots, one for each page, the current one solid, as the iOS 26 page control. Tapping the leading or
 * trailing side of the current dot shows the previous or next page; a mouse or pen picks a dot. Dragging across
 * scrubs page by page, and past either end goes to the first or last page. It is a slider for assistive
 * technology: Left and Right (or Up and Down) move one page, Home and End go to the first and last.
 */
export function PageControl({
  id,
  count,
  value: valueProp,
  defaultValue = 0,
  onChange,
  background = "automatic",
  valueText = defaultValueText,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-controls": ariaControls,
  onFocus,
  onBlur,
  className,
}: PageControlProps) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const current = clampIndex(valueProp ?? internalValue, count)
  const currentRef = useLatestValue(current)
  const onChangeRef = useLatestValue(onChange)
  const press = useRef<Press | null>(null)
  const [interacting, setInteracting] = useState(false)

  const commit = (next: number, scrubbing: boolean) => {
    const index = clampIndex(next, count)
    if (index === currentRef.current) return
    if (valueProp === undefined) {
      currentRef.current = index
      setInternalValue(index)
    }
    onChangeRef.current?.(index, { scrubbing })
  }

  const end = () => {
    press.current = null
    setInteracting(false)
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || count < 1) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    press.current = { pointerId: event.pointerId, pointerType: event.pointerType, startX: event.clientX, startIndex: current, scrubbing: false }
    setInteracting(true)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = press.current
    if (!state || state.pointerId !== event.pointerId || background === "minimal") return
    const element = event.currentTarget
    const direction = isRtl(element) ? -1 : 1
    const dx = (event.clientX - state.startX) * direction
    if (!state.scrubbing && Math.abs(dx) < SCRUB_THRESHOLD) return
    state.scrubbing = true
    const rect = element.getBoundingClientRect()
    const before = direction === 1 ? event.clientX < rect.left : event.clientX > rect.right
    const after = direction === 1 ? event.clientX > rect.right : event.clientX < rect.left
    if (before) return commit(0, true)
    if (after) return commit(count - 1, true)
    commit(state.startIndex + Math.round(dx / pitchOf(element)), true)
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const state = press.current
    if (!state || state.pointerId !== event.pointerId) return
    end()
    if (state.scrubbing) return
    const element = event.currentTarget
    const dots = [...element.querySelectorAll<HTMLElement>("[data-index]")].filter((dot) => dot.dataset.size !== "hidden")
    const centerOf = (dot: HTMLElement) => {
      const rect = dot.getBoundingClientRect()
      return rect.left + rect.width / 2
    }
    if (state.pointerType === "mouse" || state.pointerType === "pen") {
      const nearest = dots.reduce<HTMLElement | undefined>((best, dot) =>
        !best || Math.abs(centerOf(dot) - event.clientX) < Math.abs(centerOf(best) - event.clientX) ? dot : best, undefined)
      if (nearest) commit(Number(nearest.dataset.index), false)
      return
    }
    const currentDot = dots.find((dot) => Number(dot.dataset.index) === currentRef.current)
    if (!currentDot) return
    const later = isRtl(element) ? event.clientX < centerOf(currentDot) : event.clientX > centerOf(currentDot)
    commit(currentRef.current + (later ? 1 : -1), false)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const forward = isRtl(event.currentTarget) ? -1 : 1
    const keys: Record<string, number> = {
      ArrowRight: current + forward,
      ArrowLeft: current - forward,
      ArrowUp: current + 1,
      ArrowDown: current - 1,
      Home: 0,
      End: count - 1,
    }
    const next = keys[event.key]
    if (next === undefined) return
    event.preventDefault()
    commit(next, false)
  }

  return (
    <div
      id={id}
      role="slider"
      tabIndex={0}
      aria-orientation="horizontal"
      aria-valuemin={1}
      aria-valuemax={Math.max(1, count)}
      aria-valuenow={current + 1}
      aria-valuetext={valueText(current, count)}
      aria-label={ariaLabel ?? (ariaLabelledBy ? undefined : "Pages")}
      aria-labelledby={ariaLabelledBy}
      aria-controls={ariaControls}
      className={clsx(s.PageControl, className)}
      data-background={background}
      data-interacting={interacting ? "" : undefined}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onKeyDown={handleKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
    >
      {pageControlDots(count, current).map((size, index) => (
        <span
          key={index}
          className={s.Dot}
          aria-hidden="true"
          data-index={index}
          data-size={size}
          data-current={index === current ? "" : undefined}
        />
      ))}
    </div>
  )
}
