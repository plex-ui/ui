import { defineComponent, h, onMounted, ref, type PropType, type VNode } from "vue"
import type { CellContext, HeaderContext } from "@tanstack/vue-table"
import { Badge, type BadgeColor } from "../Badge/index.js"
import { CopyTooltip, Tooltip } from "../Tooltip/index.js"

// Vue port of packages/ui/src/components/DataTable/columnHelpers.tsx. Each
// helper returns a functional component for a column's `cell` or `header`;
// FlexRender renders it with the cell or header context as props, as
// flexRender does in React.

type StatusColor = Extract<BadgeColor, "secondary" | "success" | "danger" | "warning" | "info" | "discovery" | "caution">

/** A cell renderer: FlexRender calls it with the cell context. */
export type CellComponent<T> = ((context: CellContext<T, unknown>) => VNode) & { displayName?: string }

/** A header renderer: FlexRender calls it with the header context. */
export type HeaderComponent<T> = ((context: HeaderContext<T, unknown>) => VNode) & { displayName?: string }

/** Monospace ID that copies itself on click, with a copy tooltip. */
export function idCell<T>(accessor: (row: T) => string): CellComponent<T> {
  const IdCell: CellComponent<T> = ({ row }) => {
    const value = accessor(row.original)
    return h(
      CopyTooltip,
      { copyValue: value },
      {
        default: () =>
          h(
            "span",
            {
              style: {
                fontFamily: "var(--font-mono, ui-monospace, monospace)",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
              },
            },
            value,
          ),
      },
    )
  }
  IdCell.displayName = "IdCell"
  return IdCell
}

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
  // so does the render that takes over the server's markup; the reader's own zone follows once it is mounted.
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

/** One formatted cell: the server's format until it is mounted, then the reader's. */
const DateTimeText = defineComponent({
  name: "DateTimeText",
  props: {
    value: { type: String, default: undefined },
    format: { type: Function as PropType<(value: string, mounted: boolean) => string>, required: true },
  },
  setup(props) {
    const mounted = ref(false)
    onMounted(() => { mounted.value = true })
    // Hydration may take the server's text in another engine's words (Vue writes its own over it); once mounted,
    // the reader's zone follows.
    return () =>
      h(
        "span",
        { "data-allow-mismatch": "text", style: { color: "var(--color-text-secondary)" } },
        props.value ? props.format(props.value, mounted.value) : "—",
      )
  },
})

/** Date and time formatted with Intl.DateTimeFormat ("en-US"); "—" when empty. */
export function dateTimeCell<T>(
  accessor: (row: T) => string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): CellComponent<T> {
  const format = dateTimeFormatter(options)

  const DateTimeCell: CellComponent<T> = ({ row }) => {
    const val = accessor(row.original)
    return h(DateTimeText, { value: val ?? undefined, format })
  }
  DateTimeCell.displayName = "DateTimeCell"
  return DateTimeCell
}

/** Soft Badge whose color comes from the lowercased status (`colorMap`, or the default map). */
export function statusCell<T>(accessor: (row: T) => string, colorMap?: Record<string, StatusColor>): CellComponent<T> {
  const defaultColorMap: Record<string, StatusColor> = {
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

  const StatusCell: CellComponent<T> = ({ row }) => {
    const status = accessor(row.original)
    const map = colorMap ?? defaultColorMap
    const color = map[status.toLowerCase()] ?? "secondary"
    return h(Badge, { color, variant: "soft" }, { default: () => status })
  }
  StatusCell.displayName = "StatusCell"
  return StatusCell
}

/** Header label with a dashed underline and a tooltip carrying `description`. */
export function tooltipHeader<T = any>(label: string, description: string): HeaderComponent<T> {
  const TooltipHeader: HeaderComponent<T> = () =>
    h(
      Tooltip,
      { content: description, side: "bottom", maxWidth: 260 },
      {
        default: () => h("span", { style: { cursor: "help", borderBottom: "1px dashed currentColor" } }, label),
      },
    )
  TooltipHeader.displayName = "TooltipHeader"
  return TooltipHeader
}
