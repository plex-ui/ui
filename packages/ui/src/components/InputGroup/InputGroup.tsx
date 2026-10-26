"use client"

import clsx from "clsx"
import {
  createContext,
  useContext,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type Ref,
  type TextareaHTMLAttributes,
} from "react"
import { type ControlSize, type Variants } from "../../types"
import { Button, type ButtonProps } from "../Button"
import s from "@plexui/styles/components/InputGroup/InputGroup.module.css"

type InputGroupContextValue = {
  size: ControlSize
  pill: boolean
  disabled: boolean
  invalid: boolean
}

const InputGroupContext = createContext<InputGroupContextValue | null>(null)

const CONTROL_SELECTOR = "[data-slot='input-group-control']"

/** Button size for each group size: the closest Button that fits inside the control */
const BUTTON_SIZE: Record<ControlSize, ControlSize> = {
  "3xs": "3xs",
  "2xs": "3xs",
  "xs": "3xs",
  "sm": "3xs",
  "md": "2xs",
  "lg": "sm",
  "xl": "md",
  "2xl": "lg",
  "3xl": "xl",
}

/* ------------------------------------------------------------------ */
/*  Root                                                               */
/* ------------------------------------------------------------------ */

export type InputGroupProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * Visual style of the group
   * @default outline
   */
  variant?: Variants<"outline" | "soft">
  /**
   * Controls the size of the group, on the same scale as Input
   *
   * | 3xs     | 2xs     | xs      | sm      | md      | lg      | xl      | 2xl     | 3xl     |
   * | ------- | ------- | ------- | ------- | ------- | ------- | ------- | ------- | ------- |
   * | `22px`  | `24px`  | `26px`  | `28px`  | `32px`  | `36px`  | `40px`  | `44px`  | `48px`  |
   *
   * @default md
   */
  size?: ControlSize
  /**
   * Fully rounded group, with pill buttons inside
   * @default false
   */
  pill?: boolean
  /**
   * Disables the control and the buttons inside the group
   * @default false
   */
  disabled?: boolean
  /**
   * Mark the group as invalid
   * @default false
   */
  invalid?: boolean
  ref?: Ref<HTMLDivElement>
}

const InputGroupRoot = ({
  variant = "outline",
  size = "md",
  pill = false,
  disabled = false,
  invalid = false,
  className,
  onMouseDown,
  ref,
  ...restProps
}: InputGroupProps) => {
  // Clicks on the frame, icons and text focus the control, as in Input
  const handleMouseDown = (evt: React.MouseEvent<HTMLDivElement>) => {
    onMouseDown?.(evt)
    const control = evt.currentTarget.querySelector<HTMLElement>(CONTROL_SELECTOR)
    const { target } = evt
    if (evt.defaultPrevented || !control || !(target instanceof Element) || control.contains(target)) {
      return
    }
    // Buttons, links, menus and other controls in the addons take their own clicks
    if (target.closest("button, a, input, textarea, select, [role='button'], [role='menuitem']")) {
      return
    }
    evt.preventDefault()
    control.focus()
  }

  return (
    <InputGroupContext.Provider value={{ size, pill, disabled, invalid }}>
      <div
        ref={ref}
        role="group"
        data-slot="input-group"
        data-variant={variant}
        data-size={size}
        data-pill={pill ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        data-invalid={invalid ? "" : undefined}
        className={clsx(s.InputGroup, className)}
        onMouseDown={handleMouseDown}
        {...restProps}
      />
    </InputGroupContext.Provider>
  )
}

/* ------------------------------------------------------------------ */
/*  Input / Textarea: the native control, framed by the group          */
/* ------------------------------------------------------------------ */

export type InputGroupInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  ref?: Ref<HTMLInputElement>
}

const InputGroupInput = ({ type = "text", disabled, className, ref, ...restProps }: InputGroupInputProps) => {
  const group = useContext(InputGroupContext)
  return (
    <input
      ref={ref}
      type={type}
      data-slot="input-group-control"
      className={clsx(s.Control, className)}
      disabled={disabled ?? group?.disabled}
      // Expose the group's invalid state to assistive tech; an explicit aria-invalid wins
      aria-invalid={restProps["aria-invalid"] ?? (group?.invalid || undefined)}
      {...restProps}
    />
  )
}

export type InputGroupTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  ref?: Ref<HTMLTextAreaElement>
}

const InputGroupTextarea = ({ rows = 3, disabled, className, ref, ...restProps }: InputGroupTextareaProps) => {
  const group = useContext(InputGroupContext)
  return (
    <textarea
      ref={ref}
      rows={rows}
      data-slot="input-group-control"
      className={clsx(s.Control, className)}
      disabled={disabled ?? group?.disabled}
      aria-invalid={restProps["aria-invalid"] ?? (group?.invalid || undefined)}
      {...restProps}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  Addon: icons, text and buttons beside, above or below the control  */
/* ------------------------------------------------------------------ */

export type InputGroupAddonAlign = "inline-start" | "inline-end" | "block-start" | "block-end"

export type InputGroupAddonProps = HTMLAttributes<HTMLDivElement> & {
  /**
   * Where the addon sits: before or after the control on its line, or as a
   * row above or below it. Inline addons suit `InputGroup.Input`, block
   * addons suit `InputGroup.Textarea` and labels.
   * @default "inline-start"
   */
  align?: InputGroupAddonAlign
  ref?: Ref<HTMLDivElement>
}

const InputGroupAddon = ({ align = "inline-start", className, ref, ...restProps }: InputGroupAddonProps) => (
  <div
    ref={ref}
    data-slot="input-group-addon"
    data-align={align}
    className={clsx(s.Addon, className)}
    {...restProps}
  />
)

/* ------------------------------------------------------------------ */
/*  Button: a ghost Button sized from the group                        */
/* ------------------------------------------------------------------ */

export type InputGroupButtonProps = Omit<ButtonProps, "color" | "size"> & {
  /**
   * Color for the button
   * @default secondary
   */
  color?: ButtonProps["color"]
}

const InputGroupButton = ({
  color = "secondary",
  variant = "ghost",
  pill,
  disabled,
  className,
  ...restProps
}: InputGroupButtonProps) => {
  const group = useContext(InputGroupContext)
  return (
    <Button
      color={color}
      variant={variant}
      size={BUTTON_SIZE[group?.size ?? "md"]}
      pill={pill ?? group?.pill}
      disabled={disabled ?? group?.disabled}
      className={clsx(s.Button, className)}
      {...restProps}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  Text: plain text inside an addon (prefixes, units, counters)       */
/* ------------------------------------------------------------------ */

export type InputGroupTextProps = HTMLAttributes<HTMLSpanElement> & {
  ref?: Ref<HTMLSpanElement>
}

const InputGroupText = ({ className, ref, ...restProps }: InputGroupTextProps) => (
  <span ref={ref} data-slot="input-group-text" className={clsx(s.Text, className)} {...restProps} />
)

/* ------------------------------------------------------------------ */
/*  Export: compound API                                               */
/* ------------------------------------------------------------------ */

type InputGroupComponent = typeof InputGroupRoot & {
  Input: typeof InputGroupInput
  Textarea: typeof InputGroupTextarea
  Addon: typeof InputGroupAddon
  Button: typeof InputGroupButton
  Text: typeof InputGroupText
}

export const InputGroup = InputGroupRoot as InputGroupComponent
InputGroup.Input = InputGroupInput
InputGroup.Textarea = InputGroupTextarea
InputGroup.Addon = InputGroupAddon
InputGroup.Button = InputGroupButton
InputGroup.Text = InputGroupText
