import {
  maskitoDateOptionsGenerator,
  maskitoDateTimeOptionsGenerator,
  type MaskitoDateMode,
  type MaskitoDateParams,
  type MaskitoDateTimeParams,
  type MaskitoTimeMode,
} from "@maskito/kit"
import { maskito as vMaskito } from "@maskito/vue"
import { DateTime } from "luxon"
import {
  computed,
  defineComponent,
  h,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  withDirectives,
  type PropType,
} from "vue"
import {
  dateInputValueKey,
  dateInputZone,
  formatDateInput,
  keepTypedValue,
  maskDate,
  parseDateInput,
  type DateInputFormat,
} from "../../lib/dateInputText.js"
import { Input, type InputProps } from "../Input/index.js"

// Vue port of packages/ui/src/components/DateInput/DateInput.tsx: an Input
// with a Maskito date (or date + time) mask, same options as React.
//
// - `value` + `update:value` (`v-model:value`) and `change` mirror React's
//   `value` + `onChange`: both fire with a Luxon DateTime once a complete
//   valid date is typed, and with `null` when the field is emptied or cleared.
//   What is typed in between stays in the field without an event until the
//   field loses focus, which shows the value again.
// - Every other attribute, listener and the `startAdornment` /
//   `endAdornment` slots go to Input, like React's `...inputProps`. React
//   sets `onInput` and `onClear` itself, so `@input` and `@clear` given to
//   DateInput are dropped, as there.
// - The mask is `@maskito/vue`'s directive on Input's container; its default
//   element predicate picks the <input> inside.
// - React reads the typed text in a listener React delegates to the root, so
//   it runs after Maskito's own `input` listeners on the <input>. The text is
//   read the same way here, from the event bubbling through Input's container.
//   Input's `update:value` only keeps its controlled value in step, so Input
//   does not put the previous text back.
// - The text is made from the value's own fields in its own zone and read
//   back into that zone (lib/dateInputText, shared with React), never through
//   the browser's local Date.

const DateInputComponent = defineComponent({
  name: "DateInput",
  inheritAttrs: false,
  props: {
    /** Selected date (Luxon DateTime). Bind `v-model:value`. */
    value: { type: [Object, null] as PropType<DateTime | null>, required: true as const },
    /** Date format: `dd/mm/yyyy`, `mm/dd/yyyy`, `yyyy/mm/dd`, ... @default "dd/mm/yyyy" */
    mode: { type: String as PropType<MaskitoDateMode>, default: "dd/mm/yyyy" },
    /** Character between date parts. @default "." */
    separator: { type: String, default: "." },
    /** Enables time input: `HH:MM`, `HH:MM:SS`, ... */
    timeMode: String as PropType<MaskitoTimeMode>,
    /** Separator between the date and time parts. @default ", " */
    dateTimeSeparator: { type: String, default: ", " },
    /** Arrow-key increment step for time segments. @default 0 */
    timeStep: { type: Number, default: 0 },
    /** Earliest allowed date */
    min: Object as PropType<DateTime>,
    /** Latest allowed date */
    max: Object as PropType<DateTime>,
    /** Shows the clear button while the input has a value. @default false */
    clearable: { type: Boolean, default: false },
    /** Generated from the format when not set */
    placeholder: String,
  },
  emits: {
    "update:value": (value: DateTime | null) => value === null || DateTime.isDateTime(value),
    "change": (value: DateTime | null) => value === null || DateTime.isDateTime(value),
  },
  setup(props, { attrs, slots, emit, expose }) {
    const hasTime = computed(() => !!props.timeMode)
    // React memoizes on the dates' milliseconds and the value's zone, not on the DateTime objects
    const zone = computed(() => dateInputZone(props.value))
    const minMs = computed(() => props.min?.toMillis())
    const maxMs = computed(() => props.max?.toMillis())

    const textFormat = computed<DateInputFormat>(() => ({
      mode: props.mode,
      separator: props.separator,
      timeMode: props.timeMode,
      dateTimeSeparator: props.dateTimeSeparator,
      min: minMs.value,
      max: maxMs.value,
      zone: zone.value,
    }))

    const dateParams = computed<MaskitoDateParams>(() => ({
      mode: props.mode,
      separator: props.separator,
      ...(minMs.value !== undefined ? { min: maskDate(minMs.value, zone.value) } : undefined),
      ...(maxMs.value !== undefined ? { max: maskDate(maxMs.value, zone.value) } : undefined),
    }))

    const dateTimeParams = computed<MaskitoDateTimeParams>(() => ({
      dateMode: props.mode,
      dateSeparator: props.separator,
      timeMode: props.timeMode ?? "HH:MM",
      dateTimeSeparator: props.dateTimeSeparator,
      ...(props.timeStep ? { timeStep: props.timeStep } : undefined),
      ...(minMs.value !== undefined ? { min: maskDate(minMs.value, zone.value) } : undefined),
      ...(maxMs.value !== undefined ? { max: maskDate(maxMs.value, zone.value) } : undefined),
    }))

    // Like React's memo, new options whenever either set of params changes. The mask shows a complete text as the
    // value reads it (lib/dateInputText)
    const maskOptions = computed(() => {
      const date = dateParams.value
      const dateTime = dateTimeParams.value
      const format = textFormat.value
      return keepTypedValue(
        hasTime.value ? maskitoDateTimeOptionsGenerator(dateTime) : maskitoDateOptionsGenerator(date),
        format,
      )
    })

    const format = (date: DateTime | null) => formatDateInput(date, textFormat.value)
    const parse = (str: string) => parseDateInput(str, textFormat.value)

    // The first render, on the server too, already shows the value. A new
    // value or format shows it again before the next render, as React does
    // during its render
    const inputValue = ref(format(props.value))
    const syncKey = computed(() =>
      [
        dateInputValueKey(props.value),
        props.mode,
        props.separator,
        props.timeMode,
        props.dateTimeSeparator,
        props.timeStep,
        minMs.value,
        maxMs.value,
      ].join("|"),
    )
    watch(syncKey, () => {
      inputValue.value = format(props.value)
    })

    const change = (value: DateTime | null) => {
      emit("update:value", value)
      emit("change", value)
    }

    const inputComponent = ref<{ $el: HTMLElement; input: HTMLInputElement | null; focus: () => void } | null>(null)

    const handleInput = (evt: Event) => {
      const input = inputComponent.value?.input
      if (!input || evt.target !== input) return
      const str = input.value
      inputValue.value = str

      if (!str) {
        change(null)
        return
      }

      const parsed = parse(str)

      if (parsed) {
        change(parsed)
      }
    }

    // Text that is not a complete date never reaches `change`, so leaving the
    // field shows the value again instead of a date the value does not hold
    const handleBlur = () => {
      if (inputValue.value && !parse(inputValue.value)) {
        inputValue.value = format(props.value)
      }
    }

    const handleClear = () => {
      inputValue.value = ""
      change(null)
    }

    let container: HTMLElement | null = null
    onMounted(() => {
      container = inputComponent.value?.$el ?? null
      container?.addEventListener("input", handleInput)
    })
    onBeforeUnmount(() => {
      container?.removeEventListener("input", handleInput)
      container = null
    })

    const defaultPlaceholder = computed(() => {
      const datePart = props.mode.replace(/\//g, props.separator).toUpperCase()
      if (!hasTime.value) return datePart
      return `${datePart}${props.dateTimeSeparator}${props.timeMode}`
    })

    expose({
      focus: () => inputComponent.value?.focus(),
      input: computed(() => inputComponent.value?.input ?? null),
    })

    return () => {
      const { inputMode, inputmode, ...inputProps } = attrs
      delete inputProps.onInput
      delete inputProps.onClear
      return withDirectives(
        h(
          Input,
          // mergeProps keeps the caller's `@blur` and runs it first, as React does
          mergeProps(inputProps, {
            // Accept both native and JSX spelling, without duplicate DOM attributes.
            "inputmode": inputMode ?? inputmode ?? (props.timeMode?.includes("AA") ? "text" : "numeric"),
            "ref": inputComponent,
            "value": inputValue.value,
            "onUpdate:value": (str: string) => {
              inputValue.value = str
            },
            "onBlur": handleBlur,
            "placeholder": props.placeholder ?? defaultPlaceholder.value,
            "onClear": props.clearable ? handleClear : undefined,
          }),
          {
            ...(slots.startAdornment ? { startAdornment: slots.startAdornment } : {}),
            ...(slots.endAdornment ? { endAdornment: slots.endAdornment } : {}),
          },
        ),
        [[vMaskito, maskOptions.value]],
      )
    }
  },
})

type DateInputOwnProps = InstanceType<typeof DateInputComponent>["$props"]

/** DateInput props plus the Input props and attributes that fall through to it. */
export type DateInputProps = DateInputOwnProps &
  Omit<InputProps, keyof DateInputOwnProps | "defaultValue" | "onUpdate:value" | "onInput" | "onClear" | "type">

/** Masked text input for typing dates (Luxon DateTime values). */
export const DateInput = DateInputComponent as typeof DateInputComponent & { new (): { $props: DateInputProps } }
