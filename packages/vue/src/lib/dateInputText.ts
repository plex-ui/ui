import type { MaskitoOptions, MaskitoPostprocessor } from "@maskito/core"
import { maskitoParseTime, maskitoStringifyTime, type MaskitoDateMode, type MaskitoTimeMode } from "@maskito/kit"
import { DateTime } from "luxon"

// DateInput's text and value, converted through the Luxon DateTime's own
// calendar fields in its own zone. Maskito's date helpers go through the
// browser's local Date instead: they show the browser's wall clock for a
// value in another zone, and the date and time helpers count the time from
// local midnight, an hour off on a daylight saving day.

export type DateInputFormat = {
  mode: MaskitoDateMode
  separator: string
  /** Set for a date and time */
  timeMode?: MaskitoTimeMode
  dateTimeSeparator: string
  /** Earliest allowed instant, in milliseconds */
  min?: number
  /** Latest allowed instant, in milliseconds */
  max?: number
  /** Zone of the value: typed dates are made in it. Luxon's default zone when not set */
  zone?: string
}

const MS_IN_HOUR = 3_600_000
const MS_IN_MINUTE = 60_000
const MS_IN_SECOND = 1_000

const inZone = (zone: string | undefined) => (zone ? { zone } : undefined)

const pad = (value: number, length: number) => String(value).padStart(length, "0")

/** The key a DateInput re-shows its value on: the instant and the zone. */
export const dateInputValueKey = (value: DateTime | null | undefined) =>
  value?.isValid ? `${value.toMillis()} ${value.zoneName}` : ""

// Maskito's own range: 0001-01-01 to 9999-12-31, end of day
const lowest = (zone: string | undefined) => DateTime.fromObject({ year: 1, month: 1, day: 1 }, inZone(zone))
const highest = (zone: string | undefined) =>
  DateTime.fromObject({ year: 9999, month: 12, day: 31, hour: 23, minute: 59, second: 59, millisecond: 999 }, inZone(zone))

/**
 * Within min and max, and within Maskito's own range when the mode has a year: a date typed without one is in
 * year 0, which that range would turn into 0001-01-01.
 */
const clampToRange = (value: DateTime, format: DateInputFormat, zone: string | undefined) => {
  const withYear = format.mode.includes("y")
  const min = format.min ?? (withYear ? lowest(zone).toMillis() : undefined)
  const max = format.max ?? (withYear ? highest(zone).toMillis() : undefined)
  const millis = value.toMillis()
  if (min !== undefined && millis < min) return DateTime.fromMillis(min, inZone(zone))
  if (max !== undefined && millis > max) return DateTime.fromMillis(max, inZone(zone))
  return value
}

/** The value's wall clock in its own zone, in the format */
const wallText = (shown: DateTime, format: DateInputFormat) => {
  const date = format.mode
    .replaceAll("/", format.separator)
    .replace(/d+/, pad(shown.day, 2))
    .replace(/m+/, pad(shown.month, 2))
    .replace(/y+/, (year) => pad(shown.year, 4).slice(-year.length))
  if (!format.timeMode) return date
  const msOfDay = shown.hour * MS_IN_HOUR + shown.minute * MS_IN_MINUTE + shown.second * MS_IN_SECOND + shown.millisecond
  return date + format.dateTimeSeparator + maskitoStringifyTime(msOfDay, { mode: format.timeMode })
}

/** The text a DateInput shows for a value: its wall clock in its own zone, kept within min and max. */
export const formatDateInput = (value: DateTime | null, format: DateInputFormat) =>
  value?.isValid ? wallText(clampToRange(value, format, value.zoneName ?? undefined), format) : ""

const segment = (digits: string, letters: string, letter: string) =>
  digits.slice(letters.indexOf(letter), letters.lastIndexOf(letter) + 1)

type Fields = { year: number; month: number; day: number; hour: number; minute: number; second: number; millisecond: number }

/**
 * Each instant the fields show in the zone, earliest first: two in an hour the clocks repeat, one in a time they skip,
 * moved forward as Luxon does. `[]` for a date that does not exist.
 */
const passesAt = (fields: Fields, zone: string | undefined) => {
  const parsed = DateTime.fromObject(fields, inZone(zone))
  if (!parsed.isValid) return []
  const passes = parsed.getPossibleOffsets().sort((a, b) => a.toMillis() - b.toMillis())
  return passes.length ? passes : [parsed]
}

const withinBounds = (value: DateTime, format: DateInputFormat) =>
  (format.min === undefined || value.toMillis() >= format.min) && (format.max === undefined || value.toMillis() <= format.max)

/**
 * Which instant a time the clocks show twice is. Luxon reads it with the offset in force today, so the same text would
 * be one instant in summer and another in winter: it is the first pass, as the browser's Date reads it, or the second
 * when only that one is within min and max. A text that is min's or max's own is that bound's pass, so a time kept at a
 * bound reads back as the bound.
 */
const pickPass = (passes: DateTime[], format: DateInputFormat) => {
  const [first] = passes
  if (passes.length < 2) return first
  const text = wallText(first, format)
  for (const bound of [format.min, format.max]) {
    if (bound === undefined) continue
    const shown = DateTime.fromMillis(bound, inZone(format.zone))
    const onBound = wallText(shown, format) === text && passes.find((pass) => pass.offset === shown.offset)
    if (onBound) return onBound
  }
  return passes.find((pass) => withinBounds(pass, format)) ?? first
}

/** The typed fields of a complete text as a DateTime in the format's zone, or `null` */
const readTyped = (text: string, format: DateInputFormat) => {
  const dateLetters = format.mode.replaceAll(/[^dmy]/g, "")
  const timeLetters = format.timeMode?.replaceAll(/[^HMS]/g, "") ?? ""
  const digits = text.replaceAll(/\D+/g, "")
  if (digits.length !== dateLetters.length + timeLetters.length) return null

  const dateDigits = digits.slice(0, dateLetters.length)
  const day = segment(dateDigits, dateLetters, "d")
  const month = segment(dateDigits, dateLetters, "m")
  const year = segment(dateDigits, dateLetters, "y")

  let msOfDay = 0
  if (format.timeMode) {
    // Everything after the date's digits: the time and an AM/PM
    const dateEnd = new RegExp(String.raw`^(?:\D*\d){${dateLetters.length}}`).exec(text)?.[0].length ?? 0
    msOfDay = maskitoParseTime(text.slice(dateEnd), { mode: format.timeMode })
  }

  const passes = passesAt(
    {
      // Maskito's reading: a two-digit year is in the 2000s, a missing one is year 0
      year: year.length === 2 ? 2000 + Number(year) : Number(year || 0),
      month: Number(month || 1),
      day: Number(day || 1),
      hour: Math.trunc(msOfDay / MS_IN_HOUR),
      minute: Math.trunc((msOfDay % MS_IN_HOUR) / MS_IN_MINUTE),
      second: Math.trunc((msOfDay % MS_IN_MINUTE) / MS_IN_SECOND),
      millisecond: msOfDay % MS_IN_SECOND,
    },
    format.zone,
  )
  return passes.length ? pickPass(passes, format) : null
}

/**
 * The value for a complete text, or `null` while it is not one. A typed
 * date is made in the format's zone from the typed fields, so the time is
 * the one typed on a daylight saving day too. A date that does not exist is
 * `null`; a time skipped by a clock change moves forward, as Luxon does, and
 * a time the clocks show twice is its first pass, as the browser's Date reads
 * it, unless only the second is within min and max or the text is a bound's
 * own. Kept within min and max when the mode has a year, as Maskito's reading is.
 */
export const parseDateInput = (text: string, format: DateInputFormat) => {
  const typed = readTyped(text, format)
  if (!typed) return null
  return format.mode.includes("y") ? clampToRange(typed, format, format.zone) : typed
}

/**
 * min or max for Maskito's mask, which builds the typed dates with the
 * browser's Date from their fields: the same fields, read in the value's
 * zone, so the mask compares wall clocks. Only its steps for a date not yet
 * complete read them, as keepTypedValue takes over the rest.
 */
export const maskDate = (millis: number, zone: string | undefined) => {
  const shown = DateTime.fromMillis(millis, inZone(zone))
  const date = new Date(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute, shown.second, shown.millisecond)
  // Years 0 to 99 would read as 1900 to 1999
  date.setFullYear(shown.year)
  return date
}

const NO_BREAK_SPACE = "\u00A0"

/** A wall date made in UTC, where every day exists, to compare calendar dates */
const calendarDay = (value: DateTime) => DateTime.fromObject({ year: value.year, month: value.month, day: value.day }, { zone: "UTC" })

/**
 * A text whose date is complete but not its time: its date kept within the dates of min and max, as Maskito's step
 * keeps it, on the calendar instead of the browser's Date. `null` for a date that does not exist, left to Maskito.
 */
const keepTypedDay = (value: string, format: DateInputFormat) => {
  const dateLetters = format.mode.replaceAll(/[^dmy]/g, "")
  const dateText = new RegExp(String.raw`^(?:\D*\d){${dateLetters.length}}`).exec(value)?.[0]
  const dayFormat = { ...format, timeMode: undefined, min: undefined, max: undefined, zone: "UTC" }
  const typed = dateText ? readTyped(dateText, dayFormat) : null
  if (!dateText || !typed) return null
  const bound = (millis: number | undefined) => (millis === undefined ? undefined : calendarDay(DateTime.fromMillis(millis, inZone(format.zone))))
  const min = bound(format.min)
  const max = bound(format.max)
  const kept = min && typed.toMillis() < min.toMillis() ? min : max && typed.toMillis() > max.toMillis() ? max : typed
  return wallText(kept, dayFormat) + value.slice(dateText.length)
}

/**
 * Maskito's date and date-and-time masks end with a step that rebuilds a complete date with the browser's Date to keep
 * it within min and max: in a zone whose clocks skipped a whole day the date moved a day, in the hour the browser's
 * clocks skip a time typed for a value in another zone moved an hour, and min and max held on the browser's clock.
 * This step reads a complete text in the value's zone, as the value is read (a time the clocks skip moves forward, an
 * hour they repeat is its first pass or the one within min and max), and shows it kept within min and max as instants,
 * so the text is the value's. A date and time without its time yet keeps its date within the dates of min and max. A
 * date that does not exist, or one not yet complete, stays with Maskito's step.
 */
export const keepTypedValue = (options: MaskitoOptions, format: DateInputFormat): MaskitoOptions => {
  const postprocessors = [...(options.postprocessors ?? [])]
  const maskitoRange = postprocessors.pop()
  if (!maskitoRange) return options
  const keep: MaskitoPostprocessor = (state, initial) => {
    // Complete once the AM or PM is typed too, as for Maskito
    const complete = !format.timeMode?.includes("AA") || /[AP]M$/.test(state.value)
    const typed = complete ? readTyped(state.value, format) : null
    // The mask puts a no-break space before AM and PM
    const value = typed
      ? formatDateInput(typed, format).replace(/ (?=[AP]M$)/, NO_BREAK_SPACE)
      : format.timeMode
        ? keepTypedDay(state.value, format)
        : null
    if (value === null) return maskitoRange(state, initial)
    return value === state.value ? state : { value, selection: state.selection }
  }
  return { ...options, postprocessors: [...postprocessors, keep] }
}
