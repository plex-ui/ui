"use client"

import { DateTime } from "luxon"
import { useMemo } from "react"
import { useLatestValue } from "../../hooks/useLatestValue"
import { isBefore } from "../../lib/dateUtils"
import { Calendar } from "../Icon"
import { Popover, type PopoverContentProps } from "../Popover"
import { SelectControl, type SelectControlProps } from "../SelectControl"
import { DateCalendar } from "./Calendar"
import { DateContext, type DateContextValue } from "./context"

export type DatePickerProps = Pick<SelectControlProps, "aria-label" | "aria-labelledby" | "aria-describedby" | "aria-invalid"> & {
  /**
   * Allow targeting the input for forms and accessibility.
   */
  id: string
  /**
   * The selected date value.
   */
  value: DateTime | null
  /**
   * Handler that is triggered when the date changes.
   */
  onChange: (nextValue: DateTime | null) => void
  /**
   * Defines the earliest selectable date (inclusive).
   */
  min?: DateTime
  /**
   * Defines the latest selectable date (inclusive).
   */
  max?: DateTime
  /**
   * The preferred side of the trigger to render against when open. Will be reversed when collisions occur.
   * @default bottom
   */
  side?: PopoverContentProps["side"]
  /**
   * The distance in pixels from the trigger.
   * @default 8
   */
  sideOffset?: PopoverContentProps["sideOffset"]
  /**
   * The preferred alignment against the trigger. May change when collisions occur.
   * @default center
   */
  align?: PopoverContentProps["align"]
  /**
   * An offset in pixels from the "start" or "end" alignment options.
   * @default 0
   */
  alignOffset?: PopoverContentProps["alignOffset"]

  /**
   * Disables the select visually and from interactions
   * @default false
   */
  disabled?: boolean
  /**
   * Placeholder text for the select
   * @default Select date...
   */
  placeholder?: string
  /**
   * Style variant for the select trigger
   * @default outline
   */
  variant?: SelectControlProps["variant"]
  /**
   * Determines if the select trigger should be a fully rounded pill shape
   * @default false
   */
  pill?: boolean
  /**
   * Determines size of the size and spacing of the control.
   *
   * | 3xs     | 2xs     | xs      | sm      | md      | lg      | xl      | 2xl     | 3xl     |
   * | ------- | ------- | ------- | ------- | ------- | ------- | ------- | ------- | ------- |
   * | `22px`  | `24px`  | `26px`  | `28px`  | `32px`  | `36px`  | `40px`  | `44px`  | `48px`  |
   * @default md
   */
  size?: SelectControlProps["size"]
  /**
   * Icon displayed in the far right of the select trigger
   * @default dropdown
   */
  dropdownIconType?: SelectControlProps["dropdownIconType"]
  /**
   * Custom class applied to the select trigger
   */
  triggerClassName?: string
  /**
   * Display calendar icon at the start of the trigger
   * @default true
   */
  triggerShowIcon?: boolean
  /**
   * Format of dates displayed in the trigger
   */
  triggerDateFormat: string
  /**
   * Display a clear action that allows the select to be unset.
   * @default false
   */
  clearable?: boolean
  /**
   * Extends select to 100% of available width.
   * @default true
   */
  block?: boolean
  /**
   * Controls how the calendar header is rendered.
   * - `"buttons"` — Arrow navigation between months (default)
   * - `"dropdown"` — Month and year dropdown selects (ideal for date of birth)
   * @default buttons
   */
  captionLayout?: "buttons" | "dropdown"
  /**
   * Show time input below the calendar for combined date and time selection.
   * @default false
   */
  showTime?: boolean
  /**
   * Range of selectable years when `captionLayout` is `"dropdown"`.
   * @default [currentYear - 120, currentYear]
   */
  yearRange?: [number, number]
}

export const DatePicker = (props: DatePickerProps) => {
  const {
    id,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    value,
    onChange,
    min,
    max,
    side = "bottom",
    sideOffset = 8,
    align = "center",
    alignOffset,
    variant = "outline",
    size = "md",
    clearable = false,
    disabled = false,
    dropdownIconType,
    placeholder = "Select date...",
    pill = true,
    block = false,
    triggerClassName,
    triggerShowIcon = true,
    captionLayout = "buttons",
    showTime = false,
    yearRange,
    triggerDateFormat = showTime ? "MM/dd/yy HH:mm" : "MM/dd/yy",
  } = props

  if (min && max && !isBefore(min, max)) {
    throw new Error("DatePicker error: `min` date must be before the `max` date")
  }

  // Create stable, mutable references to avoid memoization requirements from consumers
  const onChangeRef = useLatestValue(onChange)

  const store = useMemo<DateContextValue>(
    () => ({
      value,
      min,
      max,
      variant,
      size,
      dropdownIconType,
      clearable,
      disabled,
      placeholder,
      block,
      pill,
      triggerClassName,
      triggerShowIcon,
      triggerDateFormat,
      captionLayout,
      showTime,
      yearRange,
      onChangeRef,
    }),
    [
      value,
      min,
      max,
      variant,
      size,
      dropdownIconType,
      clearable,
      disabled,
      placeholder,
      block,
      pill,
      triggerClassName,
      triggerShowIcon,
      triggerDateFormat,
      captionLayout,
      showTime,
      yearRange,
      onChangeRef,
    ],
  )

  const handleClearClick = () => {
    onChangeRef.current(null)
  }

  return (
    <DateContext value={store}>
      <Popover>
        <Popover.Trigger>
          <SelectControl
            id={id}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy ? `${ariaLabelledBy} ${id}-value` : undefined}
            aria-describedby={ariaDescribedBy}
            aria-invalid={ariaInvalid}
            className={triggerClassName}
            selected={!!value}
            variant={variant}
            pill={pill}
            block={block}
            size={size}
            disabled={disabled}
            StartIcon={triggerShowIcon ? Calendar : undefined}
            dropdownIconType={dropdownIconType}
            onClearClick={clearable ? handleClearClick : undefined}
          >
            {ariaLabelledBy ? (
              <span id={`${id}-value`}>{value?.toFormat(triggerDateFormat) ?? placeholder}</span>
            ) : value?.toFormat(triggerDateFormat) ?? placeholder}
          </SelectControl>
        </Popover.Trigger>
        <Popover.Content
          minWidth={230}
          side={side}
          sideOffset={sideOffset}
          align={align}
          alignOffset={alignOffset ?? (align === "center" ? 0 : -5)}
        >
          <DateCalendar />
        </Popover.Content>
      </Popover>
    </DateContext>
  )
}
