"use client"

import clsx from "clsx"
import { cloneElement, isValidElement, useId } from "react"

import type { ControlSize } from "../../types"
import { FieldError } from "../FieldError"

import s from "@plexui/styles/components/Field/Field.module.css"

export type FieldChildProps = {
  id: string
  /** The label's id. Spread onto a control that the label's `for` cannot name, such as a Select trigger. */
  "aria-labelledby"?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
  opticallyAlign?: "start" | "end"
}

const CONTROL_SIZES: ReadonlySet<unknown> = new Set(["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl"])

export type FieldProps = {
  /**
   * Label text for the field
   */
  label: React.ReactNode
  /**
   * Helper/description text displayed below the label.
   * Automatically linked via aria-describedby.
   */
  description?: React.ReactNode
  /**
   * Error message displayed below the control.
   * When provided, the child control receives aria-invalid="true".
   * Uses the existing FieldError component internally.
   */
  errorMessage?: React.ReactNode
  /**
   * Content placed at the end of the label row, such as a link that acts on
   * the field ("Forgot password?", "Replace").
   */
  labelAction?: React.ReactNode
  /**
   * Controls the font size of the label to visually match the child control's size.
   * Matches the ControlSize scale used by Input, Select, etc.
   * @default the child control's `size`, else "md"
   */
  size?: ControlSize
  /**
   * Display a required indicator (asterisk) after the label.
   * This is purely visual — it does not add the `required` HTML attribute.
   * @default false
   */
  required?: boolean
  /**
   * Layout direction of label and control.
   * - "vertical": label stacked above control (default)
   * - "horizontal": label beside control
   * @default "vertical"
   */
  orientation?: "vertical" | "horizontal"
  /**
   * Allows overriding the auto-generated `id`. When provided, this becomes
   * the id set on the child control and the `htmlFor` on the label.
   */
  id?: string
  /**
   * Applies a negative margin on the child control using its gutter to
   * optically align the control's text with surrounding content.
   * Passed through to the child control via cloneElement / render prop.
   */
  opticallyAlign?: "start" | "end"
  /**
   * CSS class applied to the root wrapper
   */
  className?: string
  /**
   * The form control(s) to render.
   * - If a single ReactElement, Field clones it with { id, aria-describedby, aria-invalid }.
   *   A child without its own `aria-label`, `aria-labelledby` or `label` also gets
   *   `aria-labelledby` pointing at the label, which names controls the label's
   *   `for` cannot reach, such as the Select and DatePicker triggers.
   * - If a function (render prop), it is called with { id, "aria-labelledby", "aria-describedby", "aria-invalid" }.
   */
  children: React.ReactElement | ((fieldProps: FieldChildProps) => React.ReactNode)
}

export function Field({
  label,
  description,
  errorMessage,
  labelAction,
  size: sizeProp,
  required = false,
  orientation = "vertical",
  opticallyAlign,
  id: idProp,
  className,
  children,
}: FieldProps) {
  const generatedId = useId()
  const fieldId = idProp || `field-${generatedId}`
  const labelId = `${fieldId}-label`
  const childSize = isValidElement<{ size?: unknown }>(children) ? children.props.size : undefined
  const size = sizeProp ?? (CONTROL_SIZES.has(childSize) ? (childSize as ControlSize) : "md")
  const descriptionId = description ? `${fieldId}-description` : undefined
  const errorId = errorMessage ? `${fieldId}-error` : undefined

  // Build aria-describedby from description + error IDs
  const ariaDescribedBy =
    [descriptionId, errorId].filter(Boolean).join(" ") || undefined

  const invalid = !!errorMessage

  // Props to inject into the child control (`aria-labelledby` is added below:
  // to a render prop's props, and to a cloned child without a name of its own)
  const fieldChildProps: FieldChildProps = {
    id: fieldId,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": invalid || undefined,
    ...(opticallyAlign && { opticallyAlign }),
  }

  // Resolve the children
  let resolvedChildren: React.ReactNode
  if (typeof children === "function") {
    resolvedChildren = children({ ...fieldChildProps, "aria-labelledby": labelId })
  } else if (isValidElement(children)) {
    const child = children as React.ReactElement<Record<string, unknown>>
    // Merge with the child's own associations instead of overwriting them
    const childDescribedBy = child.props["aria-describedby"] as string | undefined
    const childNamed =
      child.props["aria-label"] != null || child.props["aria-labelledby"] != null || child.props.label != null
    resolvedChildren = cloneElement(child, {
      ...fieldChildProps,
      "aria-describedby":
        [childDescribedBy, ariaDescribedBy].filter(Boolean).join(" ") || undefined,
      "aria-invalid": child.props["aria-invalid"] ?? fieldChildProps["aria-invalid"],
      ...(!childNamed && { "aria-labelledby": labelId }),
    })
  } else {
    resolvedChildren = children
  }

  const labelElement = (
    <label className={s.Label} id={labelId} htmlFor={fieldId}>
      {label}
      {required && (
        <span className={s.RequiredIndicator} aria-hidden="true">
          *
        </span>
      )}
    </label>
  )

  return (
    <div
      className={clsx(s.Field, className)}
      data-size={size}
      data-orientation={orientation}
      data-optically-align={opticallyAlign}
    >
      <div className={s.LabelGroup}>
        {labelAction ? (
          <div className={s.LabelRow}>
            {labelElement}
            <div className={s.LabelAction}>{labelAction}</div>
          </div>
        ) : (
          labelElement
        )}
        {description && (
          <div className={s.Description} id={descriptionId}>
            {description}
          </div>
        )}
      </div>
      <div className={s.Content}>
        <div className={s.Control}>{resolvedChildren}</div>
        {errorMessage && (
          <FieldError id={errorId}>{errorMessage}</FieldError>
        )}
      </div>
    </div>
  )
}
