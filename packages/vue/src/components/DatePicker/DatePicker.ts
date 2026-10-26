import type { DateTime } from "luxon"
import { defineComponent, h, provide, toRaw, useId, type PropType } from "vue"
import type { ControlSize } from "@plexui/styles/types"
import { isAfter } from "../../lib/dateUtils.js"
import { Calendar } from "../Icon/index.js"
import { Popover, PopoverContent, PopoverTrigger, type PopoverAlign, type PopoverSide } from "../Popover/index.js"
import { SelectControl, type DropdownIconType } from "../SelectControl/index.js"
import { DateCalendar } from "./Calendar.js"
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
    /** Format of dates displayed in the trigger. @default "MM/dd/yy" ("MM/dd/yy HH:mm" with `showTime`) */
    triggerDateFormat: String,
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
    "update:value": (_nextValue: DateTime | null) => true,
    "change": (_nextValue: DateTime | null) => true,
  },
  setup(props, { emit }) {
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

      const triggerDateFormat = props.triggerDateFormat ?? (props.showTime ? "MM/dd/yy HH:mm" : "MM/dd/yy")
      const text = value?.toFormat(triggerDateFormat) ?? placeholder

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
                  "selected": !!value,
                  "variant": props.variant,
                  "pill": props.pill,
                  "block": props.block,
                  "size": props.size,
                  "disabled": props.disabled,
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
              minWidth: 230,
              side: props.side,
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
