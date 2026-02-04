"use client"

import clsx from "clsx"
import { useCallback, useEffect, useId, useRef, useState } from "react"
import { mergeRefs } from "react-merge-refs"

import { FieldError } from "../FieldError"
import { X } from "../Icon"

import s from "./FloatingLabelInput.module.css"

export type FloatingLabelInputProps = {
  /**
   * Label text for the floating label
   */
  label: string
  /**
   * Error message to display below the input
   */
  errorMessage?: string
  /**
   * Mark the input as invalid
   * @default false (or true if errorMessage is provided)
   */
  invalid?: boolean
  /**
   * Disables the input visually and from interactions
   * @default false
   */
  disabled?: boolean
  /**
   * Makes the input read-only
   * @default false
   */
  readOnly?: boolean
  /**
   * Callback invoked when the clear button is clicked
   */
  onClear?: () => void
  /**
   * Callback invoked when the input is autofilled by the browser
   */
  onAutofill?: () => void
  /**
   * Allow autofill extensions to appear in the input
   * @default false
   */
  allowAutofillExtensions?: boolean
  /**
   * Ref for the input element
   */
  ref?: React.Ref<HTMLInputElement | null>
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "placeholder">

export function FloatingLabelInput(props: FloatingLabelInputProps) {
  const {
    label,
    errorMessage,
    "invalid": invalidProp,
    disabled = false,
    readOnly = false,
    onClear,
    onAutofill,
    allowAutofillExtensions = false,
    className,
    "id": idProp,
    name,
    type = "text",
    value,
    defaultValue,
    onChange,
    onFocus,
    onBlur,
    onAnimationStart,
    "aria-describedby": ariaDescribedByProp,
    ref,
    ...restProps
  } = props

  const inputRef = useRef<HTMLInputElement | null>(null)
  const generatedId = useId()
  const inputId = idProp || `floating-label-input-${generatedId}`
  const errorId = `${inputId}-error`

  const [focused, setFocused] = useState(false)
  const [hasValue, setHasValue] = useState(() => {
    return !!(value !== undefined ? value : defaultValue)
  })

  // Sync hasValue with controlled value prop
  useEffect(() => {
    if (value !== undefined) {
      setHasValue(!!value)
    }
  }, [value])

  // Determine invalid state from prop or presence of errorMessage
  const invalid = invalidProp ?? !!errorMessage

  // Determine if clear button should be shown
  const showClearButton = !!onClear && hasValue && !disabled && !readOnly

  // Merge aria-describedby with error id
  const ariaDescribedBy =
    [ariaDescribedByProp, errorMessage ? errorId : undefined].filter(Boolean).join(" ") || undefined

  // Handle clicks on the container to focus the input
  const handleContainerMouseDown = useCallback((evt: React.MouseEvent<HTMLDivElement>) => {
    const input = inputRef.current
    if (!evt.target || !(evt.target instanceof Element) || !input) {
      return
    }
    if (input.contains(evt.target)) {
      return
    }
    if (evt.target.closest("button, [type='button'], [role='button']")) {
      return
    }
    evt.preventDefault()
    if (document.activeElement !== input) {
      input.focus()
    }
    const length = input.value.length
    input.setSelectionRange(length, length)
  }, [])

  const handleFocus = useCallback(
    (evt: React.FocusEvent<HTMLInputElement>) => {
      setFocused(true)
      onFocus?.(evt)
    },
    [onFocus],
  )

  const handleBlur = useCallback(
    (evt: React.FocusEvent<HTMLInputElement>) => {
      setFocused(false)
      onBlur?.(evt)
    },
    [onBlur],
  )

  const handleChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!evt.currentTarget.value)
      onChange?.(evt)
    },
    [onChange],
  )

  const handleAnimationStart = useCallback(
    (evt: React.AnimationEvent<HTMLInputElement>) => {
      onAnimationStart?.(evt)
      // Detect browser autofill
      if (evt.animationName === "native-autofill-in") {
        setHasValue(true)
        onAutofill?.()
      }
    },
    [onAnimationStart, onAutofill],
  )

  return (
    <div className={clsx(s.Root, className)}>
      <div
        className={clsx(s.FieldFootprint, {
          [s.HasValue]: hasValue,
        })}
        data-focused={focused ? "" : undefined}
        data-has-value={hasValue ? "" : undefined}
        data-invalid={invalid ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        data-readonly={readOnly ? "" : undefined}
        onMouseDown={handleContainerMouseDown}
      >
        <label className={s.TypeableLabel} htmlFor={inputId}>
          <div className={s.LabelPositioner}>
            <div className={s.LabelText}>{label}</div>
          </div>
        </label>
        <input
          {...restProps}
          ref={mergeRefs([ref, inputRef])}
          id={inputId}
          name={name}
          type={type}
          className={s.Input}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={ariaDescribedBy}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onAnimationStart={handleAnimationStart}
          data-lpignore={allowAutofillExtensions ? undefined : true}
          data-1p-ignore={allowAutofillExtensions ? undefined : true}
        />
        {showClearButton && (
          <button
            type="button"
            aria-label="Clear input"
            className={s.ClearButton}
            onClick={onClear}
          >
            <X />
          </button>
        )}
      </div>
      {errorMessage && <FieldError id={errorId}>{errorMessage}</FieldError>}
    </div>
  )
}
