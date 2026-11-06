"use client"

import clsx from "clsx"
import { useEffect, useRef, type ComponentProps, type DragEvent, type ElementType, type KeyboardEvent, type PointerEvent, type ReactNode } from "react"
import { flushSync } from "react-dom"

import { useLatestValue } from "../../hooks/useLatestValue"
import { moveItem, sortableKeyDown, sortablePointerDown, type SortableLayout, type SortableMove } from "../../lib/sortable"
import { GripVertical, Hamburger } from "../Icon"

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
   * Lists of one group trade items, and a `Sortable.Target` of that group takes them. Give each list a `name`.
   */
  group?: string
  /**
   * Names the list in `onMove`
   */
  name?: string
  /**
   * An item moved, inside this list or out of it. Out of it the app updates both lists: `onChange` is for a move inside one.
   */
  onMove?: (move: SortableMove<T>) => void
  /**
   * A drag rests on a `Sortable.Target` of the group: open what it stands for or go there
   */
  onHold?: (name: string) => void
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
  group,
  name,
  onMove,
  onHold,
  className,
  children,
  onPointerDown,
  onKeyDown,
  ...rest
}: SortableProps<T>) {
  const latest = useLatestValue({ value, onChange, onMove, onHold, name })
  const cancelDrag = useRef<ReturnType<typeof sortablePointerDown>>(undefined)
  useEffect(() => () => cancelDrag.current?.(), [])
  useEffect(() => {
    if (disabled) {
      cancelDrag.current?.()
      cancelDrag.current = undefined
    }
  }, [disabled])

  const commit = (from: number, to: number) => {
    const { value: items, onChange: change, onMove: move, name: list } = latest.current
    flushSync(() => {
      change?.(moveItem(items, from, to))
      move?.({ item: items[from], from: list as string, fromIndex: from, to: list as string, toIndex: to })
    })
  }

  const link = {
    move: (fromIndex: number, to: string, toIndex?: number) => {
      const { value: items, onMove: move, name: from } = latest.current
      flushSync(() => move?.({ item: items[fromIndex], from: from as string, fromIndex, to, toIndex }))
    },
    hold: (target: string) => latest.current.onHold?.(target),
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    onPointerDown?.(event)
    if (!disabled && !event.defaultPrevented) {
      cancelDrag.current = sortablePointerDown(event.nativeEvent, event.currentTarget, layout, commit, link) ?? cancelDrag.current
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event)
    if (!disabled && !event.defaultPrevented) void sortableKeyDown(event.nativeEvent, event.currentTarget, commit, link)
  }

  return (
    <Tag
      {...rest}
      className={clsx(s.Sortable, className)}
      data-sortable=""
      data-layout={layout}
      data-disabled={disabled ? "" : undefined}
      data-handles={handles?.toString()}
      data-group={group}
      data-name={name}
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
      {children ?? <><GripVertical className={s.DesktopGrip} aria-hidden /><Hamburger className={s.PhoneGrip} aria-hidden /></>}
    </button>
  )
}

export type SortableTargetProps = {
  /**
   * The `group` of the lists whose items it takes
   */
  group: string
  /**
   * Names the target in `onMove` and `onHold` on the list
   */
  name: string
  /**
   * Element to render
   * @default div
   */
  as?: ElementType
} & ComponentProps<"div">

/** A place outside the lists that takes an item whole: a folder, a category in a side list. */
function SortableTarget({ group, name, as: Tag = "div", className, ...rest }: SortableTargetProps) {
  return <Tag {...rest} className={clsx(s.Target, className)} data-sortable-target={group} data-name={name} />
}

Sortable.Handle = SortableHandle
Sortable.Target = SortableTarget
