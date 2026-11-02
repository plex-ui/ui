"use client"

import clsx from "clsx"
import type { ComponentProps, DragEvent, ElementType, KeyboardEvent, PointerEvent, ReactNode } from "react"
import { flushSync } from "react-dom"

import { useLatestValue } from "../../hooks/useLatestValue"
import { moveItem, sortableKeyDown, sortablePointerDown, type SortableLayout } from "../../lib/sortable"
import { GripVertical } from "../Icon"

import s from "@plexui/styles/components/Sortable/Sortable.module.css"

export type SortableProps<T> = {
  /**
   * The list, in the order of the children
   */
  value: readonly T[]
  /**
   * Called with the new order after a drop
   */
  onChange?: (value: T[]) => void
  /**
   * `list` for rows one under another, `grid` for items that stand side by side
   * @default list
   */
  layout?: SortableLayout
  /**
   * Element to render, such as `TableBody` for table rows
   * @default div
   */
  as?: ElementType
  /**
   * Turns dragging off
   * @default false
   */
  disabled?: boolean
  /**
   * Shows the grips of `Sortable.Handle`. A hidden grip still takes the keyboard, and the item drags from anywhere but a control.
   * @default true in a table, otherwise false
   */
  handles?: boolean
  /**
   * The items, one direct child per entry of `value`, keyed by the entry and not by its index
   */
  children?: ReactNode
} & Omit<ComponentProps<"div">, "children" | "onChange">

const preventNativeDrag = (event: DragEvent) => event.preventDefault()

/** Reorders its direct children by dragging, from anywhere but a control, or by a `Sortable.Handle` where grips are shown. */
export function Sortable<T>({
  value,
  onChange,
  layout = "list",
  as: Tag = "div",
  disabled = false,
  handles,
  className,
  children,
  onPointerDown,
  onKeyDown,
  ...rest
}: SortableProps<T>) {
  const latest = useLatestValue({ value, onChange })

  const commit = (from: number, to: number) => {
    flushSync(() => latest.current.onChange?.(moveItem(latest.current.value, from, to)))
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event)
    if (!disabled) sortablePointerDown(event.nativeEvent, event.currentTarget, layout, commit)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (!disabled) void sortableKeyDown(event.nativeEvent, event.currentTarget, commit)
  }

  return (
    <Tag
      {...rest}
      className={clsx(s.Sortable, className)}
      data-sortable=""
      data-layout={layout}
      data-disabled={disabled ? "" : undefined}
      data-handles={handles?.toString()}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      onDragStart={preventNativeDrag}
    >
      {children}
    </Tag>
  )
}

export type SortableHandleProps = {
  /**
   * Name of the handle for assistive technology
   * @default Reorder
   */
  "aria-label"?: string
} & ComponentProps<"button">

/** The grip of an item. Arrow keys move the item while the handle has focus. */
function SortableHandle({ "aria-label": ariaLabel = "Reorder", className, children, ...rest }: SortableHandleProps) {
  return (
    <button {...rest} type="button" className={clsx(s.Handle, className)} data-sortable-handle="" aria-label={ariaLabel}>
      {children ?? <GripVertical aria-hidden />}
    </button>
  )
}

Sortable.Handle = SortableHandle
