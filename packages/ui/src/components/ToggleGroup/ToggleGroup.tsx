"use client"

import clsx from "clsx"
import { ToggleGroup as RadixToggleGroup } from "radix-ui"
import { createContext, type MouseEvent, type ReactNode, useContext, useState } from "react"
import s from "@plexui/styles/components/ToggleGroup/ToggleGroup.module.css"
import { type ControlSize, type SemanticColors } from "../../types"
import { Button } from "../Button"

type ToggleGroupColor = SemanticColors<
  "primary" | "secondary" | "danger" | "success" | "info" | "discovery" | "caution" | "warning"
>

type ToggleGroupContextValue = {
  value: readonly string[]
  color: ToggleGroupColor
  size: ControlSize
  pill: boolean
  uniform: boolean
  disabled: boolean
}

const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(null)

export type ToggleGroupProps = {
  /** The values of the pressed items (controlled). */
  value?: string[]
  /**
   * The values of the items pressed when the group is first rendered (uncontrolled).
   * @default []
   */
  defaultValue?: string[]
  /** Called with the values of the pressed items when one is pressed or released, a newly pressed one last. */
  onChange?: (value: string[]) => void
  /**
   * The fill of a pressed item, a solid button in this color. An item that is not pressed is a soft secondary button.
   * @default primary
   */
  color?: ToggleGroupColor
  /**
   * The size of the items, as the Button sizes.
   * @default md
   */
  size?: ControlSize
  /**
   * Fully rounded items. With `uniform`, each item is a circle.
   * @default false
   */
  pill?: boolean
  /**
   * Items as wide as they are tall, for a letter or an icon.
   * @default false
   */
  uniform?: boolean
  /**
   * Fills the width of its container and spreads the items across it, the first and the last at the edges.
   * @default false
   */
  block?: boolean
  /**
   * Disables every item.
   * @default false
   */
  disabled?: boolean
  /**
   * The reading direction of the items, which the arrow keys follow.
   * @default "ltr"
   */
  dir?: "ltr" | "rtl"
  /** Accessible name of the group, when no visible label names it. */
  "aria-label"?: string
  /** The id of the visible label of the group. */
  "aria-labelledby"?: string
  /** The id of the group. */
  id?: string
  /** CSS classes applied to the group. */
  className?: string
  /** The items, each a `ToggleGroup.Item`. */
  children: ReactNode
}

const NO_VALUE: string[] = []

/**
 * A row of buttons that each stay pressed or not, any number at a time, such as the days an alarm repeats on.
 * For one choice out of several, use SegmentedControl or RadioGroup.
 */
const ToggleGroupRoot = (props: ToggleGroupProps) => {
  const {
    value: valueProp,
    defaultValue = NO_VALUE,
    onChange,
    color = "primary",
    size = "md",
    pill = false,
    uniform = false,
    block = false,
    disabled = false,
    className,
    children,
    ...restProps
  } = props
  const [internalValue, setInternalValue] = useState(defaultValue)
  const value = valueProp ?? internalValue

  const handleValueChange = (next: string[]) => {
    if (valueProp === undefined) setInternalValue(next)
    onChange?.(next)
  }

  return (
    <RadixToggleGroup.Root
      type="multiple"
      className={clsx(s.ToggleGroup, className)}
      value={value}
      onValueChange={handleValueChange}
      disabled={disabled}
      data-slot="toggle-group"
      data-block={block ? "" : undefined}
      {...restProps}
    >
      <ToggleGroupContext.Provider value={{ value, color, size, pill, uniform, disabled }}>{children}</ToggleGroupContext.Provider>
    </RadixToggleGroup.Root>
  )
}

export type ToggleGroupItemProps = {
  /** The value of the item, in the group's `value` while it is pressed. */
  value: string
  /**
   * Disables the item.
   * @default false
   */
  disabled?: boolean
  /** Accessible name of the item, when its content does not say it in full, such as a weekday's letter. */
  "aria-label"?: string
  /** Called on a click before the item is pressed or released; `event.preventDefault()` keeps it as it is. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  /** CSS classes applied to the item. */
  className?: string
  /** The content of the item: a label, a letter or an icon. */
  children: ReactNode
}

const ToggleGroupItem = (props: ToggleGroupItemProps) => {
  const { value, disabled, className, children, ...restProps } = props
  const group = useContext(ToggleGroupContext)
  if (!group) throw new Error("ToggleGroup.Item must be rendered inside a ToggleGroup")
  const pressed = group.value.includes(value)
  return (
    <RadixToggleGroup.Item value={value} disabled={disabled} asChild>
      <Button
        className={clsx(s.Item, className)}
        color={pressed ? group.color : "secondary"}
        variant={pressed ? "solid" : "soft"}
        size={group.size}
        pill={group.pill}
        uniform={group.uniform}
        // Inert rather than Button's disabled look, which paints a pressed and a released item alike: a disabled
        // item keeps its state at half opacity (ToggleGroup.module.css). Radix Toggle's own two attributes give way.
        disabled={undefined}
        data-disabled={undefined}
        inert={group.disabled || !!disabled}
        {...restProps}
      >
        {children}
      </Button>
    </RadixToggleGroup.Item>
  )
}

export const ToggleGroup = Object.assign(ToggleGroupRoot, { Item: ToggleGroupItem })
