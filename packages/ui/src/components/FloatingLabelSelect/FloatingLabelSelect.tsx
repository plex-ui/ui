"use client"

import clsx from "clsx"
import { forwardRef, useCallback, useId, useRef } from "react"
import { mergeRefs } from "react-merge-refs"

import { Button } from "../Button"
import { Dropdown, X } from "../Icon"
import { FieldError } from "../FieldError"

import s from "@plexui/styles/components/FloatingLabelSelect/FloatingLabelSelect.module.css"

export type FloatingLabelSelectProps = {
  label: string
  selected?: boolean
  errorMessage?: string
  invalid?: boolean
  disabled?: boolean
  open?: boolean
  onInteract?: () => void
  onClearClick?: () => void
  /**
   * Where the label rests once it floats: on the border, or inside the box
   * with the value under it. `inside` always takes the rounded box.
   * @default "border"
   */
  labelPlacement?: "border" | "inside"
  /**
   * Pill shape. `false` takes the rounded box of the other fields.
   * @default true
   */
  pill?: boolean
  children?: React.ReactNode
  className?: string
  "aria-describedby"?: string
} & Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children" | "role" | "tabIndex" | "aria-describedby"
>

export const FloatingLabelSelect = forwardRef<HTMLDivElement, FloatingLabelSelectProps>(
  function FloatingLabelSelect(props, ref) {
    const {
      label,
      selected = false,
      errorMessage,
      "invalid": invalidProp,
      disabled = false,
      open = false,
      onInteract,
      onClearClick,
      labelPlacement = "border",
      pill = true,
      children,
      className,
      "aria-describedby": ariaDescribedByProp,
      onKeyDown,
      ...restProps
    } = props

    const fieldRef = useRef<HTMLDivElement>(null)
    const generatedId = useId()
    const errorId = `floating-label-select-${generatedId}-error`

    const invalid = invalidProp ?? !!errorMessage

    const showClearButton = !!onClearClick && selected && !disabled

    const ariaDescribedBy =
      [ariaDescribedByProp, errorMessage ? errorId : undefined].filter(Boolean).join(" ") ||
      undefined

    const handlePointerDown = useCallback(
      (evt: React.PointerEvent<HTMLDivElement>) => {
        if (evt.button === 2 || disabled) return
        evt.preventDefault()
        onInteract?.()
      },
      [disabled, onInteract],
    )

    const handleKeyDown = useCallback(
      (evt: React.KeyboardEvent<HTMLDivElement>) => {
        // Enter and Space on a nested control (the clear button) activate that
        // control: neither this handler nor a wrapping trigger's may take them
        if (evt.target !== evt.currentTarget && (evt.key === " " || evt.key === "Enter")) return
        onKeyDown?.(evt)
        // A handler that prevented the default (the caller's, or a wrapping
        // Menu.Trigger's that opened its menu) cancels the built-in handling
        if (disabled || evt.defaultPrevented) return

        switch (evt.key) {
          case "ArrowDown":
          case "ArrowUp":
          case " ":
          case "Enter":
            // Enter activates the field only without onInteract, as it
            // would the button a wrapping trigger usually renders
            if (evt.key === "Enter" && onInteract) break
            evt.stopPropagation()
            evt.preventDefault()
            if (onInteract) {
              onInteract()
            } else {
              // A wrapping trigger (Select's `trigger`, a Popover.Trigger) opens on click
              evt.currentTarget.click()
            }
            break
        }
      },
      [disabled, onInteract, onKeyDown],
    )

    const handleClearPointerDown = useCallback((evt: React.PointerEvent<HTMLButtonElement>) => {
      evt.stopPropagation()
    }, [])

    const handleClearClick = useCallback(
      (evt: React.MouseEvent<HTMLButtonElement>) => {
        evt.stopPropagation()
        evt.preventDefault()
        if (disabled) return
        // Keep focus in the field before its clear button disappears.
        fieldRef.current?.focus({ preventScroll: true })
        onClearClick?.()
      },
      [disabled, onClearClick],
    )

    return (
      <div
        className={clsx(s.Root, className)}
        data-label-placement={labelPlacement === "inside" ? "inside" : undefined}
        data-pill={pill && labelPlacement !== "inside" ? "" : undefined}
      >
        <div
          // The ref is the focusable field: a wrapping trigger returns focus to it and anchors to it
          ref={mergeRefs([fieldRef, ref])}
          className={clsx(s.FieldFootprint, {
            [s.HasValue]: selected,
          })}
          role="button"
          tabIndex={disabled ? -1 : 0}
          data-open={open ? "" : undefined}
          data-invalid={invalid ? "" : undefined}
          data-disabled={disabled ? "" : undefined}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-describedby={ariaDescribedBy}
          aria-disabled={disabled || undefined}
          onPointerDown={handlePointerDown}
          onKeyDown={handleKeyDown}
          {...restProps}
        >
          <div className={s.TypeableLabel}>
            <div className={s.LabelPositioner}>
              <div className={s.LabelText}>{label}</div>
            </div>
          </div>
          <span className={s.Content}>{selected ? children : null}</span>
          <div className={s.IndicatorWrapper}>
            {showClearButton && (
              <Button
                aria-label="Clear selection"
                className={s.Clear}
                onPointerDown={handleClearPointerDown}
                onClick={handleClearClick}
                color="secondary"
                variant="ghost"
                size="3xs"
                uniform
                pill
              >
                <X />
              </Button>
            )}
            <Dropdown className={s.DropdownIcon} />
          </div>
        </div>
        {errorMessage && (
          <FieldError id={errorId} className={s.ErrorMessage}>
            {errorMessage}
          </FieldError>
        )}
      </div>
    )
  },
)

FloatingLabelSelect.displayName = "FloatingLabelSelect"
