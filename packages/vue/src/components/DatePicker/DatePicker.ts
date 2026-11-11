import s from "@plexui/styles/components/DatePicker/Calendar.module.css"
import { DateTime } from "luxon"
import { defineComponent, h, provide, toRaw, useId, type PropType } from "vue"
import type { ControlSize } from "@plexui/styles/types"
import { useBreakpoint } from "../../composables/useBreakpoints.js"
import { isAfter } from "../../lib/dateUtils.js"
import { Calendar } from "../Icon/index.js"
import { Popover, PopoverContent, PopoverTrigger, type PopoverAlign, type PopoverSide } from "../Popover/index.js"
import { SelectControl, type DropdownIconType } from "../SelectControl/index.js"
import { DateCalendar } from "./Calendar.js"
import { useCalendarCollisionPadding } from "./useCalendarCollisionPadding.js"
import { DateContextKey, type DateContextValue } from "./context.js"

// Vue port of packages/ui/src/components/DatePicker/DatePicker.tsx.
// - `value` + `update:value` (`v-model:value`), plus `change` with the same
//   value (React's `onChange`). Like React the picker is controlled: a
//   parent that does not update `value` keeps the shown date.
// - `aria-label`, `aria-labelledby`, `aria-describedby` and `aria-invalid`
//   reach the trigger, as in React. Other attributes are not passed on
//   (React's DatePicker takes no other props).
// - DateTime values are read unwrapped (`toRaw`), so a `ref()` holding one
//   (a deep reactive proxy) works like a plain value.

const DatePickerComponent = defineComponent({
  name: "DatePicker",
  inheritAttrs: false,
  props: {
    /** Allow targeting the input for forms and accessibility. */
    id: String,
    "ariaLabel": String,
    "ariaLabelledby": String,
    "ariaDescribedby": String,
    "ariaInvalid": {
      type: [Boolean, String] as PropType<boolean | "true" | "false" | "grammar" | "spelling">,
      default: undefined,
    },
    /** The selected date value (`v-model:value`). */
    value: { type: Object as PropType<DateTime | null>, default: null },
    /** Defines the earliest selectable date (inclusive). */
    min: Object as PropType<DateTime>,
    /** Defines the latest selectable date (inclusive). */
    max: Object as PropType<DateTime>,
    /** Preferred side; collisions can flip it. On phones, left and right prefer bottom so seven 44px day targets fit. @default "bottom" */
    side: { type: String as PropType<PopoverSide>, default: "bottom" },
    /** The distance in pixels from the trigger. @default 8 */
    sideOffset: { type: Number, default: 8 },
    /** The preferred alignment against the trigger. @default "center" */
    align: { type: String as PropType<PopoverAlign>, default: "center" },
    /** An offset in pixels from the "start" or "end" alignment options. @default 0 */
    alignOffset: Number,
    /** Disables the select visually and from interactions. @default false */
    disabled: { type: Boolean, default: false },
    /** Placeholder text for the select. @default "Select date..." */
    placeholder: { type: String, default: "Select date..." },
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
    /** Format of dates displayed in the trigger. @default "MM/dd/yy" ("MM/dd/yy HH:mm" with `showTime` and no `triggerTimeFormat`) */
    triggerDateFormat: String,
    /**
     * With `showTime`, the format of the time shown after the date in the trigger. The date and the time are
     * then two parts: in a row of a `FieldGroup` on a phone, the two capsules of iOS's compact date and time.
     */
    triggerTimeFormat: String,
    /** Display a clear action that allows the select to be unset. @default false */
    clearable: { type: Boolean, default: false },
    /** Extends select to 100% of available width. @default false */
    block: { type: Boolean, default: false },
    /** Calendar header: arrow navigation (`"buttons"`) or month and year dropdowns. @default "buttons" */
    captionLayout: { type: String as PropType<"buttons" | "dropdown">, default: "buttons" },
    /** Show time input below the calendar for combined date and time selection. @default false */
    showTime: { type: Boolean, default: false },
    /** Range of selectable years when `captionLayout` is `"dropdown"`. @default [currentYear - 120, currentYear] */
    yearRange: Array as unknown as PropType<[number, number]>,
  },
  emits: {
    "update:value": (nextValue: DateTime | null) => nextValue === null || DateTime.isDateTime(nextValue),
    "change": (nextValue: DateTime | null) => nextValue === null || DateTime.isDateTime(nextValue),
  },
  setup(props, { emit }) {
    const wide = useBreakpoint("md")
    const calendarCollisionPadding = useCalendarCollisionPadding()
    const unwrap = <T>(value: T): T => (value ? toRaw(value) : value)

    const onChange = (nextValue: DateTime | null) => {
      emit("update:value", nextValue)
      emit("change", nextValue)
    }

    const store: DateContextValue = {
      get value() {
        return unwrap(props.value) ?? null
      },
      get min() {
        return unwrap(props.min)
      },
      get max() {
        return unwrap(props.max)
      },
      get disabled() {
        return props.disabled
      },
      get captionLayout() {
        return props.captionLayout
      },
      get showTime() {
        return props.showTime
      },
      get yearRange() {
        return props.yearRange
      },
      onChange,
    }
    provide(DateContextKey, store)

    const handleClearClick = () => {
      onChange(null)
    }

    // The value text needs an id for aria-labelledby, also when `id` is not set
    const generatedId = useId()

    return () => {
      const { id, ariaLabelledby, align, placeholder } = props
      const value = store.value
      const { min, max } = store

      // min and max are inclusive, so equal bounds allow one date
      if (min && max && isAfter(min, max)) {
        throw new Error("DatePicker error: `min` date must not be after the `max` date")
      }

      const valueId = `${id ?? generatedId}-value`

      const timeFormat = props.showTime ? props.triggerTimeFormat : undefined
      const triggerDateFormat = props.triggerDateFormat ?? (props.showTime && !timeFormat ? "MM/dd/yy HH:mm" : "MM/dd/yy")
      // With a time format the date and the time are two parts, apart by a space; a phone row draws each as a capsule
      const text = !value
        ? placeholder
        : timeFormat
          ? h("span", { "data-date-parts": "" }, [
              h("span", { "data-date-part": "date" }, value.toFormat(triggerDateFormat)),
              " ",
              h("span", { "data-date-part": "time" }, value.toFormat(timeFormat)),
            ])
          : value.toFormat(triggerDateFormat)

      return h(Popover, null, {
        default: () => [
          h(PopoverTrigger, null, {
            default: () => [
              h(
                SelectControl,
                {
                  "id": id,
                  "aria-label": props.ariaLabel,
                  "aria-labelledby": ariaLabelledby ? `${ariaLabelledby} ${valueId}` : undefined,
                  "aria-describedby": props.ariaDescribedby,
                  "aria-invalid": props.ariaInvalid,
                  "class": props.triggerClassName,
                  "data-date-picker": "",
                  "selected": !!value,
                  "variant": props.variant,
                  "pill": props.pill,
                  "block": props.block,
                  "size": props.size,
                  "disabled": props.disabled,
                  "interactOnEnter": true,
                  "StartIcon": props.triggerShowIcon ? Calendar : undefined,
                  "dropdownIconType": props.dropdownIconType,
                  "onClearClick": props.clearable ? handleClearClick : undefined,
                },
                { default: () => [ariaLabelledby ? h("span", { id: valueId }, text) : text] },
              ),
            ],
          }),
          h(
            PopoverContent,
            {
              class: s.Popover,
              minWidth: 230,
              collisionPadding: wide.value ? 20 : calendarCollisionPadding.value,
              side: wide.value || props.side === "top" ? props.side : "bottom",
              sideOffset: props.sideOffset,
              align,
              alignOffset: props.alignOffset ?? (align === "center" ? 0 : -5),
            },
            { default: () => [h(DateCalendar)] },
          ),
        ],
      })
    }
  },
})

type DatePickerOwnProps = InstanceType<typeof DatePickerComponent>["$props"]

export type DatePickerProps = DatePickerOwnProps

/**
 * A date (and optionally time) picker: a SelectControl trigger opening a
 * calendar in a popover. Bind the date (a luxon `DateTime`) with
 * `v-model:value`.
 */
export const DatePicker = DatePickerComponent
