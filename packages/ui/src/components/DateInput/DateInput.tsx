"use client"

import {
  maskitoDateOptionsGenerator,
  maskitoDateTimeOptionsGenerator,
  maskitoParseDate,
  maskitoParseDateTime,
  maskitoStringifyDate,
  maskitoStringifyDateTime,
  type MaskitoDateMode,
  type MaskitoDateParams,
  type MaskitoDateTimeParams,
  type MaskitoTimeMode,
} from "@maskito/kit"
import { useMaskito } from "@maskito/react"
import { DateTime } from "luxon"
import { useEffect, useMemo, useState } from "react"
import { mergeRefs } from "react-merge-refs"
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
    onBlur,
    ref,
    ...inputProps
  } = props

  const hasTime = !!timeMode

  const dateParams = useMemo<MaskitoDateParams>(
    () => ({
      mode,
      separator,
      ...(min ? { min: min.toJSDate() } : undefined),
      ...(max ? { max: max.toJSDate() } : undefined),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, separator, min?.toMillis(), max?.toMillis()],
  )

  const dateTimeParams = useMemo<MaskitoDateTimeParams>(
    () => ({
      dateMode: mode,
      dateSeparator: separator,
      timeMode: timeMode ?? "HH:MM",
      dateTimeSeparator,
      ...(timeStep ? { timeStep } : undefined),
      ...(min ? { min: min.toJSDate() } : undefined),
      ...(max ? { max: max.toJSDate() } : undefined),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, separator, timeMode, dateTimeSeparator, timeStep, min?.toMillis(), max?.toMillis()],
  )

  const maskOptions = useMemo(
    () =>
      hasTime
        ? maskitoDateTimeOptionsGenerator(dateTimeParams)
        : maskitoDateOptionsGenerator(dateParams),
    [hasTime, dateParams, dateTimeParams],
  )

  const maskRef = useMaskito({ options: maskOptions })

  const [inputValue, setInputValue] = useState("")

  const format = (date: DateTime | null) => {
    if (!date) return ""
    return hasTime
      ? maskitoStringifyDateTime(date.toJSDate(), dateTimeParams)
      : maskitoStringifyDate(date.toJSDate(), dateParams)
  }

  const parse = (str: string) =>
    hasTime ? maskitoParseDateTime(str, dateTimeParams) : maskitoParseDate(str, dateParams)

  const valueMsKey = value?.toMillis() ?? null
  useEffect(() => {
    setInputValue(format(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueMsKey, hasTime, dateParams, dateTimeParams])

  const handleInput = (evt: React.FormEvent<HTMLInputElement>) => {
    const str = evt.currentTarget.value
    setInputValue(str)

    if (!str) {
      onChange(null)
      return
    }

    const parsed = parse(str)

    if (parsed) {
      onChange(DateTime.fromJSDate(parsed))
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
      ref={mergeRefs([maskRef as unknown as React.Ref<HTMLInputElement>, ref])}
      value={inputValue}
      onInput={handleInput}
      onBlur={handleBlur}
      placeholder={placeholder ?? defaultPlaceholder}
      onClear={clearable ? handleClear : undefined}
    />
  )
}
