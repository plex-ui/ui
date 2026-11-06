import { DateTime, Interval } from "luxon"
import { computed, defineComponent, h, nextTick, ref, shallowRef, watch, type PropType } from "vue"
import { chunkIntoWeeks, getDaysOfMonth, isAfter, isBefore, isSameDay, isToday } from "../../lib/dateUtils.js"
import { waitForAnimationFrame } from "../../lib/helpers.js"
import { Button } from "../Button/index.js"
import { CalendarNavigationIcon } from "./CalendarNavigationIcon.js"
import { usePopoverClose } from "../Popover/usePopoverController.js"
import { Select, type Option } from "../Select/index.js"
import { TransitionGroup } from "../Transition/index.js"
import s from "@plexui/styles/components/DatePicker/Calendar.module.css"
import { useDateContext } from "./context.js"

// Vue port of packages/ui/src/components/DatePicker/Calendar.tsx.
// - React's `[value]` effects are watchers on the context value; the height
//   effect runs on mount and when the visible month changes, after render.
// - The `stable-view-N` key on the wrapper remounts the calendar view, as in
//   React, when the value jumps out of view or the dropdowns change month.
// - React's pending-focus effect is a post watcher on the month; its cleanup
//   cancels the frame, as the effect's does.
// - The time fields are React controlled inputs: a typed value the state
//   does not take is put back, and the `value` attribute follows the shown
//   value (React syncs it for controlled inputs).

const SHORT_MONTH_NAMES = Array.from({ length: 12 }, (_, i) => DateTime.local(2024, i + 1, 1).monthShort!)

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

export const DateCalendar = defineComponent({
  name: "DateCalendar",
  setup() {
    const context = useDateContext()
    const closePopover = usePopoverClose()
    const calendarContainerRef = shallowRef<HTMLDivElement | null>(null)
    // The day to focus once a key has moved the view to its month. It lives
    // here, outside the wrapper that the dropdown layout re-keys
    let pendingFocus: DateTime | null = null
    const calendarSteps = ref(0)
    const forceRenderIncrement = ref(0)
    const calendarDate = shallowRef<DateTime>(context.value ?? DateTime.now())

    const pendingHour = ref(context.value?.hour ?? 12)
    const pendingMinute = ref(context.value?.minute ?? 0)

    watch(
      () => context.value,
      (value) => {
        if (value) {
          pendingHour.value = value.hour
          pendingMinute.value = value.minute
        }
      },
    )

    const isDropdown = () => context.captionLayout === "dropdown"

    const canGoBack = () => !context.min || isBefore(context.min, calendarDate.value.startOf("month"))
    const canGoForward = () => !context.max || isBefore(calendarDate.value.endOf("month"), context.max)

    const handleNext = () => {
      if (context.disabled) return
      if (isDropdown()) {
        calendarDate.value = calendarDate.value.plus({ months: 1 })
        forceRenderIncrement.value += 1
      } else {
        calendarSteps.value += 1
        calendarDate.value = calendarDate.value.plus({ months: 1 })
      }
    }

    const handlePrevious = () => {
      if (context.disabled) return
      if (isDropdown()) {
        calendarDate.value = calendarDate.value.minus({ months: 1 })
        forceRenderIncrement.value += 1
      } else {
        calendarSteps.value -= 1
        calendarDate.value = calendarDate.value.minus({ months: 1 })
      }
    }

    // The calendar limits whole days; with a time picker the chosen time on a
    // min or max day can still cross the bound, so clamp the full date-time
    const clampToBounds = (dateTime: DateTime) => {
      const { min, max } = context
      if (min && dateTime.toMillis() < min.toMillis()) return min
      if (max && dateTime.toMillis() > max.toMillis()) return max
      return dateTime
    }

    const handleDateSelect = (selectedDate: DateTime) => {
      if (context.disabled) return
      if (context.showTime) {
        context.onChange(clampToBounds(selectedDate.set({ hour: context.value?.hour ?? pendingHour.value, minute: context.value?.minute ?? pendingMinute.value })))
      } else {
        context.onChange(selectedDate)
        closePopover()
      }
    }

    const handleTimeChange = (hour: number, minute: number) => {
      if (context.disabled) return
      const value = context.value
      if (value) {
        // A controlled value is authoritative, including when the owner refuses the request.
        context.onChange(clampToBounds(value.set({ hour, minute })))
      } else {
        // Before a day is chosen the time is a local draft, not a selected date.
        pendingHour.value = hour
        pendingMinute.value = minute
      }
    }

    const handleDropdownMonthChange = (month: number) => {
      if (context.disabled) return
      calendarDate.value = DateTime.local(calendarDate.value.year, month, 1)
      forceRenderIncrement.value += 1
    }

    const handleDropdownYearChange = (year: number) => {
      if (context.disabled) return
      calendarDate.value = DateTime.local(year, calendarDate.value.month, 1)
      forceRenderIncrement.value += 1
    }

    // Days are named by their full date; skip a calendar that is leaving
    const focusDay = (day: DateTime) => {
      const label = day.toLocaleString(DateTime.DATE_HUGE)
      const buttons = calendarContainerRef.value?.querySelectorAll<HTMLButtonElement>(`button[aria-label="${label}"]`)
      Array.from(buttons ?? [])
        .find((button) => !button.closest("[data-exiting]"))
        ?.focus()
    }

    const handleDayKeyDown = (event: KeyboardEvent, day: DateTime) => {
      if (context.disabled || event.altKey || event.ctrlKey || event.metaKey) {
        return
      }

      // While a move waits for its month to render, the next key starts from
      // the day it is moving to (key repeat), not the day that still has focus
      const target = getKeyTarget(event.key, pendingFocus ?? day)
      if (!target) {
        return
      }

      event.preventDefault()

      // A disabled day keeps focus where it is
      if (!isDayWithinLimits(target, context.min, context.max)) {
        return
      }

      const months = monthIndex(target) - monthIndex(calendarDate.value)
      if (months === 0) {
        pendingFocus = null
        focusDay(target)
        return
      }

      // Step the view like the month buttons; a day within min/max keeps every step in bounds
      if (months > 0 ? !canGoForward() : !canGoBack()) {
        return
      }

      pendingFocus = target
      for (let step = 0; step < Math.abs(months); step++) {
        if (months > 0) {
          handleNext()
        } else {
          handlePrevious()
        }
      }
    }

    // Force re-renders when `value` changes out of band from direct user-selection
    watch(
      () => context.value,
      (value) => {
        // No-op when value is empty
        if (!value) {
          return
        }

        // Check if `value` is still within view of our calendar
        const viewInterval = Interval.fromDateTimes(
          calendarDate.value.startOf("month"),
          calendarDate.value.endOf("month"),
        )
        const isValueInRangeOfCalendar = viewInterval.contains(value)
        if (!isValueInRangeOfCalendar) {
          // Reset state the calendar view entirely
          calendarSteps.value = 0
          calendarDate.value = value
          forceRenderIncrement.value += 1
        }
      },
    )

    // Observe calendar border boxes as Phone geometry/fonts change, as well as month changes.
    watch([calendarDate, forceRenderIncrement, () => context.captionLayout], (_value, _previous, onCleanup) => {
      let cancelTransition: (() => void) | undefined
      let observer: ResizeObserver | undefined
      const cancelMeasure = waitForAnimationFrame(() => {
        const container = calendarContainerRef.value
        if (!container) return
        const calendars = () => Array.from(container.querySelectorAll<HTMLElement>("[data-calendar]"))
          .filter((element) => !element.closest("[data-exiting]"))
        const measure = () => {
          const visible = calendars()
          if (!visible.length) return
          const height = `${Math.max(...visible.map((element) => element.clientHeight))}px`
          if (container.style.height !== height) container.style.height = height
          // Do not animate the initial measurement. CSS follows live reduced motion.
          if (!container.style.transition && !cancelTransition) {
            cancelTransition = waitForAnimationFrame(() => {
              container.style.transition = "height var(--calendar-height-duration, 0.25s) var(--cubic-move)"
            })
          }
        }
        measure()
        observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : undefined
        observer?.observe(container, { box: "border-box" })
        calendars().forEach((calendar) => observer?.observe(calendar, { box: "border-box" }))
      })
      onCleanup(() => {
        cancelMeasure()
        cancelTransition?.()
        observer?.disconnect()
      })
    }, { immediate: true, flush: "post" })

    // Focus a pending day once its month has rendered. TransitionGroup marks
    // the leaving calendar after this render, so wait a frame like the height does
    watch(
      calendarDate,
      (_date, _previous, onCleanup) => {
        if (!pendingFocus) {
          return
        }

        onCleanup(
          waitForAnimationFrame(() => {
            const target = pendingFocus
            pendingFocus = null
            if (target) {
              focusDay(target)
            }
          }),
        )
      },
      { flush: "post" },
    )

    const setContainer = (el: unknown) => {
      calendarContainerRef.value = (el as HTMLDivElement | null) ?? null
    }

    return () => {
      const dropdown = isDropdown()
      const date = calendarDate.value
      const { value, min, max } = context
      const viewKey = date.toLocaleString({ month: "long", year: "numeric" })

      return h("div", { key: `stable-view-${forceRenderIncrement.value}`, class: s.CalendarWrapper }, [
        h(
          "div",
          { "ref": setContainer, "class": s.CalendarContainer, "data-dropdown": dropdown ? "" : undefined },
          [
            h("div", { class: s.Previous }, [
              h(
                Button,
                {
                  "variant": "ghost",
                  "color": "secondary",
                  "size": "sm",
                  "gutterSize": "2xs",
                  "pill": false,
                  "iconSize": "sm",
                  "onClick": handlePrevious,
                  "disabled": context.disabled || !canGoBack(),
                  "aria-label": "Previous month",
                },
                { default: () => [h(CalendarNavigationIcon, { direction: "previous" })] },
              ),
            ]),
            h("div", { class: s.Next }, [
              h(
                Button,
                {
                  "variant": "ghost",
                  "color": "secondary",
                  "size": "sm",
                  "gutterSize": "2xs",
                  "pill": false,
                  "iconSize": "sm",
                  "onClick": handleNext,
                  "disabled": context.disabled || !canGoForward(),
                  "aria-label": "Next month",
                },
                { default: () => [h(CalendarNavigationIcon, { direction: "next" })] },
              ),
            ]),
            dropdown
              ? h(DropdownCaption, {
                  date,
                  onMonthChange: handleDropdownMonthChange,
                  onYearChange: handleDropdownYearChange,
                  min,
                  max,
                  yearRange: context.yearRange,
                })
              : null,
            h("div", { class: s.CalendarViewport }, [
              h(
                "div",
                {
                  class: s.CalendarRange,
                  style: !dropdown
                    ? { transform: `translate(calc(${calendarSteps.value * -1} * var(--calendar-step)), 0)` }
                    : undefined,
                },
                [
                  !dropdown
                    ? h(
                        TransitionGroup,
                        { enterDuration: 400, exitDuration: 400 },
                        {
                          default: () => [
                            h(CalendarView, {
                              key: viewKey,
                              stepPosition: calendarSteps.value,
                              date,
                              selectedDate: value,
                              min,
                              max,
                              onDateSelect: handleDateSelect,
                              onDayKeyDown: handleDayKeyDown,
                              hideMonthLabel: false,
                            }),
                          ],
                        },
                      )
                    : h(CalendarView, {
                        key: viewKey,
                        stepPosition: 0,
                        date,
                        selectedDate: value,
                        min,
                        max,
                        onDateSelect: handleDateSelect,
                        onDayKeyDown: handleDayKeyDown,
                        hideMonthLabel: true,
                      }),
                ],
              ),
            ]),
          ],
        ),
        context.showTime
          ? h(TimeInput, { hour: context.value?.hour ?? pendingHour.value, minute: context.value?.minute ?? pendingMinute.value, onChange: handleTimeChange })
          : null,
      ])
    }
  },
})

const DropdownCaption = defineComponent({
  name: "DateCalendarDropdownCaption",
  props: {
    date: { type: Object as PropType<DateTime>, required: true },
    onMonthChange: { type: Function as PropType<(month: number) => void>, required: true },
    onYearChange: { type: Function as PropType<(year: number) => void>, required: true },
    min: Object as PropType<DateTime>,
    max: Object as PropType<DateTime>,
    yearRange: Array as unknown as PropType<[number, number]>,
  },
  setup(props) {
    const context = useDateContext()
    const minYear = computed(() => props.yearRange?.[0] ?? props.min?.year ?? DateTime.now().year - 120)
    const maxYear = computed(() => props.yearRange?.[1] ?? props.max?.year ?? DateTime.now().year)

    const years = computed(() => {
      const result: number[] = []
      for (let y = maxYear.value; y >= minYear.value; y--) {
        result.push(y)
      }
      return result
    })

    return () =>
      h("div", { class: s.DropdownCaption }, [
        h(Select, {
          "aria-label": "Month",
          "disabled": context.disabled,
          "listMinWidth": "auto",
          "listWidth": "auto",
          "variant": "ghost",
          "size": "sm",
          "dropdownIconType": "chevronDown",
          "value": String(props.date.month),
          "options": SHORT_MONTH_NAMES.map((label, index) => ({ value: String(index + 1), label })),
          "onChange": (option: Option | Option[]) => props.onMonthChange(Number((option as Option).value)),
        }),
        h(Select, {
          "aria-label": "Year",
          "disabled": context.disabled,
          "searchAriaLabel": "Search year",
          "listMinWidth": "auto",
          "listWidth": "auto",
          "variant": "ghost",
          "size": "sm",
          "dropdownIconType": "chevronDown",
          "value": String(props.date.year),
          "options": years.value.map((year) => ({ value: String(year), label: String(year) })),
          "onChange": (option: Option | Option[]) => props.onYearChange(Number((option as Option).value)),
        }),
      ])
  },
})

const pad = (value: number) => String(value).padStart(2, "0")

const TimeInput = defineComponent({
  name: "DateCalendarTimeInput",
  props: {
    hour: { type: Number, required: true },
    minute: { type: Number, required: true },
    onChange: { type: Function as PropType<(hour: number, minute: number) => void>, required: true },
  },
  setup(props) {
    const context = useDateContext()
    const minuteRef = shallowRef<HTMLInputElement | null>(null)
    const hourText = ref<string | null>(null)
    const minuteText = ref<string | null>(null)

    // Disabling a focused input does not reliably blur it. Cancel both drafts
    // independently so they cannot mask a later owner value or commit on re-enable.
    watch(() => context.disabled, (disabled) => {
      if (!disabled) return
      hourText.value = null
      minuteText.value = null
    }, { flush: "sync" })

    const hourValue = () => hourText.value ?? pad(props.hour)
    const minuteValue = () => minuteText.value ?? pad(props.minute)

    // Like a React controlled input, a typed value the state does not take is put back
    const restore = (target: HTMLInputElement, shown: () => string) => {
      void nextTick(() => {
        const value = shown()
        if (target.value !== value) target.value = value
      })
    }

    const handleHourChange = (e: Event) => {
      if (context.disabled) return
      const target = e.target as HTMLInputElement
      const raw = target.value.replace(/\D/g, "").slice(0, 2)
      hourText.value = raw
      if (raw.length === 2) {
        props.onChange(Math.min(23, Number(raw)), props.minute)
        minuteRef.value?.focus()
        minuteRef.value?.select()
      }
      restore(target, hourValue)
    }

    const handleHourBlur = (e: FocusEvent) => {
      hourText.value = null
      if (context.disabled) return
      const raw = (e.currentTarget as HTMLInputElement).value.replace(/\D/g, "").slice(0, 2)
      const h = Math.min(23, Number(raw) || 0)
      props.onChange(h, props.minute)
    }

    const handleMinuteChange = (e: Event) => {
      if (context.disabled) return
      const target = e.target as HTMLInputElement
      const raw = target.value.replace(/\D/g, "").slice(0, 2)
      minuteText.value = raw
      if (raw.length === 2) {
        props.onChange(props.hour, Math.min(59, Number(raw)))
        // Show the accepted value: the parent may clamp it to min/max
        minuteText.value = null
      }
      restore(target, minuteValue)
    }

    const handleMinuteBlur = (e: FocusEvent) => {
      minuteText.value = null
      if (context.disabled) return
      const raw = (e.currentTarget as HTMLInputElement).value.replace(/\D/g, "").slice(0, 2)
      const m = Math.min(59, Number(raw) || 0)
      props.onChange(props.hour, m)
    }

    // Arrow steps drop the draft text so the field shows the accepted value,
    // which the parent may have clamped to min/max
    const handleKeyDown = (e: KeyboardEvent, type: "hour" | "minute") => {
      if (context.disabled) return
      const step = e.shiftKey ? 10 : 1
      const { hour, minute } = props
      if (e.key === "ArrowUp") {
        e.preventDefault()
        if (type === "hour") {
          props.onChange((hour + step) % 24, minute)
          hourText.value = null
        } else {
          props.onChange(hour, (minute + step) % 60)
          minuteText.value = null
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        if (type === "hour") {
          props.onChange((hour - step + 24) % 24, minute)
          hourText.value = null
        } else {
          props.onChange(hour, (minute - step + 60) % 60)
          minuteText.value = null
        }
      }
    }

    const setMinuteRef = (el: unknown) => {
      minuteRef.value = (el as HTMLInputElement | null) ?? null
    }

    return () => {
      const hour = hourValue()
      const minute = minuteValue()

      return h("div", { class: s.TimeFooter }, [
        h("span", { class: s.TimeLabel }, "Time"),
        h("div", { class: s.TimeInputGroup }, [
          h("input", {
            "class": s.TimeField,
            "disabled": context.disabled,
            "type": "text",
            "inputmode": "numeric",
            "value": hour,
            // React keeps the `value` attribute in sync with a controlled value
            "^value": hour,
            "onInput": handleHourChange,
            "onBlur": handleHourBlur,
            "onFocus": (e: FocusEvent) => {
              const target = e.target as HTMLInputElement
              hourText.value = target.value
              target.select()
            },
            "onKeydown": (e: KeyboardEvent) => handleKeyDown(e, "hour"),
            "maxlength": 2,
            "aria-label": "Hour",
          }),
          h("span", { class: s.TimeSeparator }, ":"),
          h("input", {
            "ref": setMinuteRef,
            "class": s.TimeField,
            "disabled": context.disabled,
            "type": "text",
            "inputmode": "numeric",
            "value": minute,
            "^value": minute,
            "onInput": handleMinuteChange,
            "onBlur": handleMinuteBlur,
            "onFocus": (e: FocusEvent) => {
              const target = e.target as HTMLInputElement
              minuteText.value = target.value
              target.select()
            },
            "onKeydown": (e: KeyboardEvent) => handleKeyDown(e, "minute"),
            "maxlength": 2,
            "aria-label": "Minute",
          }),
        ]),
      ])
    }
  },
})

const daysOfTheWeekLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const CalendarView = defineComponent({
  name: "DateCalendarView",
  props: {
    date: { type: Object as PropType<DateTime>, required: true },
    selectedDate: { type: Object as PropType<DateTime | null>, default: undefined },
    onDateSelect: Function as PropType<(dt: DateTime) => void>,
    onDayKeyDown: Function as PropType<(event: KeyboardEvent, dt: DateTime) => void>,
    min: Object as PropType<DateTime>,
    max: Object as PropType<DateTime>,
    stepPosition: { type: Number, required: true },
    hideMonthLabel: { type: Boolean, default: false },
  },
  setup(props) {
    const context = useDateContext()
    // Lock position on mount and don't respond to changes
    const position = props.stepPosition
    const view = computed(() => {
      const { date, min, max } = props
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
        weeks: chunkIntoWeeks(calendarCells, 7) as Array<Array<DateTime | null>>,
        enabledInterval: enabledDateInterval,
      }
    })

    return () => {
      const { startOfMonth, weeks, enabledInterval } = view.value
      const { hideMonthLabel, selectedDate } = props

      return h(
        "div",
        {
          "class": s.Calendar,
          "style": hideMonthLabel ? undefined : { left: `calc(${position} * var(--calendar-step))` },
          "data-calendar": true,
          "data-static": hideMonthLabel ? "" : undefined,
        },
        [
          hideMonthLabel
            ? h("div", { "class": s.MonthLabelSpacer, "aria-hidden": "true" })
            : h("p", { class: s.MonthLabel }, [startOfMonth.monthLong, " ", String(startOfMonth.year)]),
          h(
            "div",
            { class: [s.Week, s.WeekdayHeader] },
            daysOfTheWeekLabels.map((day) => h("div", { key: day, class: s.DayLabel }, [
              h("span", { class: s.ShortDayLabel }, day.slice(0, 2)),
              h("span", { class: s.LongDayLabel }, day),
            ])),
          ),
          ...weeks.map((week, weekIndex) =>
            h(
              "div",
              { class: s.Week, key: weekIndex },
              week.map((d, dayIndex) => {
                if (!d) {
                  return h("div", { class: s.Day, key: `${weekIndex}-${dayIndex}` })
                }

                const enabled = enabledInterval.contains(d)
                const isSelected = enabled && selectedDate && isSameDay(d, selectedDate)
                const dayIsToday = isToday(d)

                return h("div", { "class": s.Day, "key": dayIndex, "data-is-selected": isSelected ? "" : undefined }, [
                  // The full date names the day, which "15" alone does not across months
                  h(
                    "button",
                    {
                      "type": "button",
                      "class": s.InteractiveDay,
                      "disabled": context.disabled || !enabled,
                      "aria-label": d.toLocaleString(DateTime.DATE_HUGE),
                      "aria-pressed": isSelected ? "true" : "false",
                      "aria-current": dayIsToday ? "date" : undefined,
                      "onClick": () => { if (!context.disabled && d) props.onDateSelect?.(d) },
                      "onKeydown": (event: KeyboardEvent) => d && props.onDayKeyDown?.(event, d),
                    },
                    [String(d.day), dayIsToday ? h("span", { class: s.TodayDot }) : null],
                  ),
                ])
              }),
            ),
          ),
        ],
      )
    }
  },
})
