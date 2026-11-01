import { DateTime } from "luxon"

/**
 * Get all days in a given month as DateTime objects
 */
export const getDaysOfMonth = (date: DateTime): DateTime[] => {
  const startOfMonth = date.startOf("month")
  const daysInMonth = startOfMonth.daysInMonth ?? 31 // fallback to 31 days if undefined
  const days = []

  for (let day = 0; day < daysInMonth; day++) {
    const dayDate = startOfMonth.plus({ days: day }).startOf("day")
    days.push(dayDate)
  }

  return days
}

/**
 * Check if the first date is before the second date
 */
export const isBefore = (targetDate: DateTime, compareDate: DateTime): boolean =>
  targetDate.toMillis() < compareDate?.toMillis()

/**
 * Check if the first date is after the second date
 */
export const isAfter = (targetDate: DateTime, compareDate: DateTime): boolean =>
  targetDate.toMillis() > compareDate?.toMillis()

/**
 * Check if two dates are the same day (ignoring time)
 */
export const isSameDay = (targetDate: DateTime, compareDate: DateTime): boolean =>
  targetDate.hasSame(compareDate, "day")

/**
 * Check if a date is today
 */
export const isToday = (dateTime: DateTime): boolean => isSameDay(dateTime, DateTime.local())

/**
 * Where a date sits in a week row that starts on `weekStartsOn`, 0 (Sunday) to
 * 6 (Saturday). Luxon's weekday runs from 1 (Monday) to 7 (Sunday).
 */
export const weekPosition = (date: DateTime, weekStartsOn: number): number =>
  (date.weekday - weekStartsOn + 7) % 7

/**
 * Split an array of days into weeks (arrays of 7 days each)
 */
export const chunkIntoWeeks = (daysInMonth: DateTime[], size = 7): DateTime[][] => {
  const weeks = []
  for (let i = 0; i < daysInMonth.length; i += size) {
    weeks.push(daysInMonth.slice(i, i + size))
  }
  return weeks
}

/**
 * Get the start and end date of the month the provided date is in, with optional min and max limits.
 */
export const getMonthStartAndEnd = (
  date: DateTime,
  { min, max }: { min?: DateTime; max?: DateTime } = {},
): [DateTime, DateTime] => {
  const startOfMonth = date.startOf("month")
  const endOfMonth = date.endOf("month")

  return [
    min ? DateTime.max(min, startOfMonth) : startOfMonth,
    max ? DateTime.min(max, endOfMonth) : endOfMonth,
  ]
}
