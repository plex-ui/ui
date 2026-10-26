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

// One entry per cell, "" when empty
function toCells(value: string, length: number): string[] {
  return Array.from({ length }, (_, index) => value[index] ?? "")
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

  // The digit of every cell, so clearing or filling one cell never moves the
  // others; the value is the filled cells' digits in order
  const [cells, setCells] = useState(() => toCells(controlledValue, length))
  const [focusedIndex, setFocusedIndex] = useState(-1)

  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  useImperativeHandle(ref, () => rootRef.current as HTMLDivElement, [])

  const ownCells = useMemo(() => Array.from({ length }, (_, index) => cells[index] ?? ""), [cells, length])
  const currentValue = isControlled ? controlledValue : ownCells.join("")
  // The cells keep their gaps while they spell the value; any other value
  // (set by the parent) fills the cells from the start
  const digits = useMemo(
    () => (ownCells.join("") === currentValue ? ownCells : toCells(currentValue, length)),
    [ownCells, currentValue, length],
  )

  const errorId = `otp-input-${useId()}-error`

  useEffect(() => {
    if (!autoFocus || disabled) return
    inputRefs.current[0]?.focus()
  }, [autoFocus, disabled])

  // The value the field's own last edit produced, until the value changes:
  // a field the user empties keeps the caret where it is
  const ownValueRef = useRef<string | null>(null)

  const commitDigits = useCallback(
    (nextDigits: string[]) => {
      // Kept when controlled too: the parent's value then keeps these gaps
      setCells(nextDigits)
      const nextValue = nextDigits.join("")
      ownValueRef.current = nextValue
      if (nextValue !== currentValue) {
        onChange?.(nextValue)
      }
      if (nextValue.length === length) {
        onComplete?.(nextValue)
      }
    },
    [currentValue, length, onChange, onComplete],
  )

  const focusCell = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, length - 1))
    const input = inputRefs.current[clampedIndex]
    if (!input) return
    input.focus()
    input.setSelectionRange(1, 1)
  }, [length])

  // A field cleared from outside (a wrong code wiped by the form) puts the
  // caret back in the first cell, when the focus was in the field already
  const hadValueRef = useRef(currentValue.length > 0)
  useEffect(() => {
    const filled = currentValue.length > 0
    const fromOutside = ownValueRef.current !== currentValue
    ownValueRef.current = null
    const root = rootRef.current
    if (!filled && hadValueRef.current && fromOutside && !disabled && root?.contains(document.activeElement)) {
      focusCell(0)
    }
    hadValueRef.current = filled
  }, [currentValue, disabled, focusCell])

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

      commitDigits(nextDigits)
      // The cell after the pasted digits
      focusCell(Math.min(writeIndex, length - 1))
    },
    [commitDigits, digits, disabled, focusCell, length],
  )

  const handleChange = useCallback(
    (index: number, evt: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return
      const typedDigits = evt.currentTarget.value.replace(/\D/g, "")

      if (!typedDigits) {
        const nextDigits = [...digits]
        nextDigits[index] = ""
        commitDigits(nextDigits)
        return
      }

      const nextDigits = [...digits]

      if (typedDigits.length === 1) {
        nextDigits[index] = typedDigits[0]
        commitDigits(nextDigits)
        if (index < length - 1) {
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

      commitDigits(nextDigits)
      // The cell after the typed digits
      focusCell(Math.min(writeIndex, length - 1))
    },
    [commitDigits, digits, disabled, focusCell, length],
  )

  const handleKeyDown = useCallback(
    (index: number, evt: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return

      if (evt.key === "Backspace") {
        evt.preventDefault()
        const nextDigits = [...digits]

        if (nextDigits[index]) {
          nextDigits[index] = ""
          commitDigits(nextDigits)
          return
        }

        if (index > 0) {
          nextDigits[index - 1] = ""
          commitDigits(nextDigits)
          focusCell(index - 1)
        }
        return
      }

      if (evt.key === "Delete") {
        evt.preventDefault()
        const nextDigits = [...digits]
        nextDigits[index] = ""
        commitDigits(nextDigits)
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
    [commitDigits, digits, disabled, focusCell],
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
