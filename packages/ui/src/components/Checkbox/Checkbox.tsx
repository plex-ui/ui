"use client"

import clsx from "clsx"
import { Checkbox as RadixCheckbox } from "radix-ui"
import { type FocusEventHandler, type ReactNode, useId } from "react"
import s from "@plexui/styles/components/Checkbox/Checkbox.module.css"

export type CheckboxProps = {
  /** The `id` of the checkbox. */
  id?: string
  /** The state of the checkbox when it is initially rendered. Use when you do not need to control its state. */
  defaultChecked?: boolean | "indeterminate"
  /** The controlled state of the checkbox. Must be used in conjunction with `onCheckedChange`. */
  checked?: boolean | "indeterminate"
  /** Optional accessible label rendered to the right of the checkbox. */
  label?: ReactNode
  /** Optional second line below the label. Linked via `aria-describedby`. */
  description?: ReactNode
  /** Event handler called when the state of the checkbox changes. */
  onCheckedChange?: (nextState: boolean) => void
  /** Event handler called when the checkbox looses focus. */
  onBlur?: FocusEventHandler<HTMLButtonElement>
  /** Event handler called when the checkbox gains focus. */
  onFocus?: FocusEventHandler<HTMLButtonElement>
  /** When `true`, prevents the user from interacting with the checkbox. */
  disabled?: boolean
  /** When `true`, indicates that the user must check the checkbox before the owning form can be submitted. */
  required?: boolean
  /** The name of the checkbox. Submitted with its owning form as part of a name/value pair. */
  name?: string
  /** The value given as data when submitted with a `name`. */
  value?: string
  /** CSS classes applied to wrapper node */
  className?: string
  /**
   * The orientation of the checkbox relative to the label.
   *
   * @default "left"
   */
  orientation?: "left" | "right"
  /**
   * Determines if the checkbox should be a fully rounded pill shape.
   * @default false
   */
  pill?: boolean
  /**
   * Visual style variant for the checkbox indicator.
   * - `"solid"` — filled background when checked (default)
   * - `"ghost"` — no border or background, checkmark only
   * @default "solid"
   */
  variant?: "solid" | "ghost"
}

export const Checkbox = ({
  className,
  label,
  description,
  id: propsId,
  disabled,
  orientation = "left",
  pill = false,
  variant = "solid",
  ...restProps
}: CheckboxProps) => {
  const reactId = useId()
  const id = propsId ?? reactId
  // The description only renders next to a label; it comes before any ids
  // the caller (a Field, say) passes
  const descriptionId = label && description ? `${id}-label-description` : undefined
  const ariaDescribedBy =
    [descriptionId, (restProps as { "aria-describedby"?: string })["aria-describedby"]].filter(Boolean).join(" ") ||
    undefined
  const labelElement = label && (
    <label
      htmlFor={id}
      className={s.Label}
      onMouseDown={(event) => {
        if (!event.defaultPrevented && event.detail > 1) event.preventDefault()
      }}
    >
      {label}
    </label>
  )

  return (
    <div
      data-disabled={disabled ? "" : undefined}
      data-has-label={label ? "" : undefined}
      data-orientation={orientation}
      className={clsx(className, s.Container)}
    >
      <RadixCheckbox.Root
        className={s.Checkbox}
        id={id}
        disabled={disabled}
        data-pill={pill ? "" : undefined}
        data-variant={variant}
        {...restProps}
        aria-describedby={ariaDescribedBy}
      >
        <RadixCheckbox.Indicator className={s.CheckMark} />
      </RadixCheckbox.Root>
      {descriptionId ? (
        <div className={s.LabelGroup}>
          {labelElement}
          <span id={descriptionId} className={s.Description}>
            {description}
          </span>
        </div>
      ) : (
        labelElement
      )}
    </div>
  )
}
