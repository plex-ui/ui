import { type DateTime } from "luxon"

export type DateRange = [DateTime, DateTime]
/** The day a week starts on: 0 is Sunday, 6 is Saturday. */
export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type DateRangeShortcut = {
  label: string
  getDateRange: () => DateRange
}
