import {
  maskitoDateOptionsGenerator,
  maskitoDateTimeOptionsGenerator,
  maskitoParseDate,
  maskitoParseDateTime,
  maskitoStringifyDate,
  maskitoStringifyDateTime,
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
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  withDirectives,
  type PropType,
} from "vue"
import { Input, type InputProps } from "../Input/index.js"

// Vue port of packages/ui/src/components/DateInput/DateInput.tsx: an Input
// with a Maskito date (or date + time) mask, same options as React.
//
// - `value` + `update:value` (`v-model:value`) and `change` mirror React's
//   `value` + `onChange`: both fire with a Luxon DateTime once a complete
//   valid date is typed, and with `null` when the field is emptied or cleared.
//   What is typed in between stays in the field without an event.
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
    "update:value": (_value: DateTime | null) => true,
    "change": (_value: DateTime | null) => true,
  },
  setup(props, { attrs, slots, emit, expose }) {
    const hasTime = computed(() => !!props.timeMode)
    // React memoizes on the dates' milliseconds, not on the DateTime objects
    const minMs = computed(() => props.min?.toMillis())
    const maxMs = computed(() => props.max?.toMillis())

    const dateParams = computed<MaskitoDateParams>(() => ({
      mode: props.mode,
      separator: props.separator,
      ...(minMs.value !== undefined ? { min: new Date(minMs.value) } : undefined),
      ...(maxMs.value !== undefined ? { max: new Date(maxMs.value) } : undefined),
    }))

    const dateTimeParams = computed<MaskitoDateTimeParams>(() => ({
      dateMode: props.mode,
      dateSeparator: props.separator,
      timeMode: props.timeMode ?? "HH:MM",
      dateTimeSeparator: props.dateTimeSeparator,
      ...(props.timeStep ? { timeStep: props.timeStep } : undefined),
      ...(minMs.value !== undefined ? { min: new Date(minMs.value) } : undefined),
      ...(maxMs.value !== undefined ? { max: new Date(maxMs.value) } : undefined),
    }))

    // Like React's memo, new options whenever either set of params changes
    const maskOptions = computed(() => {
      const date = dateParams.value
      const dateTime = dateTimeParams.value
      return hasTime.value ? maskitoDateTimeOptionsGenerator(dateTime) : maskitoDateOptionsGenerator(date)
    })

    const inputValue = ref("")

    // React formats the value in an effect: the first render (and the server
    // markup) has an empty field, without the clear button
    const syncInputValue = () => {
      const { value } = props
      if (!value) {
        inputValue.value = ""
        return
      }
      inputValue.value = hasTime.value
        ? maskitoStringifyDateTime(value.toJSDate(), dateTimeParams.value)
        : maskitoStringifyDate(value.toJSDate(), dateParams.value)
    }
    const valueMsKey = computed(() => props.value?.toMillis() ?? null)
    watch([valueMsKey, hasTime, dateParams, dateTimeParams], syncInputValue)
    onMounted(syncInputValue)

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

      const parsed = hasTime.value
        ? maskitoParseDateTime(str, dateTimeParams.value)
        : maskitoParseDate(str, dateParams.value)

      if (parsed) {
        change(DateTime.fromJSDate(parsed))
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
      const { onInput: _onInput, onClear: _onClear, ...inputProps } = attrs
      return withDirectives(
        h(
          Input,
          {
            ...inputProps,
            "ref": inputComponent,
            "value": inputValue.value,
            "onUpdate:value": (str: string) => {
              inputValue.value = str
            },
            "placeholder": props.placeholder ?? defaultPlaceholder.value,
            "onClear": props.clearable ? handleClear : undefined,
          },
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
