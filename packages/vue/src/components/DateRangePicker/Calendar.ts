import { DateTime, Interval } from "luxon"
import { computed, createCommentVNode, defineComponent, h, onMounted, ref, shallowRef, watch, type PropType } from "vue"
import { useBreakpoint } from "../../composables/useBreakpoints.js"
import { chunkIntoWeeks, getDaysOfMonth, isAfter, isBefore, isSameDay, isToday } from "../../lib/dateUtils.js"
import { waitForAnimationFrame } from "../../lib/helpers.js"
import { Button } from "../Button/index.js"
import { Check, ChevronLeft, ChevronRight } from "../Icon/index.js"
import { TransitionGroup } from "../Transition/index.js"
import s from "@plexui/styles/components/DateRangePicker/Calendar.module.css"
import { useDateRangeContext } from "./context.js"
import { type DateRange, type DateRangeShortcut } from "./types.js"

// Vue port of packages/ui/src/components/DateRangePicker/Calendar.tsx.
// - React's `[value]` effect is a watcher on the context value; the height
//   effect runs on mount and when the left month changes, after render.
// - The `stable-view-N` key on the wrapper remounts the calendar view, as in
//   React, when the value jumps out of view.
// - Below the `sm` breakpoint the right calendar is a placeholder, as React's
//   `{isSmallUp && ...}`: TransitionGroup still renders its (empty) wrapper
//   when animations are off.
// - React quirks kept: the day buttons have no `type`, and the height
//   measurement skips exiting calendars with the selector `[data-exiting`
//   (unclosed, which browsers and jsdom accept).

const CALENDAR_WIDTH_PX = 210
const CALENDAR_GAP_PX = 32
const STEP_DISTANCE_PX = CALENDAR_WIDTH_PX + CALENDAR_GAP_PX

export const DateRangeCalendar = defineComponent({
  name: "DateRangeCalendar",
  setup() {
    const context = useDateRangeContext()
    const isSmallUp = useBreakpoint("sm")
    const calendarContainerRef = shallowRef<HTMLDivElement | null>(null)
    const selectionRange = shallowRef<DateRange | null>(null)
    const calendarSteps = ref(0)
    const forceRenderIncrement = ref(0)
    const leftCalendarDate = shallowRef<DateTime>(
      isSmallUp.value
        ? getLeftCalendarDate(context.value?.[0] ?? DateTime.now(), context.max)
        : (context.value?.[0] ?? DateTime.now()),
    )

    const rightCalendarDate = computed(() =>
      isSmallUp.value
        ? leftCalendarDate.value.plus({ months: 1 }).startOf("month")
        : leftCalendarDate.value.startOf("month"),
    )

    const handleNext = () => {
      calendarSteps.value += 1
      leftCalendarDate.value = leftCalendarDate.value.plus({ months: 1 })
    }

    const handlePrevious = () => {
      calendarSteps.value -= 1
      leftCalendarDate.value = leftCalendarDate.value.minus({ months: 1 })
    }

    const handleDateSelect = (selectedDate: DateTime) => {
      if (!selectionRange.value) {
        selectionRange.value = [selectedDate, selectedDate]
        return
      }

      const [currentSelectionStartDate] = selectionRange.value

      // Selecting a date before the current selected start date moves the start date
      // but does not resolve the selection
      if (isBefore(selectedDate, currentSelectionStartDate)) {
        selectionRange.value = [selectedDate, selectedDate]
        return
      }

      // Resolve the selection by emitting the value and clearing selection
      context.onChange([currentSelectionStartDate, selectedDate])
      selectionRange.value = null
    }

    const handleDateMouseEnter = (hoveredDate: DateTime) => {
      // If we're not actively selecting, no-op
      const currentSelectionRange = selectionRange.value
      if (!currentSelectionRange) {
        return
      }

      const [currentStartDate] = currentSelectionRange

      // When hovering a date before the current date, don't change the selection range
      if (isBefore(hoveredDate, currentStartDate)) {
        selectionRange.value = [currentStartDate, currentStartDate]
        return
      }

      selectionRange.value = [currentStartDate, hoveredDate]
    }

    const handleCalendarMouseLeave = () => {
      // If we're not actively selecting, no-op
      const currentSelectionRange = selectionRange.value
      if (!currentSelectionRange) {
        return
      }

      // Reset the end selection
      const [currentStartDate] = currentSelectionRange
      selectionRange.value = [currentStartDate, currentStartDate]
    }

    // Force re-renders when `value` changes out of brand from direct user-selection
    watch(
      () => context.value,
      (value) => {
        // When a new value is received, it could be out of band from the control of this calendar.
        // For example, a shortcut could be selected, or clear could be pressed. In either case, selection
        // should be reset so that the new `value` can be displayed fully.
        selectionRange.value = null

        // Nothing else to do when value is empty
        if (!value) {
          return
        }

        // Check if `value` is still within view of our calendar
        const viewInterval = Interval.fromDateTimes(
          leftCalendarDate.value.startOf("month"),
          rightCalendarDate.value.endOf("month"),
        )
        const isValueInRangeOfCalendar = viewInterval.contains(value[0]) || viewInterval.contains(value[1])
        if (!isValueInRangeOfCalendar) {
          // Reset state the calendar view entirely
          selectionRange.value = null
          calendarSteps.value = 0
          leftCalendarDate.value = isSmallUp.value ? getLeftCalendarDate(value[0], context.max) : value[0]
          forceRenderIncrement.value += 1
        }
      },
    )

    // Detect height changes when new calendars are rendered
    const measureHeight = () => {
      waitForAnimationFrame(() => {
        const container = calendarContainerRef.value

        if (!container) {
          return
        }

        let maxHeight = -Infinity

        // Find the tallest calendar
        container.querySelectorAll<HTMLElement>("[data-calendar]")?.forEach((element) => {
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
    }
    onMounted(measureHeight)
    watch(leftCalendarDate, measureHeight, { flush: "post" })

    const setContainer = (el: unknown) => {
      calendarContainerRef.value = (el as HTMLDivElement | null) ?? null
    }

    return () => {
      const { value, min, max, maxRangeDays } = context
      const left = leftCalendarDate.value
      const right = rightCalendarDate.value
      const canGoBack = !min || isBefore(min, left.startOf("month"))
      const canGoForward = !max || isBefore(right.endOf("month"), max)
      const selection = selectionRange.value
      const selectedDisplayValue = selection || value
      const viewProps = {
        selectedDates: selectedDisplayValue,
        min,
        max,
        selectionStart: selection?.[0],
        maxRangeDays,
        isSelecting: !!selection,
        onDateSelect: handleDateSelect,
        onDateMouseEnter: handleDateMouseEnter,
      }

      return h("div", { key: `stable-view-${forceRenderIncrement.value}`, class: s.CalendarWrapper }, [
        h("div", { ref: setContainer, class: s.CalendarContainer, onMouseleave: handleCalendarMouseLeave }, [
          h("div", { class: s.Previous }, [
            h(
              Button,
              {
                "variant": "ghost",
                "color": "secondary",
                "size": "sm",
                "pill": false,
                "gutterSize": "2xs",
                "iconSize": "sm",
                "onClick": handlePrevious,
                "disabled": !canGoBack,
                "aria-label": "Previous month",
              },
              { default: () => [h(ChevronLeft)] },
            ),
          ]),
          h("div", { class: s.Next }, [
            h(
              Button,
              {
                "variant": "ghost",
                "color": "secondary",
                "size": "sm",
                "pill": false,
                "gutterSize": "2xs",
                "iconSize": "sm",
                "onClick": handleNext,
                "disabled": !canGoForward,
                "aria-label": "Next month",
              },
              { default: () => [h(ChevronRight)] },
            ),
          ]),
          h(
            "div",
            {
              class: s.CalendarRange,
              style: { transform: `translate(${calendarSteps.value * -1 * STEP_DISTANCE_PX}px, 0)` },
            },
            [
              h(
                TransitionGroup,
                { enterDuration: 400, exitDuration: 400 },
                {
                  default: () => [
                    h(CalendarView, {
                      key: left.toLocaleString({ month: "long", year: "numeric" }),
                      stepPosition: calendarSteps.value,
                      date: left,
                      ...viewProps,
                    }),
                    isSmallUp.value
                      ? h(CalendarView, {
                          key: right.toLocaleString({ month: "long", year: "numeric" }),
                          stepPosition: calendarSteps.value + 1,
                          date: right,
                          ...viewProps,
                        })
                      : createCommentVNode(),
                  ],
                },
              ),
            ],
          ),
        ]),
      ])
    }
  },
})

const daysOfTheWeekLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

const CalendarView = defineComponent({
  name: "DateRangeCalendarView",
  props: {
    // Can be any day within the given month that the calendar should render for
    date: { type: Object as PropType<DateTime>, required: true },
    selectedDates: { type: Array as unknown as PropType<DateRange | null>, default: undefined },
    onDateSelect: Function as PropType<(dt: DateTime) => void>,
    onDateMouseEnter: Function as PropType<(dt: DateTime) => void>,
    min: Object as PropType<DateTime>,
    max: Object as PropType<DateTime>,
    selectionStart: { type: Object as PropType<DateTime | null>, default: undefined },
    maxRangeDays: Number,
    isSelecting: Boolean,
    stepPosition: { type: Number, required: true },
  },
  setup(props) {
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

    const selectedInterval = computed<Interval | null>(() => {
      const [selectedStart, selectedEnd] = props.selectedDates || []
      if (!selectedStart || !selectedEnd) {
        return null
      }

      return Interval.fromDateTimes(selectedStart.startOf("day"), selectedEnd.endOf("day"))
    })

    return () => {
      const { startOfMonth, weeks, enabledInterval } = view.value
      const { selectionStart, maxRangeDays, isSelecting } = props
      const [selectedStart, selectedEnd] = props.selectedDates || []
      const rangeEndLimit =
        selectionStart && maxRangeDays != null ? selectionStart.plus({ days: maxRangeDays - 1 }) : undefined

      return h("div", { "class": s.Calendar, "style": { left: `${position * STEP_DISTANCE_PX}px` }, "data-calendar": true }, [
        h("p", { class: s.MonthLabel }, [startOfMonth.monthLong, " ", String(startOfMonth.year)]),
        h(
          "div",
          { class: s.Week },
          daysOfTheWeekLabels.map((day) => h("div", { key: day, class: s.DayLabel }, day)),
        ),
        ...weeks.map((week, weekIndex) =>
          h(
            "div",
            { class: s.Week, key: weekIndex },
            week.map((d, dayIndex) => {
              if (!d) {
                return h("div", { class: s.Day, key: `${weekIndex}-${dayIndex}` })
              }

              // Check if 'day' is within selected range
              const enabled = enabledInterval.contains(d) && !(isSelecting && rangeEndLimit && isAfter(d, rangeEndLimit))
              const isStart = enabled && selectedStart && isSameDay(d, selectedStart)
              const isEnd = enabled && selectedEnd && isSameDay(d, selectedEnd)
              const hasRange = selectedStart && selectedEnd && !isSameDay(selectedStart, selectedEnd)
              const isInRange = hasRange && selectedInterval.value?.contains(d)
              const dayIsToday = isToday(d)
              const isFirstRangeTrail =
                d.day === 1 &&
                // Trail doesn't make sense to display at the start of the week (Monday)
                d.weekday !== 7 &&
                isInRange &&
                !isStart
              const isLastRangeTrail =
                d.day === d.daysInMonth &&
                // Trail doesn't make sense to display at the end of the week (Saturday)
                d.weekday !== 6 &&
                isInRange &&
                !isEnd

              return h(
                "div",
                {
                  "class": s.Day,
                  "key": dayIndex,
                  "data-is-start": isStart ? "" : undefined,
                  "data-is-end": isEnd ? "" : undefined,
                  "data-is-in-range": isInRange ? "" : undefined,
                  "data-is-first-range-trail": isFirstRangeTrail ? "" : undefined,
                  "data-is-last-range-trail": isLastRangeTrail ? "" : undefined,
                },
                [
                  // The full date names the day, which "15" alone does not across months
                  h(
                    "button",
                    {
                      "class": s.InteractiveDay,
                      "disabled": !enabled,
                      "aria-label": d.toLocaleString(DateTime.DATE_HUGE),
                      "aria-pressed": isStart || isEnd || isInRange ? "true" : "false",
                      "aria-current": dayIsToday ? "date" : undefined,
                      "onClick": () => d && props.onDateSelect?.(d),
                      "onMouseenter": () => d && props.onDateMouseEnter?.(d),
                    },
                    [String(d.day), dayIsToday ? h("span", { class: s.TodayDot }) : null],
                  ),
                ],
              )
            }),
          ),
        ),
      ])
    }
  },
})

export const DateRangeShortcuts = defineComponent({
  name: "DateRangeShortcuts",
  props: {
    shortcuts: Array as PropType<DateRangeShortcut[]>,
  },
  setup(props) {
    const isMediumUp = useBreakpoint("md")
    const context = useDateRangeContext()

    return () => {
      const { shortcuts } = props
      if (!isMediumUp.value || !shortcuts?.length) {
        return null
      }

      const { value, min, max, maxRangeDays, onChange } = context

      return h(
        "div",
        { class: s.Shortcuts },
        shortcuts.map((shortcut) => {
          const { label, getDateRange } = shortcut
          const range = getDateRange()
          const [start, end] = range
          const isActive = !!value && isSameDay(value[0], start) && isSameDay(value[1], end)

          return h(
            Button,
            {
              key: label,
              class: "mb-1",
              variant: "ghost",
              color: "primary",
              pill: false,
              size: "md",
              iconSize: "sm",
              block: true,
              selected: isActive,
              disabled: !isRangeWithinLimits(range, min, max, maxRangeDays),
              onClick: () => onChange(range, shortcut),
            },
            { default: () => [h("span", { class: s.ButtonText }, label), isActive ? h(Check) : null] },
          )
        }),
      )
    }
  },
})

// A shortcut follows the calendar's limits: whole days from min to max, and
// no more than maxRangeDays days
const isRangeWithinLimits = ([start, end]: DateRange, min?: DateTime, max?: DateTime, maxRangeDays?: number) =>
  !(min && isBefore(start, min.startOf("day"))) &&
  !(max && isAfter(end, max.endOf("day"))) &&
  !(maxRangeDays != null && isAfter(end.startOf("day"), start.startOf("day").plus({ days: maxRangeDays - 1 })))

const getLeftCalendarDate = (targetDate: DateTime, maxDate?: DateTime) => {
  if (!maxDate) {
    return targetDate
  }

  return isBefore(targetDate.endOf("month"), maxDate) ? targetDate : targetDate.minus({ months: 1 })
}
