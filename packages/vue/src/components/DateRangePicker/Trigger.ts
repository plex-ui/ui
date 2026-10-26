import clsx from "clsx"
import type { DateTime } from "luxon"
import { computed, defineComponent, h, type VNodeChild } from "vue"
import { getMonthStartAndEnd, isBefore, isSameDay } from "../../lib/dateUtils.js"
import { Button } from "../Button/index.js"
import { Calendar, ChevronLeft, ChevronRight } from "../Icon/index.js"
import { SelectControl } from "../SelectControl/index.js"
import s from "@plexui/styles/components/DateRangePicker/Trigger.module.css"
import { useDateRangeContext } from "./context.js"
import { type DateRange, type DateRangeShortcut } from "./types.js"

// Vue port of packages/ui/src/components/DateRangePicker/Trigger.tsx.
// Attributes on the trigger (the popover trigger's props) land on the
// SelectControl last, like React's `{...props}` spread.

export const DateRangeTrigger = defineComponent({
  name: "DateRangeTrigger",
  inheritAttrs: false,
  setup(_props, { attrs }) {
    const context = useDateRangeContext()

    const isStepperView = computed<boolean>(() =>
      rangeMatchesStepperUnit(context.value, context.triggerStepperUnit, {
        min: context.min,
        max: context.max,
      }),
    )

    const activeShortcut = computed<DateRangeShortcut | undefined>(() => {
      const { value, shortcuts } = context
      if (!value || !shortcuts?.length) {
        return undefined
      }

      return shortcuts.find((sc) => {
        const [start, end] = sc.getDateRange()
        return isSameDay(start, value[0]) && isSameDay(end, value[1])
      })
    })

    const handleClearClick = () => {
      context.onChange(null)
    }

    const renderStepperView = (): VNodeChild => {
      const { value, min, max, disabled, pill, onChange } = context

      if (!value) {
        return null
      }

      const [startDate, endDate] = value
      const canGoBack = !min || isBefore(min, startDate.startOf("month"))
      const canGoForward = !max || isBefore(endDate.endOf("month"), max)

      return h("span", { class: s.StepperContent }, [
        h(
          Button,
          {
            "class": s.StepperPrevious,
            "color": "secondary",
            "variant": "ghost",
            "disabled": disabled || !canGoBack,
            "size": "3xs",
            "uniform": true,
            "pill": pill,
            "aria-label": "Previous month",
            // Stop the trigger from opening; the step itself runs on click so
            // Enter and Space work too
            "onPointerdown": (evt: PointerEvent) => evt.stopPropagation(),
            "onClick": (evt: MouseEvent) => {
              evt.stopPropagation()
              onChange(getMonthStartAndEnd(startDate.minus({ months: 1 }), { min, max }))
            },
          },
          { default: () => [h(ChevronLeft)] },
        ),
        h("span", { class: s.StepperText }, [startDate.monthLong, " ", String(startDate.year)]),
        h(
          Button,
          {
            "class": s.StepperNext,
            "color": "secondary",
            "variant": "ghost",
            "disabled": disabled || !canGoForward,
            "size": "3xs",
            "uniform": true,
            "pill": pill,
            "aria-label": "Next month",
            "onPointerdown": (evt: PointerEvent) => evt.stopPropagation(),
            "onClick": (evt: MouseEvent) => {
              evt.stopPropagation()
              onChange(getMonthStartAndEnd(startDate.plus({ months: 1 }), { min, max }))
            },
          },
          { default: () => [h(ChevronRight)] },
        ),
      ])
    }

    const renderDisplayView = (): VNodeChild => {
      const { placeholder, value, triggerDateFormat } = context
      const shortcut = activeShortcut.value

      if (shortcut) {
        return h("span", { class: "inline-block" }, shortcut.label)
      }
      if (value && isSameDay(value[0], value[1])) {
        return h("span", { class: "inline-block tabular-nums" }, value[0].toFormat(triggerDateFormat))
      }
      if (value) {
        return h("span", { class: "inline-block tabular-nums" }, [
          value[0].toFormat(triggerDateFormat),
          h("span", { class: s.RangeTextSeparator }, "-"),
          value[1].toFormat(triggerDateFormat),
        ])
      }
      return placeholder
    }

    return () => {
      const stepper = isStepperView.value

      return h(
        SelectControl,
        {
          class: clsx(stepper && s.StepperControl, context.triggerClassName),
          selected: !!context.value,
          variant: context.variant,
          pill: context.pill,
          block: context.block,
          size: context.size,
          disabled: context.disabled,
          StartIcon: context.triggerShowIcon && !stepper ? Calendar : undefined,
          dropdownIconType: !stepper ? context.dropdownIconType : "none",
          onClearClick: context.clearable && !stepper ? handleClearClick : undefined,
          ...attrs,
        },
        { default: () => [stepper ? renderStepperView() : renderDisplayView()] },
      )
    }
  },
})

const rangeMatchesStepperUnit = (
  range: DateRange | null,
  stepperUnit: "month" | undefined,
  { min, max }: { min?: DateTime; max?: DateTime } = {},
): boolean => {
  // Allows method to be called lazily
  if (!range || !stepperUnit) {
    return false
  }

  const [startDate, endDate] = range
  const [startDateCompare, endDateCompare] = getMonthStartAndEnd(startDate, {
    min,
    max,
  })

  return isSameDay(startDateCompare, startDate) && isSameDay(endDateCompare, endDate)
}
