/** Date helpers of DatePicker: plain `Date`s in the device's time zone, days compared by their calendar date. */

export function sameDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
  return a != null && b != null && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** The first day of the month `offset` months from `date`'s. */
export function monthOf(date: Date, offset = 0): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1)
}

/** A day lies outside `min`…`max` (compared by calendar day). */
export function dayOutside(day: Date, min?: Date, max?: Date): boolean {
  const time = startOfDay(day).getTime()
  return (min != null && time < startOfDay(min).getTime()) || (max != null && time > startOfDay(max).getTime())
}

/** A moment lies outside `min`…`max` (compared to the minute). */
export function timeOutside(date: Date, min?: Date, max?: Date): boolean {
  return (min != null && date.getTime() < min.getTime()) || (max != null && date.getTime() > max.getTime())
}

/** The date kept inside `min`…`max`. */
export function clampDate(date: Date, min?: Date, max?: Date): Date {
  if (min != null && date.getTime() < min.getTime()) return new Date(min.getTime())
  if (max != null && date.getTime() > max.getTime()) return new Date(max.getTime())
  return date
}

/** The weeks of a month, each of seven days; days of the months around it are `null`. */
export function monthWeeks(month: Date, weekStartsOn: number): (Date | null)[][] {
  const year = month.getFullYear()
  const index = month.getMonth()
  const lead = (new Date(year, index, 1).getDay() - weekStartsOn + 7) % 7
  const days = new Date(year, index + 1, 0).getDate()
  const cells: (Date | null)[] = [...Array<null>(lead).fill(null)]
  for (let day = 1; day <= days; day += 1) cells.push(new Date(year, index, day))
  while (cells.length % 7) cells.push(null)
  const weeks: (Date | null)[][] = []
  for (let start = 0; start < cells.length; start += 7) weeks.push(cells.slice(start, start + 7))
  return weeks
}

/** `value` on `day`: its time kept, the start of the day when there is no value yet. */
export function withDay(value: Date | null, day: Date): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), value?.getHours() ?? 0, value?.getMinutes() ?? 0)
}

/** `value` at `hours`:`minutes`, today when there is no value yet. */
export function withTime(value: Date | null, hours: number, minutes: number): Date {
  const base = value ?? new Date()
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), hours, minutes)
}

/** The day a week starts on in the locale (0 Sunday … 6 Saturday), from `Intl.Locale`'s week info; Monday without it. */
export function localeWeekStart(locale?: string): number {
  try {
    const info = new Intl.Locale(locale ?? Intl.DateTimeFormat().resolvedOptions().locale) as Intl.Locale & {
      weekInfo?: { firstDay: number }
      getWeekInfo?: () => { firstDay: number }
    }
    const first = info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay
    if (first != null) return first % 7
  } catch {
    // An engine without Intl.Locale
  }
  return 1
}

/** The locale reads time on a 12-hour clock. */
export function localeHour12(locale?: string): boolean {
  try {
    const options = new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions() as Intl.ResolvedDateTimeFormatOptions & { hourCycle?: string }
    if (options.hourCycle) return options.hourCycle === "h11" || options.hourCycle === "h12"
    return options.hour12 === true
  } catch {
    return false
  }
}

function format(locale: string | undefined, options: Intl.DateTimeFormatOptions, date: Date): string {
  try {
    // The grid and the wheels are Gregorian: the names follow it in every locale (fa-IR, th-TH)
    return new Intl.DateTimeFormat(locale, { calendar: "gregory", ...options }).format(date)
  } catch {
    return date.toDateString()
  }
}

/** The date as a compact picker shows it: "13 Nov 2026" (iOS) or "Nov 13, 2026", by the locale. */
export function formatDate(date: Date, locale?: string): string {
  return format(locale, { day: "numeric", month: "short", year: "numeric" }, date)
}

/** The time: "09:00", or "9:00 AM" on a 12-hour clock. */
export function formatTime(date: Date, locale: string | undefined, hour12: boolean): string {
  return format(locale, { hour: hour12 ? "numeric" : "2-digit", minute: "2-digit", hour12 }, date)
}

/** The month's title: "November 2026". */
export function formatMonth(month: Date, locale?: string): string {
  return format(locale, { month: "long", year: "numeric" }, month)
}

/** Android's dialog headline: "Tue, Nov 24". */
export function formatHeadline(date: Date, locale?: string): string {
  return format(locale, { weekday: "short", month: "short", day: "numeric" }, date)
}

/** A day on a date-and-time wheel: "Wed Nov 25". */
export function formatWheelDay(date: Date, locale?: string): string {
  return format(locale, { weekday: "short", month: "short", day: "numeric" }, date).replace(/,/g, "")
}

/** A day read out in full: "Tuesday, 24 November 2026". */
export function formatFullDay(date: Date, locale?: string): string {
  return format(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }, date)
}

/** The weekdays' labels from `weekStartsOn`: "MON" (`short`, iOS) or "M" (`narrow`, Android). */
export function weekdayLabels(locale: string | undefined, weekStartsOn: number, width: "short" | "narrow"): { label: string; name: string }[] {
  // 2023-01-01 was a Sunday
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(2023, 0, 1 + ((weekStartsOn + index) % 7))
    return { label: format(locale, { weekday: width }, day), name: format(locale, { weekday: "long" }, day) }
  })
}

/** The month names of the locale, January first. */
export function monthNames(locale?: string): string[] {
  return Array.from({ length: 12 }, (_, index) => format(locale, { month: "long" }, new Date(2023, index, 1)))
}

/** The order of day, month and year in the locale's dates, for the date wheels. */
export function dateOrder(locale?: string): ("day" | "month" | "year")[] {
  try {
    const parts = new Intl.DateTimeFormat(locale, { calendar: "gregory", day: "numeric", month: "long", year: "numeric" }).formatToParts(new Date(2023, 10, 24))
    const order = parts.map((part) => part.type).filter((type): type is "day" | "month" | "year" => type === "day" || type === "month" || type === "year")
    if (order.length === 3) return order
  } catch {
    // An engine without formatToParts
  }
  return ["month", "day", "year"]
}

/** The locale's day period labels: ["AM", "PM"]. */
export function periodLabels(locale?: string): [string, string] {
  try {
    const read = (hour: number) =>
      new Intl.DateTimeFormat(locale, { hour: "numeric", hour12: true }).formatToParts(new Date(2023, 0, 1, hour)).find((part) => part.type === "dayPeriod")?.value
    return [read(9) ?? "AM", read(21) ?? "PM"]
  } catch {
    return ["AM", "PM"]
  }
}

export const pad2 = (value: number) => String(value).padStart(2, "0")
