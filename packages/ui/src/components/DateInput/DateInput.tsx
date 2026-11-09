"use client"

import {
  maskitoDateOptionsGenerator,
  maskitoDateTimeOptionsGenerator,
  type MaskitoDateMode,
  type MaskitoDateParams,
  type MaskitoDateTimeParams,
  type MaskitoTimeMode,
} from "@maskito/kit"
import { useMaskito } from "@maskito/react"
import { type DateTime } from "luxon"
import { useMemo, useState } from "react"
import { mergeRefs } from "react-merge-refs"
import {
  dateInputValueKey,
  dateInputZone,
  formatDateInput,
  keepTypedValue,
  maskDate,
  parseDateInput,
  type DateInputFormat,
} from "../../lib/dateInputText"
import { Input, type InputProps } from "../Input"

export type DateInputProps = {
  value: DateTime | null
  onChange: (value: DateTime | null) => void
  mode?: MaskitoDateMode
  separator?: string
  timeMode?: MaskitoTimeMode
  dateTimeSeparator?: string
  timeStep?: number
  min?: DateTime
  max?: DateTime
  clearable?: boolean
  ref?: React.Ref<HTMLInputElement | null>
} & Omit<
  InputProps,
  "value" | "defaultValue" | "onChange" | "onInput" | "onClear" | "ref" | "type" | "min" | "max"
>

export const DateInput = (props: DateInputProps) => {
  const {
    value,
    onChange,
    mode = "dd/mm/yyyy",
    separator = ".",
    timeMode,
    dateTimeSeparator = ", ",
    timeStep = 0,
    min,
    max,
    clearable = false,
    placeholder,
    inputMode,
    onBlur,
    ref,
    ...inputProps
  } = props

  const hasTime = !!timeMode
  // The value's text is made from its own fields in its own zone (lib/dateInputText),
  // so these are keys, not the DateTime objects
  const zone = dateInputZone(value)
  const minMs = min?.toMillis()
  const maxMs = max?.toMillis()

  const textFormat = useMemo<DateInputFormat>(
    () => ({ mode, separator, timeMode, dateTimeSeparator, min: minMs, max: maxMs, zone }),
    [mode, separator, timeMode, dateTimeSeparator, minMs, maxMs, zone],
  )
  const dateParams = useMemo<MaskitoDateParams>(
    () => ({
      mode,
      separator,
      ...(minMs !== undefined ? { min: maskDate(minMs, zone) } : undefined),
      ...(maxMs !== undefined ? { max: maskDate(maxMs, zone) } : undefined),
    }),
    [mode, separator, minMs, maxMs, zone],
  )

  const dateTimeParams = useMemo<MaskitoDateTimeParams>(
    () => ({
      dateMode: mode,
      dateSeparator: separator,
      timeMode: timeMode ?? "HH:MM",
      dateTimeSeparator,
      ...(timeStep ? { timeStep } : undefined),
      ...(minMs !== undefined ? { min: maskDate(minMs, zone) } : undefined),
      ...(maxMs !== undefined ? { max: maskDate(maxMs, zone) } : undefined),
    }),
    [mode, separator, timeMode, dateTimeSeparator, timeStep, minMs, maxMs, zone],
  )

  // The mask shows a complete text as the value reads it (lib/dateInputText)
  const maskOptions = useMemo(
    () =>
      keepTypedValue(
        hasTime ? maskitoDateTimeOptionsGenerator(dateTimeParams) : maskitoDateOptionsGenerator(dateParams),
        textFormat,
      ),
    [hasTime, dateParams, dateTimeParams, textFormat],
  )

  const maskRef = useMaskito({ options: maskOptions })

  const format = (date: DateTime | null) => formatDateInput(date, textFormat)
  const parse = (str: string) => parseDateInput(str, textFormat)

  // The first render, on the server too, already shows the value. A new value
  // or format shows it again during the render, so no frame has the old text
  const syncKey = [dateInputValueKey(value), mode, separator, timeMode, dateTimeSeparator, timeStep, minMs, maxMs].join("|")
  const [inputValue, setInputValue] = useState(() => format(value))
  const [shownKey, setShownKey] = useState(syncKey)
  if (shownKey !== syncKey) {
    setShownKey(syncKey)
    setInputValue(format(value))
  }

  const handleInput = (evt: React.FormEvent<HTMLInputElement>) => {
    const str = evt.currentTarget.value
    setInputValue(str)

    if (!str) {
      onChange(null)
      return
    }

    const parsed = parse(str)

    if (parsed) {
      onChange(parsed)
    }
  }

  // Text that is not a complete date never reaches onChange, so leaving the
  // field shows the value again instead of a date the value does not hold
  const handleBlur = (evt: React.FocusEvent<HTMLInputElement>) => {
    onBlur?.(evt)
    if (inputValue && !parse(inputValue)) {
      setInputValue(format(value))
    }
  }

  const handleClear = () => {
    setInputValue("")
    onChange(null)
  }

  const defaultPlaceholder = useMemo(() => {
    const datePart = mode.replace(/\//g, separator).toUpperCase()
    if (!hasTime) return datePart
    return `${datePart}${dateTimeSeparator}${timeMode}`
  }, [mode, separator, hasTime, timeMode, dateTimeSeparator])

  return (
    <Input
      {...inputProps}
      // Maskito inserts separators; only the AM/PM segment needs letters.
      inputMode={inputMode ?? (timeMode?.includes("AA") ? "text" : "numeric")}
      ref={mergeRefs([maskRef as unknown as React.Ref<HTMLInputElement>, ref])}
      value={inputValue}
      onInput={handleInput}
      onBlur={handleBlur}
      placeholder={placeholder ?? defaultPlaceholder}
      onClear={clearable ? handleClear : undefined}
    />
  )
}
