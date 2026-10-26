"use client"

import clsx from "clsx"
import { RadioGroup as RadixRadioGroup } from "radix-ui"
import React, { createContext, use, useId, useMemo } from "react"
import s from "@plexui/styles/components/RadioGroup/RadioGroup.module.css"

type Direction = "col" | "row"

type RadioGroupContextValue = {
  disabled: boolean
  direction: Direction
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null)

const useRadioGroupContext = () => {
  const context = use(RadioGroupContext)

  if (!context) {
    throw new Error("RadioGroup components must be wrapped in <RadioGroup />")
  }

  return context
}

export type RadioGroupProps<T extends string> = {
  "defaultValue"?: T
  "value"?: T
  "name"?: string
  "onChange"?: (value: T) => void
  /** Accessible label for the radio options */
  "aria-label"?: string
  /** Determines the layout direction of the radio items
   * @default row
   */
  "direction"?: Direction
  /** Controls whether the entire radio group is disabled */
  "disabled"?: boolean
  /** Class applied to the radio group container */
  "className"?: string
  "children": React.ReactNode
  "required"?: boolean
}

export const RadioGroup = <T extends string>({
  onChange,
  children,
  className,
  direction = "row",
  disabled = false,
  ...restProps
}: RadioGroupProps<T>) => {
  const store = useMemo<RadioGroupContextValue>(
    () => ({
      disabled,
      direction,
    }),
    [disabled, direction],
  )

  return (
    <RadioGroupContext value={store}>
      <RadixRadioGroup.Root
        className={clsx(s.RadioGroup, className)}
        data-direction={direction}
        onValueChange={onChange}
        disabled={disabled}
        {...restProps}
      >
        {children}
      </RadixRadioGroup.Root>
    </RadioGroupContext>
  )
}

export type RadioGroupItemProps<T extends string> = {
  value: T
  /** Determines if a given radio item is disabled */
  disabled?: boolean
  required?: boolean
  block?: boolean
  className?: string
  /**
   * The orientation of the radio indicator relative to the label.
   *
   * @default "left"
   */
  orientation?: "left" | "right"
  children: React.ReactNode
  /** Optional second line below the option's label. Linked via `aria-describedby`. */
  description?: React.ReactNode
}

const Item = <T extends string>({
  value,
  disabled: itemDisabled = false,
  required,
  children,
  description,
  className,
  block = false,
  orientation = "left",
  ...restProps
}: RadioGroupItemProps<T>) => {
  const { disabled: groupDisabled } = useRadioGroupContext()
  const disabled = groupDisabled || itemDisabled

  const id = useId()
  const itemId = `${value}-${id}`
  const descriptionId = description ? `${itemId}-description` : undefined

  const label = (
    <label
      htmlFor={itemId}
      className={clsx(s.RadioLabel, className)}
      data-disabled={disabled ? "" : undefined}
      data-block={block ? "" : undefined}
      data-orientation={orientation}
      onMouseDown={(event) => {
        if (!event.defaultPrevented && event.detail > 1) event.preventDefault()
      }}
    >
      <div className={s.RadioIndicatorWrapper}>
        <RadixRadioGroup.Item
          id={itemId}
          value={value}
          disabled={disabled}
          required={required}
          className={s.RadioItem}
          aria-describedby={descriptionId}
        >
          <RadixRadioGroup.Indicator className={s.RadioIndicator} />
        </RadixRadioGroup.Item>
      </div>
      {children}
    </label>
  )

  return (
    // Providing an extra wrapper enables `label` to be inline-flex, avoiding clickable whitespace
    // when radio options are of varied lengths.
    // NOTE: Important that this is `flex` to prevent the `inline-flex` label from extra, unintentional whitespace.
    <div className={clsx("flex", block && "w-full")} {...restProps}>
      {description ? (
        // The description stays outside the label, so it describes the radio instead of naming it
        <div className={s.RadioItemGroup} data-block={block ? "" : undefined} data-orientation={orientation}>
          {label}
          <span id={descriptionId} className={s.RadioDescription} data-disabled={disabled ? "" : undefined}>
            {description}
          </span>
        </div>
      ) : (
        label
      )}
    </div>
  )
}

RadioGroup.Item = Item
