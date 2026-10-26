"use client"

import clsx from "clsx"
import { forwardRef, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { mergeRefs } from "react-merge-refs"

import { Eye, EyeOff, X } from "../Icon"

import s from "@plexui/styles/components/FloatingLabelInput/FloatingLabelInput.module.css"

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
   * Helper/description text displayed below the input.
   * Shown alongside the error message when both are present.
   */
  description?: React.ReactNode
  /**
   * Content rendered before the input.
   */
  startAdornment?: React.ReactNode
  /**
   * Content rendered after the input, before the clear button.
   * For password fields the reveal toggle is built in — see `revealable`.
   */
  endAdornment?: React.ReactNode
  /**
   * Render a built-in reveal/hide toggle (eye icon) inside the field.
   * For `type="password"` it swaps the input between `password` and `text`.
   * Defaults to `true` for password inputs that don't supply their own
   * `endAdornment`. Pass it explicitly to add the toggle to other sensitive
   * fields (e.g. a masked SSN) and react to it via `onRevealedChange`.
   * @default true when type="password" and no endAdornment is provided
   */
  revealable?: boolean
  /**
   * Called with the new revealed state each time the reveal toggle is clicked.
   */
  onRevealedChange?: (revealed: boolean) => void
  /**
   * Render as a multi-line textarea instead of a single-line input.
   * @default false
   */
  multiline?: boolean
  /**
   * Number of visible text lines when `multiline` is true.
   * @default 2
   */
  rows?: number
} & React.InputHTMLAttributes<HTMLInputElement>

// Attributes that only mean something on <input>; everything else (required,
// maxLength, placeholder, key and clipboard handlers, aria-*, data-*) also
// applies to the multiline <textarea>
const INPUT_ONLY_PROPS = [
  "accept", "alt", "capture", "checked", "height", "list", "max", "min", "multiple",
  "pattern", "size", "src", "step", "width", "formAction", "formEncType",
  "formMethod", "formNoValidate", "formTarget",
] as const

const textareaProps = (props: Record<string, unknown>) => {
  const rest = { ...props }
  for (const key of INPUT_ONLY_PROPS) delete rest[key]
  return rest
}

export const FloatingLabelInput = forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  function FloatingLabelInput(props, ref) {
    const {
      label,
      description,
      errorMessage,
      "invalid": invalidProp,
      disabled = false,
      readOnly = false,
      onClear,
      onAutofill,
      allowAutofillExtensions = false,
      startAdornment,
      endAdornment,
      revealable: revealableProp,
      onRevealedChange,
      multiline = false,
      rows = 2,
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
      ...restProps
    } = props

    const inputRef = useRef<HTMLInputElement | null>(null)
    const generatedId = useId()
    const inputId = idProp || `floating-label-input-${generatedId}`
    const descriptionId = description ? `${inputId}-description` : undefined
    const errorId = errorMessage ? `${inputId}-error` : undefined

    const [focused, setFocused] = useState(false)
    const [hasValue, setHasValue] = useState(() => {
      return !!(value !== undefined ? value : defaultValue)
    })
    const [revealed, setRevealed] = useState(false)

    // Sync hasValue with controlled value prop
    useEffect(() => {
      if (value !== undefined) {
        setHasValue(!!value)
      }
    }, [value])

    const autoResize = useCallback(() => {
      const el = inputRef.current
      if (!multiline || !el) return
      el.style.height = "auto"
      el.style.height = `${el.scrollHeight}px`
    }, [multiline])

    // Also resize when a controlled value or rows changes without a keystroke
    useLayoutEffect(() => {
      autoResize()
    }, [autoResize, value, rows])

    const invalid = invalidProp ?? !!errorMessage

    // Determine if clear button should be shown
    const showClearButton = !!onClear && hasValue && !disabled && !readOnly

    // Built-in password reveal toggle
    const isPassword = type === "password"
    const revealable = revealableProp ?? (isPassword && !endAdornment)
    const showRevealButton = revealable && !disabled
    const effectiveType = isPassword && revealed ? "text" : type

    // Merge aria-describedby with error id
    const ariaDescribedBy =
      [ariaDescribedByProp, errorId, descriptionId].filter(Boolean).join(" ") || undefined
    // An explicit aria-invalid (e.g. from Field) wins over the computed state
    const ariaInvalid = restProps["aria-invalid"] ?? (invalid ? true : undefined)

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
      // email, number and other types without the selection API throw on setSelectionRange
      if (input.selectionStart === null) return
      const length = input.value.length
      input.setSelectionRange(length, length)
    }, [])

    // The clear button unmounts once the value is gone, so keep focus in the field
    const handleClear = useCallback(
      (evt: React.MouseEvent<HTMLButtonElement>) => {
        inputRef.current?.focus()
        ;(onClear as React.MouseEventHandler<HTMLButtonElement> | undefined)?.(evt)
      },
      [onClear],
    )

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
        autoResize()
      },
      [onChange, autoResize],
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

    const handleRevealToggle = useCallback(() => {
      setRevealed((prev) => {
        const next = !prev
        onRevealedChange?.(next)
        return next
      })
    }, [onRevealedChange])

    return (
      <div className={clsx(s.Root, className)}>
        <div
          className={clsx(s.FieldFootprint, {
            [s.HasValue]: hasValue || !!startAdornment,
          })}
          data-focused={focused ? "" : undefined}
          data-has-value={hasValue ? "" : undefined}
          data-invalid={invalid ? "" : undefined}
          data-disabled={disabled ? "" : undefined}
          data-readonly={readOnly ? "" : undefined}
          data-multiline={multiline ? "" : undefined}
          onMouseDown={handleContainerMouseDown}
        >
          <label className={s.TypeableLabel} htmlFor={inputId}>
            <div className={s.LabelPositioner}>
              <div className={s.LabelText}>{label}</div>
            </div>
          </label>
          {startAdornment && (
            <div className={s.StartAdornment}>{startAdornment}</div>
          )}
          {multiline ? (
            <textarea
              {...(textareaProps(restProps) as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
              ref={mergeRefs([ref, inputRef]) as React.Ref<HTMLTextAreaElement>}
              id={inputId}
              name={name}
              rows={rows}
              className={s.Textarea}
              value={value}
              defaultValue={defaultValue}
              disabled={disabled}
              readOnly={readOnly}
              aria-invalid={ariaInvalid}
              aria-describedby={ariaDescribedBy}
              onChange={handleChange as unknown as React.ChangeEventHandler<HTMLTextAreaElement>}
              onFocus={handleFocus as unknown as React.FocusEventHandler<HTMLTextAreaElement>}
              onBlur={handleBlur as unknown as React.FocusEventHandler<HTMLTextAreaElement>}
            />
          ) : (
            <input
              {...restProps}
              ref={mergeRefs([ref, inputRef])}
              id={inputId}
              name={name}
              type={effectiveType}
              className={s.Input}
              value={value}
              defaultValue={defaultValue}
              disabled={disabled}
              readOnly={readOnly}
              aria-invalid={ariaInvalid}
              aria-describedby={ariaDescribedBy}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onAnimationStart={handleAnimationStart}
              data-lpignore={allowAutofillExtensions ? undefined : true}
              data-1p-ignore={allowAutofillExtensions ? undefined : true}
            />
          )}
          {endAdornment && (
            <div className={s.EndAdornment}>
              {endAdornment}
            </div>
          )}
          {showClearButton && (
            <button
              type="button"
              aria-label="Clear input"
              className={s.ClearButton}
              onClick={handleClear}
            >
              <X />
            </button>
          )}
          {showRevealButton && (
            <button
              type="button"
              aria-label={revealed ? "Hide" : "Show"}
              className={s.RevealButton}
              onClick={handleRevealToggle}
            >
              {revealed ? <EyeOff /> : <Eye />}
            </button>
          )}
        </div>
        {errorMessage && (
          <div id={errorId} className={s.ErrorMessage} role="alert">
            {errorMessage}
          </div>
        )}
        {description && (
          <div id={descriptionId} className={s.Description}>
            {description}
          </div>
        )}
      </div>
    )
  },
)

FloatingLabelInput.displayName = "FloatingLabelInput"
