"use client"

import clsx from "clsx"
import { forwardRef, useCallback, useId } from "react"

import { FieldError } from "../FieldError"
import { Button } from "../Button"
import { Dropdown, X } from "../Icon"

import s from "./FloatingLabelSelect.module.css"

export type FloatingLabelSelectProps = {
  label: string
  selected?: boolean
  errorMessage?: string
  invalid?: boolean
  disabled?: boolean
  open?: boolean
  onInteract?: () => void
  onClearClick?: () => void
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
      children,
      className,
      "aria-describedby": ariaDescribedByProp,
      onKeyDown,
      ...restProps
    } = props

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
        onKeyDown?.(evt)
        // Keys from nested controls (the clear button) are theirs to handle
        if (disabled || evt.target !== evt.currentTarget) return

        switch (evt.key) {
          case "ArrowDown":
          case "ArrowUp":
          case " ":
            evt.stopPropagation()
            evt.preventDefault()
            onInteract?.()
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
        onClearClick?.()
      },
      [onClearClick],
    )

    return (
      <div className={clsx(s.Root, className)} ref={ref}>
        <div
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
          aria-invalid={invalid ? true : undefined}
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
