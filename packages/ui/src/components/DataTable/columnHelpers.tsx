"use client"

import type { CellContext } from "@tanstack/react-table"
import { useLayoutEffect, useRef, useSyncExternalStore } from "react"
import { Badge } from "../Badge"
import { CopyTooltip } from "../Tooltip"
import { Tooltip } from "../Tooltip"

export function idCell<T>(accessor: (row: T) => string) {
  function IdCell({ row }: CellContext<T, unknown>) {
    const value = accessor(row.original)
    return (
      <CopyTooltip copyValue={value}>
        <span
          style={{
            fontFamily: "var(--font-mono, ui-monospace, monospace)",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
          }}
        >
          {value}
        </span>
      </CopyTooltip>
    )
  }
  IdCell.displayName = "IdCell"
  return IdCell
}

const subscribeNever = () => () => {}
const isClient = () => true
const isServer = () => false

// ISO 8601: a date, a time, and a zone (Z or an offset) when the value names an instant.
const ISO_DATE = /^([+-]\d{6}|\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|[+-]\d{2}(?::?\d{2})?)?)?$/

/**
 * An ISO date read field by field, the same in every runtime (engines read the edges of the format each their own
 * way), null when it is no date (the 30th of February, an hour of 25; 24:00 is the next midnight). A date, or a
 * date and time, written without a zone ("2023-01-15", "2023-01-15T09:00") names no instant, and a runtime would
 * read it in its own zone, the server's in one and the reader's in another: it is `written`, shown as written in
 * every zone.
 */
function readIsoDate(value: string): { date: Date; written: boolean } | null | undefined {
  const match = ISO_DATE.exec(value)
  if (!match) return undefined
  const [, yearText, monthText, dayText, hourText = "0", minuteText = "0", secondText = "0", fraction = "0", zone] = match
  const [year, month, day, hour, minute, second] = [yearText, monthText, dayText, hourText, minuteText, secondText].map(Number)
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
  const endOfDay = hour === 24 && minute + second + Number(fraction) === 0
  const offsetHours = zone && zone !== "Z" ? Number(zone.slice(1, 3)) : 0
  const offsetMinutes = zone && zone.length > 3 ? Number(zone.slice(-2)) : 0
  const inRange =
    monthDays !== undefined && day >= 1 && day <= monthDays && (hour <= 23 || endOfDay) && minute <= 59 && second <= 59 &&
    offsetHours <= 23 && offsetMinutes <= 59
  if (!inRange) return null
  // Counted, not built from a Date: a value at the edge of the range a Date holds would leave it on the way.
  // An offset east of UTC is that much earlier in UTC.
  const offset = (zone?.[0] === "-" ? -1 : 1) * (offsetHours * 60 + offsetMinutes)
  const time =
    daysFromCivil(year, month, day) * 86_400_000 + ((hour * 60 + minute - offset) * 60 + second) * 1000 +
    Number(fraction.slice(0, 3).padEnd(3, "0"))
  const date = new Date(time)
  return Number.isNaN(date.getTime()) ? null : { date, written: !zone }
}

/** Days from 1970-01-01 to a date of the proleptic Gregorian calendar (H. Hinnant's days_from_civil). */
function daysFromCivil(year: number, month: number, day: number) {
  const y = month <= 2 ? year - 1 : year
  const era = Math.floor(y / 400)
  const yearOfEra = y - era * 400
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear
  return era * 146_097 + dayOfEra - 719_468
}

/**
 * Formats a cell's value: in the reader's zone once mounted, and on the server and while hydrating in a zone that
 * does not depend on where they run. The text can still differ between engines (Node joins a date and a time with
 * ", ", WebKit with " at "), so the cell lets hydration differ in its text and writes the reader's text once mounted.
 */
function dateTimeFormatter(options?: Intl.DateTimeFormatOptions) {
  const formatOptions: Intl.DateTimeFormatOptions = options ?? {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
  const reader = new Intl.DateTimeFormat("en-US", formatOptions)
  // The server knows no reader's time zone: without a timeZone in the options it writes an instant in UTC, and
  // so does the render that takes over the server's markup; the reader's own zone follows right after it.
  const server = formatOptions.timeZone ? reader : new Intl.DateTimeFormat("en-US", { ...formatOptions, timeZone: "UTC" })
  // A written date names no zone, so none is printed: a long or full time would add one, a medium one does not.
  const zoneless = formatOptions.timeStyle === "long" || formatOptions.timeStyle === "full" ? "medium" : formatOptions.timeStyle
  const written = new Intl.DateTimeFormat("en-US", { ...formatOptions, timeZone: "UTC", timeZoneName: undefined, timeStyle: zoneless })
  return (value: string, mounted: boolean) => {
    const iso = readIsoDate(value)
    if (iso === null) return value
    if (iso) return (iso.written ? written : mounted ? reader : server).format(iso.date)
    // Any other way of writing a date each runtime reads its own way, and one that is no date at all none can
    // format: the server and the render that takes over its markup show it as written, the reader's runtime
    // reads it once mounted.
    const date = new Date(value)
    return mounted && !Number.isNaN(date.getTime()) ? reader.format(date) : value
  }
}

export function dateTimeCell<T>(
  accessor: (row: T) => string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
) {
  const format = dateTimeFormatter(options)

  function DateTimeCell({ row }: CellContext<T, unknown>) {
    const val = accessor(row.original)
    const client = useSyncExternalStore(subscribeNever, isClient, isServer)
    const text = val ? format(val, client) : "—"
    const span = useRef<HTMLSpanElement>(null)
    // React keeps the server's words through hydration (it does not patch text it was told may differ) and later
    // writes only what changed since its own first render: where the server's words still stand, the reader's
    // are written once, and a text that already reads the same is left alone, selection and all.
    useLayoutEffect(() => {
      if (span.current && span.current.textContent !== text) span.current.textContent = text
    }, [text])
    return (
      <span ref={span} suppressHydrationWarning style={{ color: "var(--color-text-secondary)" }}>
        {text}
      </span>
    )
  }
  DateTimeCell.displayName = "DateTimeCell"
  return DateTimeCell
}

export function statusCell<T>(
  accessor: (row: T) => string,
  colorMap?: Record<
    string,
    "secondary" | "success" | "danger" | "warning" | "info" | "discovery" | "caution"
  >,
) {
  const defaultColorMap: Record<
    string,
    "secondary" | "success" | "danger" | "warning" | "info" | "discovery" | "caution"
  > = {
    active: "success",
    completed: "success",
    paid: "success",
    pending: "warning",
    processing: "info",
    inactive: "secondary",
    cancelled: "danger",
    failed: "danger",
    unpaid: "danger",
  }

  function StatusCell({ row }: CellContext<T, unknown>) {
    const status = accessor(row.original)
    const map = colorMap ?? defaultColorMap
    const color = map[status.toLowerCase()] ?? "secondary"
    return (
      <Badge color={color} variant="soft">
        {status}
      </Badge>
    )
  }
  StatusCell.displayName = "StatusCell"
  return StatusCell
}

export function tooltipHeader(label: string, description: string) {
  function TooltipHeader() {
    return (
      <Tooltip content={description} side="bottom" maxWidth={260}>
        <span style={{ cursor: "help", borderBottom: "1px dashed currentColor" }}>{label}</span>
      </Tooltip>
    )
  }
  TooltipHeader.displayName = "TooltipHeader"
  return TooltipHeader
}
