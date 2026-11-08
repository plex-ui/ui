"use client"

import clsx from "clsx"
import { cloneElement, isValidElement, useId, useRef } from "react"

import { FieldRowContext } from "../../lib/fieldRow"
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
   * Hides the label from view; it still names the control for assistive technology.
   * On a `row` the value or placeholder then starts at the row's edge, as an iOS cell that
   * shows only its placeholder or value (Notes, a title, a server's address), so the row is
   * vertical unless `orientation` says otherwise. Words that explain the field go in the
   * FieldGroup's `footer`.
   * @default false
   */
  hideLabel?: boolean
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
   * On a `fill` row, a control at the end of the row, such as a button that adds
   * to a list. It stays on the list's first line, and on a phone it stands beside
   * the label with the list on a line of its own.
   */
  action?: React.ReactNode
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
   * @default "horizontal" on a `row` with a visible label, else "vertical"
   */
  orientation?: "vertical" | "horizontal"
  /**
   * One line of a FieldGroup: label at the start, control at the end, an error
   * under both. Other div props reach the root only on a row, so it can carry
   * a click or data attributes.
   * Clicking a non-interactive part of the row focuses its text editor or activates its choice control or popup trigger.
   * A control at the end of the row is a pill unless its own `pill` says otherwise.
   * @default false
   */
  row?: boolean
  /**
   * On a `row`, the control takes the rest of the line after the label, for a
   * list of tags and the like.
   * @default false
   */
  fill?: boolean
  /**
   * Allows overriding the auto-generated `id`. When provided, this becomes
   * the id set on the child control and the `htmlFor` on the label. A child's
   * own `id` wins over both: it stays, and the label's `htmlFor` follows it.
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
   * - If a single ReactElement, Field clones it with { id, aria-describedby, aria-invalid },
   *   keeping an `id` the child already has.
   *   A child without its own `aria-label`, `aria-labelledby` or `label` also gets
   *   `aria-labelledby` pointing at the label, which names controls the label's
   *   `for` cannot reach, such as the Select and DatePicker triggers.
   * - If a function (render prop), it is called with { id, "aria-labelledby", "aria-describedby", "aria-invalid" }.
   */
  children: React.ReactElement | ((fieldProps: FieldChildProps) => React.ReactNode)
} & Omit<React.ComponentProps<"div">, "children" | "id" | "className">

export function Field({
  label,
  hideLabel = false,
  description,
  errorMessage,
  labelAction,
  action,
  size: sizeProp,
  required = false,
  orientation: orientationProp,
  row = false,
  fill = false,
  opticallyAlign,
  id: idProp,
  className,
  children,
  ...rest
}: FieldProps) {
  const orientation = orientationProp ?? (row && !hideLabel ? "horizontal" : "vertical")
  const generatedId = useId()
  const forwardingRowClick = useRef(false)
  const fieldId = idProp || `field-${generatedId}`
  const labelId = `${fieldId}-label`
  const childProps = isValidElement<{ size?: unknown; id?: string }>(children) ? children.props : undefined
  const childSize = childProps?.size
  const size = sizeProp ?? (CONTROL_SIZES.has(childSize) ? (childSize as ControlSize) : "md")
  // The control's id, which the label's `htmlFor` has to match
  const controlId = childProps?.id || fieldId
  const descriptionId = description ? `${fieldId}-description` : undefined
  const errorId = errorMessage ? `${fieldId}-error` : undefined

  // Build aria-describedby from description + error IDs
  const ariaDescribedBy =
    [descriptionId, errorId].filter(Boolean).join(" ") || undefined

  const invalid = !!errorMessage

  // Props to inject into the child control (`aria-labelledby` is added below:
  // to a render prop's props, and to a cloned child without a name of its own)
  const fieldChildProps: FieldChildProps = {
    id: controlId,
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
    <label className={s.Label} id={labelId} htmlFor={controlId}>
      {label}
      {required && (
        <span className={s.RequiredIndicator} aria-hidden="true">
          *
        </span>
      )}
    </label>
  )

  return (
    <FieldRowContext.Provider value={row && orientation === "horizontal"}>
      <div
        {...(row ? rest : undefined)}
        onClick={row ? (event) => {
          if (forwardingRowClick.current) return
          rest.onClick?.(event)
          if (event.defaultPrevented) return
          const target = event.target
          const root = event.currentTarget
          // The linked control remains the keyboard stop and owns its state.
          // Nested actions keep their own click, including a Select's clear button.
          if (!(target instanceof Element) || target.closest("[data-row]") !== root ||
            target.closest('button, a, input, select, textarea, [role="button"], [role="link"], [contenteditable]:not([contenteditable="false"])')) return
          const linkedControl = root.ownerDocument.getElementById(controlId)
          if (!linkedControl || linkedControl.closest("[data-row]") !== root) return
          // Select's id belongs to its hidden form proxy inside the trigger.
          // Never search sibling popups, such as an InputGroup's unit action.
          const control = linkedControl.matches('input[aria-hidden="true"]')
            ? linkedControl.closest<HTMLElement>(':is(button, [role="button"])[aria-haspopup]:not([aria-haspopup="false"])') ?? linkedControl
            : linkedControl
          if (control.matches(':disabled, [disabled], [data-disabled], [aria-disabled="true"], [data-loading], [aria-busy="true"]')) return
          const label = target.closest("label")
          // Native labels already click their linked form control. A directly
          // linked span trigger, such as DatePicker's, needs forwarding instead.
          if (label && (label.htmlFor !== linkedControl.id || label.control === linkedControl)) return
          // The row is the hit area for its plain editor. Focus only: a synthetic
          // click would also run input actions or disturb native text selection.
          if (control.matches('textarea, input:not([type]), input[type="text"], input[type="email"], input[type="password"], input[type="search"], input[type="tel"], input[type="url"], input[type="number"]') &&
            !control.matches('[hidden], [aria-hidden="true"]')) {
            control.focus({ preventScroll: true })
            return
          }
          if (!control.matches('button[role="radio"], button[role="checkbox"], button[role="switch"], input[type="radio"], input[type="checkbox"], :is(button, [role="button"])[aria-haspopup]:not([aria-haspopup="false"])')) return
          forwardingRowClick.current = true
          try {
            control.focus({ preventScroll: true })
            control.click()
          } finally {
            // Form controls can bubble their hidden input click after the render flush.
            queueMicrotask(() => { forwardingRowClick.current = false })
          }
        } : undefined}
        className={clsx(s.Field, className)}
        data-slot="field"
        data-size={size}
        data-orientation={orientation}
        data-optically-align={opticallyAlign}
        data-row={row ? "" : undefined}
        data-fill={fill ? "" : undefined}
        data-label-hidden={hideLabel ? "" : undefined}
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
        {row && action ? <div className={s.Action}>{action}</div> : null}
      </div>
    </FieldRowContext.Provider>
  )
}
