"use client"

import clsx from "clsx"
import { cloneElement, isValidElement, useId } from "react"

import type { ControlSize } from "../../types"
import { FieldError } from "../FieldError"

import s from "@plexui/styles/components/Field/Field.module.css"

export type FieldChildProps = {
  id: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
  opticallyAlign?: "start" | "end"
}

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
   * Controls the font size of the label to visually match the child control's size.
   * Matches the ControlSize scale used by Input, Select, etc.
   * @default "md"
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
   * - If a function (render prop), it is called with { id, "aria-describedby", "aria-invalid" }.
   */
  children: React.ReactElement | ((fieldProps: FieldChildProps) => React.ReactNode)
}

export function Field({
  label,
  description,
  errorMessage,
  size = "md",
  required = false,
  orientation = "vertical",
  opticallyAlign,
  id: idProp,
  className,
  children,
}: FieldProps) {
  const generatedId = useId()
  const fieldId = idProp || `field-${generatedId}`
  const descriptionId = description ? `${fieldId}-description` : undefined
  const errorId = errorMessage ? `${fieldId}-error` : undefined

  // Build aria-describedby from description + error IDs
  const ariaDescribedBy =
    [descriptionId, errorId].filter(Boolean).join(" ") || undefined

  const invalid = !!errorMessage

  // Props to inject into the child control
  const fieldChildProps: FieldChildProps = {
    id: fieldId,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": invalid || undefined,
    ...(opticallyAlign && { opticallyAlign }),
  }

  // Resolve the children
  let resolvedChildren: React.ReactNode
  if (typeof children === "function") {
    resolvedChildren = children(fieldChildProps)
  } else if (isValidElement(children)) {
    resolvedChildren = cloneElement(
      children as React.ReactElement<Record<string, unknown>>,
      fieldChildProps,
    )
  } else {
    resolvedChildren = children
  }

  return (
    <div
      className={clsx(s.Field, className)}
      data-size={size}
      data-orientation={orientation}
      data-optically-align={opticallyAlign}
    >
      <div className={s.LabelGroup}>
        <label className={s.Label} htmlFor={fieldId}>
          {label}
          {required && (
            <span className={s.RequiredIndicator} aria-hidden="true">
              *
            </span>
          )}
        </label>
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
