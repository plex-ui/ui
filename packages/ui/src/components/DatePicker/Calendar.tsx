"use client"

import { DateTime, Interval } from "luxon"
import { useEffect, useMemo, useRef, useState } from "react"
import { chunkIntoWeeks, getDaysOfMonth, isBefore, isSameDay, isToday } from "../../lib/dateUtils"
import { waitForAnimationFrame } from "../../lib/helpers"
import { Button } from "../Button"
import { ChevronLeft, ChevronRight } from "../Icon"
import { usePopoverClose } from "../Popover/usePopoverController"
import { Select } from "../Select"
import { TransitionGroup } from "../Transition"
import s from "./Calendar.module.css"
import { useDateContext } from "./context"

const CALENDAR_WIDTH_PX = 210
const CALENDAR_GAP_PX = 32
const STEP_DISTANCE_PX = CALENDAR_WIDTH_PX + CALENDAR_GAP_PX

const SHORT_MONTH_NAMES = Array.from(
  { length: 12 },
  (_, i) => DateTime.local(2024, i + 1, 1).monthShort!,
)

export const DateCalendar = () => {
  const { value, min, max, onChangeRef, captionLayout, showTime, yearRange } = useDateContext()
  const closePopover = usePopoverClose()
  const calendarContainerRef = useRef<HTMLDivElement | null>(null)
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
    if (isDropdown) {
      setCalendarDate((dt) => dt.plus({ months: 1 }))
      setForceRenderIncrement((c) => c + 1)
    } else {
      setCalendarSteps((c) => c + 1)
      setCalendarDate((dt) => dt.plus({ months: 1 }))
    }
  }

  const handlePrevious = () => {
    if (isDropdown) {
      setCalendarDate((dt) => dt.minus({ months: 1 }))
      setForceRenderIncrement((c) => c + 1)
    } else {
      setCalendarSteps((c) => c - 1)
      setCalendarDate((dt) => dt.minus({ months: 1 }))
    }
  }

  const handleDateSelect = (selectedDate: DateTime) => {
    if (showTime) {
      onChangeRef.current(selectedDate.set({ hour: pendingHour, minute: pendingMinute }))
    } else {
      onChangeRef.current(selectedDate)
      closePopover()
    }
  }

  const handleTimeChange = (hour: number, minute: number) => {
    setPendingHour(hour)
    setPendingMinute(minute)
    if (value) {
      onChangeRef.current(value.set({ hour, minute }))
    }
  }

  const handleDropdownMonthChange = (month: number) => {
    setCalendarDate(DateTime.local(calendarDate.year, month, 1))
    setForceRenderIncrement((c) => c + 1)
  }

  const handleDropdownYearChange = (year: number) => {
    setCalendarDate(DateTime.local(year, calendarDate.month, 1))
    setForceRenderIncrement((c) => c + 1)
  }

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

  // Detect height changes when new calendars are rendered
  useEffect(() => {
    waitForAnimationFrame(() => {
      const container = calendarContainerRef.current

      if (!container) {
        return
      }

      let maxHeight = -Infinity

      // Find the tallest calendar
      container.querySelectorAll("[data-calendar]")?.forEach((element) => {
        // NOTE: clientHeight does not respect the scale() that popover uses to animate in, which is what we want
        // We want to know the full height of the element, without any transform applied.
        const height = element.clientHeight

        // Ignore calendars that are exiting
        if (element.closest("[data-exiting")) {
          return
        }

        if (height > maxHeight) {
          maxHeight = height
        }
      })

      container.style.height = `${maxHeight}px`

      // Don't animate the initial height.
      // This is relevant when the calendar opens to a larger size than the default.
      if (!container.style.transition) {
        waitForAnimationFrame(() => {
          container.style.transition = `height 0.25s var(--cubic-move)`
        })
      }
    })
  }, [calendarDate])

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
            disabled={!canGoBack}
          >
            <ChevronLeft />
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
            disabled={!canGoForward}
          >
            <ChevronRight />
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
        <div
          className={s.CalendarRange}
          style={
            !isDropdown
              ? { transform: `translate(${calendarSteps * -1 * STEP_DISTANCE_PX}px, 0)` }
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
              hideMonthLabel
            />
          )}
        </div>
      </div>
      {showTime && (
        <TimeInput hour={pendingHour} minute={pendingMinute} onChange={handleTimeChange} />
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
  const hourRef = useRef<HTMLInputElement>(null)
  const minuteRef = useRef<HTMLInputElement>(null)
  const [hourText, setHourText] = useState<string | null>(null)
  const [minuteText, setMinuteText] = useState<string | null>(null)

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2)
    setHourText(raw)
    if (raw.length === 2) {
      onChange(Math.min(23, Number(raw)), minute)
      minuteRef.current?.focus()
      minuteRef.current?.select()
    }
  }

  const handleHourBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.currentTarget.value.replace(/\D/g, "").slice(0, 2)
    const h = Math.min(23, Number(raw) || 0)
    onChange(h, minute)
    setHourText(null)
  }

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2)
    setMinuteText(raw)
    if (raw.length === 2) {
      onChange(hour, Math.min(59, Number(raw)))
    }
  }

  const handleMinuteBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const raw = e.currentTarget.value.replace(/\D/g, "").slice(0, 2)
    const m = Math.min(59, Number(raw) || 0)
    onChange(hour, m)
    setMinuteText(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, type: "hour" | "minute") => {
    const step = e.shiftKey ? 10 : 1
    if (e.key === "ArrowUp") {
      e.preventDefault()
      if (type === "hour") {
        const h = (hour + step) % 24
        onChange(h, minute)
        setHourText(String(h).padStart(2, "0"))
      } else {
        const m = (minute + step) % 60
        onChange(hour, m)
        setMinuteText(String(m).padStart(2, "0"))
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      if (type === "hour") {
        const h = (hour - step + 24) % 24
        onChange(h, minute)
        setHourText(String(h).padStart(2, "0"))
      } else {
        const m = (minute - step + 60) % 60
        onChange(hour, m)
        setMinuteText(String(m).padStart(2, "0"))
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
  min?: DateTime
  max?: DateTime
  stepPosition: number
  hideMonthLabel?: boolean
}

const daysOfTheWeekLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

const CalendarView = ({
  date,
  selectedDate,
  min,
  max,
  onDateSelect,
  stepPosition,
  hideMonthLabel = false,
}: CalendarViewProps) => {
  // Lock position on mount and don't respond to changes
  const [position] = useState(stepPosition)
  const { startOfMonth, weeks, enabledInterval } = useMemo(() => {
    const monthStart = date.startOf("month")
    const endOfMonth = date.endOf("month")

    const daysBeforeMonthStart = monthStart.weekday % 7
    const blankDays = new Array(daysBeforeMonthStart).fill(null)
    const daysInMonth = getDaysOfMonth(monthStart)
    const calendarCells = [...blankDays, ...daysInMonth]

    const enabledDateInterval = Interval.fromDateTimes(min || monthStart, max || endOfMonth)

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
      style={hideMonthLabel ? undefined : { left: position * STEP_DISTANCE_PX }}
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
      <div className={s.Week}>
        {daysOfTheWeekLabels.map((day) => (
          <div key={day} className={s.DayLabel}>
            {day}
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
                <button
                  type="button"
                  className={s.InteractiveDay}
                  disabled={!enabled}
                  onClick={() => d && onDateSelect?.(d)}
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
