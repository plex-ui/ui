"use client"

import clsx from "clsx"
import {
  Fragment,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"

import { FieldError } from "../FieldError"

import s from "@plexui/styles/components/OTPInput/OTPInput.module.css"

export type OTPInputProps = {
  length?: number
  value?: string
  onChange?: (value: string) => void
  onComplete?: (value: string) => void
  grouping?: number[]
  invalid?: boolean
  errorMessage?: string
  disabled?: boolean
  autoFocus?: boolean
  className?: string
}

function sanitizeDigits(value: string, length: number): string {
  return value.replace(/\D/g, "").slice(0, length)
}

function shouldShowGap(index: number, grouping: number[]): boolean {
  let pos = 0
  for (const groupSize of grouping) {
    pos += groupSize
    if (index === pos) return true
  }
  return false
}

export const OTPInput = forwardRef<HTMLDivElement, OTPInputProps>(function OTPInput(props, ref) {
  const {
    length: lengthProp = 6,
    value,
    onChange,
    onComplete,
    grouping,
    invalid = false,
    errorMessage,
    disabled = false,
    autoFocus = false,
    className,
  } = props

  const length = Math.max(1, Math.floor(lengthProp))
  const controlledValue = useMemo(() => sanitizeDigits(value ?? "", length), [value, length])
  const isControlled = value !== undefined

  const [internalValue, setInternalValue] = useState(() => sanitizeDigits(value ?? "", length))
  const [focusedIndex, setFocusedIndex] = useState(-1)

  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  useImperativeHandle(ref, () => rootRef.current as HTMLDivElement, [])

  useEffect(() => {
    if (isControlled) {
      setInternalValue(controlledValue)
      return
    }
    setInternalValue((current) => sanitizeDigits(current, length))
  }, [controlledValue, isControlled, length])

  const currentValue = isControlled ? controlledValue : internalValue
  const digits = useMemo(
    () => Array.from({ length }, (_, index) => currentValue[index] ?? ""),
    [currentValue, length],
  )

  const errorId = `otp-input-${useId()}-error`

  useEffect(() => {
    if (!autoFocus || disabled) return
    inputRefs.current[0]?.focus()
  }, [autoFocus, disabled])

  const commitValue = useCallback(
    (nextValueRaw: string) => {
      const nextValue = sanitizeDigits(nextValueRaw, length)
      if (!isControlled) {
        setInternalValue(nextValue)
      }
      if (nextValue !== currentValue) {
        onChange?.(nextValue)
      }
      if (nextValue.length === length) {
        onComplete?.(nextValue)
      }
      return nextValue
    },
    [currentValue, isControlled, length, onChange, onComplete],
  )

  const focusCell = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, length - 1))
    const input = inputRefs.current[clampedIndex]
    if (!input) return
    input.focus()
    input.setSelectionRange(1, 1)
  }, [length])

  const handleCellClick = useCallback((index: number) => {
    if (disabled) return
    focusCell(index)
  }, [disabled, focusCell])

  const handlePaste = useCallback(
    (index: number, evt: React.ClipboardEvent<HTMLInputElement>) => {
      if (disabled) return
      evt.preventDefault()
      const pastedDigits = sanitizeDigits(evt.clipboardData.getData("text"), length)
      if (!pastedDigits) return

      const nextDigits = [...digits]
      let writeIndex = index

      for (const digit of pastedDigits) {
        if (writeIndex >= length) break
        nextDigits[writeIndex] = digit
        writeIndex += 1
      }

      const nextValue = commitValue(nextDigits.join(""))
      const nextFocusIndex = Math.min(nextValue.length, length - 1)
      focusCell(nextFocusIndex)
    },
    [commitValue, digits, disabled, focusCell, length],
  )

  const handleChange = useCallback(
    (index: number, evt: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return
      const typedDigits = evt.currentTarget.value.replace(/\D/g, "")

      if (!typedDigits) {
        const nextDigits = [...digits]
        nextDigits[index] = ""
        commitValue(nextDigits.join(""))
        return
      }

      const nextDigits = [...digits]

      if (typedDigits.length === 1) {
        nextDigits[index] = typedDigits[0]
        const nextValue = commitValue(nextDigits.join(""))
        if (index < length - 1 && nextValue.length > index) {
          focusCell(index + 1)
        }
        return
      }

      let writeIndex = index
      for (const digit of typedDigits) {
        if (writeIndex >= length) break
        nextDigits[writeIndex] = digit
        writeIndex += 1
      }

      const nextValue = commitValue(nextDigits.join(""))
      const nextFocusIndex = Math.min(nextValue.length, length - 1)
      focusCell(nextFocusIndex)
    },
    [commitValue, digits, disabled, focusCell, length],
  )

  const handleKeyDown = useCallback(
    (index: number, evt: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return

      if (evt.key === "Backspace") {
        evt.preventDefault()
        const nextDigits = [...digits]

        if (nextDigits[index]) {
          nextDigits[index] = ""
          commitValue(nextDigits.join(""))
          return
        }

        if (index > 0) {
          nextDigits[index - 1] = ""
          commitValue(nextDigits.join(""))
          focusCell(index - 1)
        }
        return
      }

      if (evt.key === "Delete") {
        evt.preventDefault()
        const nextDigits = [...digits]
        nextDigits[index] = ""
        commitValue(nextDigits.join(""))
        return
      }

      if (evt.key === "ArrowLeft") {
        evt.preventDefault()
        focusCell(index - 1)
        return
      }

      if (evt.key === "ArrowRight") {
        evt.preventDefault()
        focusCell(index + 1)
      }
    },
    [commitValue, digits, disabled, focusCell],
  )

  const handleBlur = useCallback(() => {
    requestAnimationFrame(() => {
      const activeElement = document.activeElement
      const isAnyCellFocused = inputRefs.current.some((input) => input === activeElement)
      if (!isAnyCellFocused) {
        setFocusedIndex(-1)
      }
    })
  }, [])

  return (
    <div ref={rootRef} className={clsx(s.Root, className)}>
      <div className={s.Cells}>
        {Array.from({ length }, (_, index) => {
          const isGroupGap = grouping ? shouldShowGap(index, grouping) : false

          return (
            <Fragment key={index}>
              {isGroupGap && <div className={s.GroupGap} aria-hidden />}
              <div
                className={clsx(s.Cell, {
                  [s.CellFocused]: focusedIndex === index,
                  [s.CellFilled]: !!digits[index],
                })}
                data-invalid={invalid ? "" : undefined}
                data-disabled={disabled ? "" : undefined}
                onClick={() => handleCellClick(index)}
              >
                <input
                  ref={(element) => {
                    inputRefs.current[index] = element
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]"
                  maxLength={1}
                  value={digits[index]}
                  disabled={disabled}
                  className={s.CellInput}
                  onChange={(evt) => handleChange(index, evt)}
                  onKeyDown={(evt) => handleKeyDown(index, evt)}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={handleBlur}
                  onPaste={(evt) => handlePaste(index, evt)}
                  aria-label={`Digit ${index + 1}`}
                  aria-invalid={invalid ? true : undefined}
                  aria-describedby={errorMessage ? errorId : undefined}
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                />
                {!digits[index] && focusedIndex !== index && <div className={s.DotPlaceholder} />}
              </div>
            </Fragment>
          )
        })}
      </div>
      {errorMessage && (
        <FieldError id={errorId} className={s.ErrorMessage}>
          {errorMessage}
        </FieldError>
      )}
    </div>
  )
})

OTPInput.displayName = "OTPInput"
