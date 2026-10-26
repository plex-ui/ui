import type { DateTime } from "luxon"
import { computed, defineComponent, h, provide, toRaw, type PropType } from "vue"
import type { ControlSize } from "@plexui/styles/types"
import { isBefore } from "../../lib/dateUtils.js"
import { Popover, PopoverContent, PopoverTrigger, type PopoverAlign, type PopoverSide } from "../Popover/index.js"
import type { DropdownIconType } from "../SelectControl/index.js"
import { DateRangeCalendar, DateRangeShortcuts } from "./Calendar.js"
import { DateRangeContextKey, type DateRangeContextValue } from "./context.js"
import { DateRangeTrigger } from "./Trigger.js"
import { type DateRange, type DateRangeShortcut } from "./types.js"

// Vue port of packages/ui/src/components/DateRangePicker/DateRangePicker.tsx.
// - `value` + `update:value` (`v-model:value`), plus `change`, which also
//   carries the selected shortcut like React's `onChange(range, shortcut)`.
//   Like React the picker is controlled: a parent that does not update
//   `value` keeps the shown range.
// - DateTime values are read unwrapped (`toRaw`), so a `ref()` holding a
//   range (a deep reactive proxy) works like a plain value.

const DateRangePickerComponent = defineComponent({
  name: "DateRangePicker",
  inheritAttrs: false,
  props: {
    /** The selected date range value (`v-model:value`). */
    value: { type: Array as unknown as PropType<DateRange | null>, default: null },
    /** Defines the earliest selectable date (inclusive). */
    min: Object as PropType<DateTime>,
    /** Defines the latest selectable date (inclusive). */
    max: Object as PropType<DateTime>,
    /** Maximum length of the selectable range in days (inclusive). */
    maxRangeDays: Number,
    /** Date range shortcuts for quick selection, shown to the left of the calendar. */
    shortcuts: Array as PropType<DateRangeShortcut[]>,
    /** The preferred side of the trigger to render against when open. @default "bottom" */
    side: { type: String as PropType<PopoverSide>, default: "bottom" },
    /** The distance in pixels from the trigger. @default 8 */
    sideOffset: { type: Number, default: 8 },
    /** The preferred alignment against the trigger. @default "center" */
    align: { type: String as PropType<PopoverAlign>, default: "center" },
    /** An offset in pixels from the "start" or "end" alignment options. @default 0 */
    alignOffset: Number,
    /** Disables the select visually and from interactions. @default false */
    disabled: { type: Boolean, default: false },
    /** Placeholder text for the select. @default "Select date range..." */
    placeholder: { type: String, default: "Select date range..." },
    /** Style variant for the select trigger. @default "outline" */
    variant: { type: String as PropType<"soft" | "outline" | "ghost">, default: "outline" },
    /** Determines if the select trigger should be a fully rounded pill shape. @default true */
    pill: { type: Boolean, default: true },
    /** Size of the control: `3xs` 22px up to `3xl` 48px. @default "md" */
    size: { type: String as PropType<ControlSize>, default: "md" },
    /** Icon displayed in the far right of the select trigger. @default "dropdown" */
    dropdownIconType: String as PropType<DropdownIconType>,
    /** Custom class applied to the select trigger */
    triggerClassName: String,
    /** Display calendar icon at the start of the trigger. @default true */
    triggerShowIcon: { type: Boolean, default: true },
    /** Shows a stepper in the trigger when the selected range matches the unit ('month'). */
    triggerStepperUnit: String as PropType<"month">,
    /** Format of dates displayed in the trigger. @default "MM/dd/yy" */
    triggerDateFormat: { type: String, default: "MM/dd/yy" },
    /** Display a clear action that allows the select to be unset. @default false */
    clearable: { type: Boolean, default: false },
    /** Extends select to 100% of available width. @default false */
    block: { type: Boolean, default: false },
  },
  emits: {
    "update:value": (_nextValue: DateRange | null) => true,
    "change": (_nextValue: DateRange | null, _shortcut?: DateRangeShortcut) => true,
  },
  setup(props, { emit }) {
    const unwrap = <T>(value: T): T => (value ? toRaw(value) : value)

    // A new range only when `value` changes, as the identity React's effects see
    const value = computed<DateRange | null>(() => {
      const range = unwrap(props.value)
      if (!range) return null
      const [start, end] = range
      return start === toRaw(start) && end === toRaw(end) ? range : [toRaw(start), toRaw(end)]
    })

    const store: DateRangeContextValue = {
      get value() {
        return value.value
      },
      get min() {
        return unwrap(props.min)
      },
      get max() {
        return unwrap(props.max)
      },
      get maxRangeDays() {
        return props.maxRangeDays
      },
      get triggerStepperUnit() {
        return props.triggerStepperUnit
      },
      get triggerClassName() {
        return props.triggerClassName
      },
      get triggerShowIcon() {
        return props.triggerShowIcon
      },
      get triggerDateFormat() {
        return props.triggerDateFormat
      },
      get disabled() {
        return props.disabled
      },
      get variant() {
        return props.variant
      },
      get pill() {
        return props.pill
      },
      get block() {
        return props.block
      },
      get size() {
        return props.size
      },
      get dropdownIconType() {
        return props.dropdownIconType
      },
      get clearable() {
        return props.clearable
      },
      get placeholder() {
        return props.placeholder
      },
      get shortcuts() {
        return props.shortcuts
      },
      onChange: (nextValue, shortcut) => {
        emit("update:value", nextValue)
        emit("change", nextValue, shortcut)
      },
    }
    provide(DateRangeContextKey, store)

    return () => {
      const { min, max } = store
      const { align } = props

      if (min && max && !isBefore(min, max)) {
        throw new Error("DateRangePicker error: `min` date must be before the `max` date")
      }

      return h(Popover, null, {
        default: () => [
          h(PopoverTrigger, null, { default: () => [h(DateRangeTrigger)] }),
          h(
            PopoverContent,
            {
              minWidth: 230,
              side: props.side,
              sideOffset: props.sideOffset,
              align,
              alignOffset: props.alignOffset ?? (align === "center" ? 0 : -5),
            },
            {
              default: () => [
                h("div", { class: "flex" }, [h(DateRangeShortcuts, { shortcuts: props.shortcuts }), h(DateRangeCalendar)]),
              ],
            },
          ),
        ],
      })
    }
  },
})

export type DateRangePickerProps = InstanceType<typeof DateRangePickerComponent>["$props"]

/**
 * A date range picker: a SelectControl trigger (or a month stepper) opening
 * two calendars and optional shortcuts in a popover. Bind the range
 * (`[start, end]` luxon `DateTime`s) with `v-model:value`.
 */
export const DateRangePicker = DateRangePickerComponent
