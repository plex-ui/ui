"use client"

import { DateTime, Interval } from "luxon"
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import { useStableCallback } from "../../hooks/useStableCallback"
import {
  chunkIntoWeeks,
  getDaysOfMonth,
  isAfter,
  isBefore,
  isSameDay,
  isToday,
} from "../../lib/dateUtils"
import { waitForAnimationFrame } from "../../lib/helpers"
import { Button } from "../Button"
import { CalendarNavigationIcon } from "./CalendarNavigationIcon"
import { usePopoverClose } from "../Popover/usePopoverController"
import { Select } from "../Select"
import { TransitionGroup } from "../Transition"
import s from "@plexui/styles/components/DatePicker/Calendar.module.css"
import { useDateContext } from "./context"

const SHORT_MONTH_NAMES = Array.from(
  { length: 12 },
  (_, i) => DateTime.local(2024, i + 1, 1).monthShort!,
)

// The day a grid key moves to: a day, a week, the Sunday or Saturday of the
// week (rows start on Sunday), or a month (Luxon clamps Jan 31 to Feb 28/29)
const getKeyTarget = (key: string, day: DateTime): DateTime | null => {
  switch (key) {
    case "ArrowLeft":
      return day.minus({ days: 1 })
    case "ArrowRight":
      return day.plus({ days: 1 })
    case "ArrowUp":
      return day.minus({ days: 7 })
    case "ArrowDown":
      return day.plus({ days: 7 })
    case "Home":
      return day.minus({ days: day.weekday % 7 })
    case "End":
      return day.plus({ days: 6 - (day.weekday % 7) })
    case "PageUp":
      return day.minus({ months: 1 })
    case "PageDown":
      return day.plus({ months: 1 })
    default:
      return null
  }
}

// Whole-day bounds, as the day buttons' disabled state
const isDayWithinLimits = (day: DateTime, min?: DateTime, max?: DateTime) =>
  !(min && isBefore(day, min.startOf("day"))) && !(max && isAfter(day, max.endOf("day")))

const monthIndex = (date: DateTime) => date.year * 12 + date.month

export const DateCalendar = () => {
  const { value, min, max, disabled, onChangeRef, captionLayout, showTime, yearRange } = useDateContext()
  const closePopover = usePopoverClose()
  const calendarContainerRef = useRef<HTMLDivElement | null>(null)
  // The day to focus once a key has moved the view to its month. It lives
  // here, outside the wrapper that the dropdown layout re-keys
  const pendingFocusRef = useRef<DateTime | null>(null)
  const [calendarSteps, setCalendarSteps] = useState<number>(0)
  const [forceRenderIncrement, setForceRenderIncrement] = useState<number>(0)
  const [calendarDate, setCalendarDate] = useState<DateTime>(() => value ?? DateTime.now())

  const isDropdown = captionLayout === "dropdown"

  const canGoBack = !min || isBefore(min, calendarDate.startOf("month"))
  const canGoForward = !max || isBefore(calendarDate.endOf("month"), max)

  const [pendingHour, setPendingHour] = useState<number>(() => value?.hour ?? 12)
  const [pendingMinute, setPendingMinute] = useState<number>(() => value?.minute ?? 0)

  useEffect(() => {
    if (value) {
      setPendingHour(value.hour)
      setPendingMinute(value.minute)
    }
  }, [value])

  const handleNext = () => {
    if (disabled) return
    if (isDropdown) {
      setCalendarDate((dt) => dt.plus({ months: 1 }))
      setForceRenderIncrement((c) => c + 1)
    } else {
      setCalendarSteps((c) => c + 1)
      setCalendarDate((dt) => dt.plus({ months: 1 }))
    }
  }

  const handlePrevious = () => {
    if (disabled) return
    if (isDropdown) {
      setCalendarDate((dt) => dt.minus({ months: 1 }))
      setForceRenderIncrement((c) => c + 1)
    } else {
      setCalendarSteps((c) => c - 1)
      setCalendarDate((dt) => dt.minus({ months: 1 }))
    }
  }

  // The calendar limits whole days; with a time picker the chosen time on a
  // min or max day can still cross the bound, so clamp the full date-time
  const clampToBounds = (dateTime: DateTime) => {
    if (min && dateTime.toMillis() < min.toMillis()) return min
    if (max && dateTime.toMillis() > max.toMillis()) return max
    return dateTime
  }

  const handleDateSelect = (selectedDate: DateTime) => {
    if (disabled) return
    if (showTime) {
      onChangeRef.current(
        clampToBounds(selectedDate.set({ hour: value?.hour ?? pendingHour, minute: value?.minute ?? pendingMinute })),
      )
    } else {
      onChangeRef.current(selectedDate)
      closePopover()
    }
  }

  const handleTimeChange = (hour: number, minute: number) => {
    if (disabled) return
    if (value) {
      // A controlled value is authoritative, including when the owner refuses the request.
      onChangeRef.current(clampToBounds(value.set({ hour, minute })))
    } else {
      // Before a day is chosen the time is a local draft, not a selected date.
      setPendingHour(hour)
      setPendingMinute(minute)
    }
  }

  const handleDropdownMonthChange = (month: number) => {
    if (disabled) return
    setCalendarDate(DateTime.local(calendarDate.year, month, 1))
    setForceRenderIncrement((c) => c + 1)
  }

  const handleDropdownYearChange = (year: number) => {
    if (disabled) return
    setCalendarDate(DateTime.local(year, calendarDate.month, 1))
    setForceRenderIncrement((c) => c + 1)
  }

  // Days are named by their full date; skip a calendar that is leaving
  const focusDay = (day: DateTime) => {
    const label = day.toLocaleString(DateTime.DATE_HUGE)
    const buttons = calendarContainerRef.current?.querySelectorAll<HTMLButtonElement>(
      `button[aria-label="${label}"]`,
    )
    Array.from(buttons ?? [])
      .find((button) => !button.closest("[data-exiting]"))
      ?.focus()
  }

  // A calendar that is leaving keeps the props it last rendered with, so its
  // days reach the current state through a stable callback
  const handleDayKeyDown = useStableCallback((event: KeyboardEvent, day: DateTime) => {
    if (disabled || event.altKey || event.ctrlKey || event.metaKey) {
      return
    }

    // While a move waits for its month to render, the next key starts from
    // the day it is moving to (key repeat), not the day that still has focus
    const target = getKeyTarget(event.key, pendingFocusRef.current ?? day)
    if (!target) {
      return
    }

    event.preventDefault()

    // A disabled day keeps focus where it is
    if (!isDayWithinLimits(target, min, max)) {
      return
    }

    const months = monthIndex(target) - monthIndex(calendarDate)
    if (months === 0) {
      pendingFocusRef.current = null
      focusDay(target)
      return
    }

    // Step the view like the month buttons; a day within min/max keeps every step in bounds
    if (months > 0 ? !canGoForward : !canGoBack) {
      return
    }

    pendingFocusRef.current = target
    for (let step = 0; step < Math.abs(months); step++) {
      if (months > 0) {
        handleNext()
      } else {
        handlePrevious()
      }
    }
  })

  // Focus a pending day once its month has rendered. New calendars mount
  // after this render (TransitionGroup), so wait a frame like the height does
  useEffect(() => {
    if (!pendingFocusRef.current) {
      return
    }

    return waitForAnimationFrame(() => {
      const target = pendingFocusRef.current
      pendingFocusRef.current = null
      if (target) {
        focusDay(target)
      }
    })
  }, [calendarDate])

  // Force re-renders when `value` changes out of band from direct user-selection
  useEffect(() => {
    // No-op when value is empty
    if (!value) {
      return
    }

    // Check if `value` is still within view of our calendar
    const viewInterval = Interval.fromDateTimes(
      calendarDate.startOf("month"),
      calendarDate.endOf("month"),
    )
    const isValueInRangeOfCalendar = viewInterval.contains(value)
    if (!isValueInRangeOfCalendar) {
      // Reset state the calendar view entirely
      setCalendarSteps(0)
      setCalendarDate(value)
      setForceRenderIncrement((c) => c + 1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only re-run this hook when value changes
  }, [value])

  // The day grid changes size at the Phone breakpoint and when fonts/content resize.
  // Observe its border box, not only the month state, while retaining the height transition.
  useEffect(() => {
    const container = calendarContainerRef.current
    if (!container) return
    let cancelTransition: (() => void) | undefined
    const calendars = () => Array.from(container.querySelectorAll<HTMLElement>("[data-calendar]"))
      .filter((element) => !element.closest("[data-exiting]"))
    const measure = () => {
      const visible = calendars()
      if (!visible.length) return
      const height = `${Math.max(...visible.map((element) => element.clientHeight))}px`
      if (container.style.height !== height) container.style.height = height
      // Do not animate the initial measurement. The CSS variable follows live reduced motion.
      if (!container.style.transition && !cancelTransition) {
        cancelTransition = waitForAnimationFrame(() => {
          container.style.transition = "height var(--calendar-height-duration, 0.25s) var(--cubic-move)"
        })
      }
    }
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : undefined
    const cancelMeasure = waitForAnimationFrame(() => {
      measure()
      observer?.observe(container, { box: "border-box" })
      calendars().forEach((calendar) => observer?.observe(calendar, { box: "border-box" }))
    })
    return () => {
      cancelMeasure()
      cancelTransition?.()
      observer?.disconnect()
    }
  }, [calendarDate, forceRenderIncrement, captionLayout])

  return (
    <div className={s.CalendarWrapper} key={`stable-view-${forceRenderIncrement}`}>
      <div
        ref={calendarContainerRef}
        className={s.CalendarContainer}
        data-dropdown={isDropdown ? "" : undefined}
      >
        <div className={s.Previous}>
          <Button
            variant="ghost"
            color="secondary"
            size="sm"
            gutterSize="2xs"
            pill={false}
            iconSize="sm"
            onClick={handlePrevious}
            disabled={disabled || !canGoBack}
            aria-label="Previous month"
          >
            <CalendarNavigationIcon direction="previous" />
          </Button>
        </div>
        <div className={s.Next}>
          <Button
            variant="ghost"
            color="secondary"
            size="sm"
            gutterSize="2xs"
            pill={false}
            iconSize="sm"
            onClick={handleNext}
            disabled={disabled || !canGoForward}
            aria-label="Next month"
          >
            <CalendarNavigationIcon direction="next" />
          </Button>
        </div>
        {isDropdown && (
          <DropdownCaption
            date={calendarDate}
            onMonthChange={handleDropdownMonthChange}
            onYearChange={handleDropdownYearChange}
            min={min}
            max={max}
            yearRange={yearRange}
          />
        )}
        <div className={s.CalendarViewport}>
          <div
            className={s.CalendarRange}
            style={
              !isDropdown
                ? { transform: `translate(calc(${calendarSteps * -1} * var(--calendar-step)), 0)` }
                : undefined
            }
          >
            {!isDropdown ? (
              <TransitionGroup enterDuration={400} exitDuration={400}>
                <CalendarView
                  key={calendarDate.toLocaleString({
                    month: "long",
                    year: "numeric",
                  })}
                  stepPosition={calendarSteps}
                  date={calendarDate}
                  selectedDate={value}
                  min={min}
                  max={max}
                  onDateSelect={handleDateSelect}
                  onDayKeyDown={handleDayKeyDown}
                  hideMonthLabel={false}
                />
              </TransitionGroup>
            ) : (
              <CalendarView
                key={calendarDate.toLocaleString({
                  month: "long",
                  year: "numeric",
                })}
                stepPosition={0}
                date={calendarDate}
                selectedDate={value}
                min={min}
                max={max}
                onDateSelect={handleDateSelect}
                onDayKeyDown={handleDayKeyDown}
                hideMonthLabel
              />
            )}
          </div>
        </div>
      </div>
      {showTime && (
        <TimeInput hour={value?.hour ?? pendingHour} minute={value?.minute ?? pendingMinute} onChange={handleTimeChange} />
      )}
    </div>
  )
}

type DropdownCaptionProps = {
  date: DateTime
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
  min?: DateTime
  max?: DateTime
  yearRange?: [number, number]
}

const DropdownCaption = ({
  date,
  onMonthChange,
  onYearChange,
  min,
  max,
  yearRange,
}: DropdownCaptionProps) => {
  const { disabled } = useDateContext()
  const currentYear = DateTime.now().year
  const minYear = yearRange?.[0] ?? min?.year ?? currentYear - 120
  const maxYear = yearRange?.[1] ?? max?.year ?? currentYear

  const years = useMemo(() => {
    const result: number[] = []
    for (let y = maxYear; y >= minYear; y--) {
      result.push(y)
    }
    return result
  }, [minYear, maxYear])

  return (
    <div className={s.DropdownCaption}>
      <Select
        aria-label="Month"
        disabled={disabled}
        listMinWidth="auto"
        listWidth="auto"
        variant="ghost"
        size="sm"
        dropdownIconType="chevronDown"
        value={String(date.month)}
        options={SHORT_MONTH_NAMES.map((label, index) => ({ value: String(index + 1), label }))}
        onChange={(option) => onMonthChange(Number(option.value))}
      />
      <Select
        aria-label="Year"
        disabled={disabled}
        searchAriaLabel="Search year"
        listMinWidth="auto"
        listWidth="auto"
        variant="ghost"
        size="sm"
        dropdownIconType="chevronDown"
        value={String(date.year)}
        options={years.map((year) => ({ value: String(year), label: String(year) }))}
        onChange={(option) => onYearChange(Number(option.value))}
      />
    </div>
  )
}

type TimeInputProps = {
  hour: number
  minute: number
  onChange: (hour: number, minute: number) => void
}

const TimeInput = ({ hour, minute, onChange }: TimeInputProps) => {
  const { disabled } = useDateContext()
  const hourRef = useRef<HTMLInputElement>(null)
  const minuteRef = useRef<HTMLInputElement>(null)
  const [hourText, setHourText] = useState<string | null>(null)
  const [minuteText, setMinuteText] = useState<string | null>(null)

  // Disabling a focused input does not reliably blur it. Drop drafts before
  // committing disabled fields, so they cannot return on re-enable.
  if (disabled && (hourText !== null || minuteText !== null)) {
    setHourText(null)
    setMinuteText(null)
  }

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2)
    setHourText(raw)
    if (raw.length === 2) {
      onChange(Math.min(23, Number(raw)), minute)
      minuteRef.current?.focus()
      minuteRef.current?.select()
    }
  }

  const handleHourBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setHourText(null)
    if (disabled) return
    const raw = e.currentTarget.value.replace(/\D/g, "").slice(0, 2)
    const h = Math.min(23, Number(raw) || 0)
    onChange(h, minute)
  }

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2)
    setMinuteText(raw)
    if (raw.length === 2) {
      onChange(hour, Math.min(59, Number(raw)))
      // Show the accepted value: the parent may clamp it to min/max
      setMinuteText(null)
    }
  }

  const handleMinuteBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setMinuteText(null)
    if (disabled) return
    const raw = e.currentTarget.value.replace(/\D/g, "").slice(0, 2)
    const m = Math.min(59, Number(raw) || 0)
    onChange(hour, m)
  }

  // Arrow steps drop the draft text so the field shows the accepted value,
  // which the parent may have clamped to min/max
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, type: "hour" | "minute") => {
    if (disabled) return
    const step = e.shiftKey ? 10 : 1
    if (e.key === "ArrowUp") {
      e.preventDefault()
      if (type === "hour") {
        onChange((hour + step) % 24, minute)
        setHourText(null)
      } else {
        onChange(hour, (minute + step) % 60)
        setMinuteText(null)
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      if (type === "hour") {
        onChange((hour - step + 24) % 24, minute)
        setHourText(null)
      } else {
        onChange(hour, (minute - step + 60) % 60)
        setMinuteText(null)
      }
    }
  }

  return (
    <div className={s.TimeFooter}>
      <span className={s.TimeLabel}>Time</span>
      <div className={s.TimeInputGroup}>
        <input
          ref={hourRef}
          className={s.TimeField}
          disabled={disabled}
          type="text"
          inputMode="numeric"
          value={hourText ?? String(hour).padStart(2, "0")}
          onChange={handleHourChange}
          onBlur={handleHourBlur}
          onFocus={(e) => {
            setHourText(e.target.value)
            e.target.select()
          }}
          onKeyDown={(e) => handleKeyDown(e, "hour")}
          maxLength={2}
          aria-label="Hour"
        />
        <span className={s.TimeSeparator}>:</span>
        <input
          ref={minuteRef}
          className={s.TimeField}
          disabled={disabled}
          type="text"
          inputMode="numeric"
          value={minuteText ?? String(minute).padStart(2, "0")}
          onChange={handleMinuteChange}
          onBlur={handleMinuteBlur}
          onFocus={(e) => {
            setMinuteText(e.target.value)
            e.target.select()
          }}
          onKeyDown={(e) => handleKeyDown(e, "minute")}
          maxLength={2}
          aria-label="Minute"
        />
      </div>
    </div>
  )
}

type CalendarViewProps = {
  date: DateTime
  selectedDate?: DateTime | null
  onDateSelect?: (dt: DateTime) => void
  onDayKeyDown?: (event: KeyboardEvent<HTMLButtonElement>, dt: DateTime) => void
  min?: DateTime
  max?: DateTime
  stepPosition: number
  hideMonthLabel?: boolean
}

const daysOfTheWeekLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const CalendarView = ({
  date,
  selectedDate,
  min,
  max,
  onDateSelect,
  onDayKeyDown,
  stepPosition,
  hideMonthLabel = false,
}: CalendarViewProps) => {
  const { disabled } = useDateContext()
  // Lock position on mount and don't respond to changes
  const [position] = useState(stepPosition)
  const { startOfMonth, weeks, enabledInterval } = useMemo(() => {
    const monthStart = date.startOf("month")
    const endOfMonth = date.endOf("month")

    const daysBeforeMonthStart = monthStart.weekday % 7
    const blankDays = new Array(daysBeforeMonthStart).fill(null)
    const daysInMonth = getDaysOfMonth(monthStart)
    const calendarCells = [...blankDays, ...daysInMonth]

    // Cells are start-of-day values and Interval excludes its end, so widen the
    // bounds to whole days: min/max days themselves stay selectable.
    const enabledDateInterval = Interval.fromDateTimes(
      (min || monthStart).startOf("day"),
      (max || endOfMonth).endOf("day"),
    )

    return {
      startOfMonth: monthStart,
      endOfMonth,
      weeks: chunkIntoWeeks(calendarCells, 7),
      enabledInterval: enabledDateInterval,
    }
  }, [date, min, max])

  return (
    <div
      className={s.Calendar}
      style={hideMonthLabel ? undefined : { left: `calc(${position} * var(--calendar-step))` }}
      data-calendar
      data-static={hideMonthLabel ? "" : undefined}
    >
      {hideMonthLabel ? (
        <div className={s.MonthLabelSpacer} aria-hidden="true" />
      ) : (
        <p className={s.MonthLabel}>
          {startOfMonth.monthLong} {startOfMonth.year}
        </p>
      )}
      <div className={`${s.Week} ${s.WeekdayHeader}`}>
        {daysOfTheWeekLabels.map((day) => (
          <div key={day} className={s.DayLabel}>
            <span className={s.ShortDayLabel}>{day.slice(0, 2)}</span>
            <span className={s.LongDayLabel}>{day}</span>
          </div>
        ))}
      </div>
      {weeks.map((week, weekIndex) => (
        <div className={s.Week} key={weekIndex}>
          {week.map((d, dayIndex) => {
            if (!d) {
              return <div className={s.Day} key={`${weekIndex}-${dayIndex}`} />
            }

            const enabled = enabledInterval.contains(d)
            const isSelected = enabled && selectedDate && isSameDay(d, selectedDate)
            const dayIsToday = isToday(d)

            return (
              <div className={s.Day} key={dayIndex} data-is-selected={isSelected ? "" : undefined}>
                {/* The full date names the day, which "15" alone does not across months */}
                <button
                  type="button"
                  className={s.InteractiveDay}
                  disabled={disabled || !enabled}
                  aria-label={d.toLocaleString(DateTime.DATE_HUGE)}
                  aria-pressed={!!isSelected}
                  aria-current={dayIsToday ? "date" : undefined}
                  onClick={() => { if (!disabled && d) onDateSelect?.(d) }}
                  onKeyDown={(event) => d && onDayKeyDown?.(event, d)}
                >
                  {d.day}
                  {dayIsToday && <span className={s.TodayDot} />}
                </button>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
