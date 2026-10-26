import {
  computed,
  defineComponent,
  h,
  nextTick,
  onMounted,
  ref,
  useId,
  watch,
  type PropType,
  type TextareaHTMLAttributes,
} from "vue"
import type { ControlSize, Sizes, Variants } from "@plexui/styles/types"
import { toCssVariables } from "../../lib/helpers.js"
import s from "@plexui/styles/components/Textarea/Textarea.module.css"

// Vue port of packages/ui/src/components/Textarea/Textarea.tsx. Props,
// defaults and rendered DOM match React 1:1 (checked by the parity tests).
//
// - `class` goes to the container; every other attribute and listener
//   (`style`, `placeholder`, `@input`, `@change`, ...) goes to the <textarea>,
//   like React's `className` and `...restProps`.
// - Value: `value` + `update:value` mirror React's `value` prop
//   (`v-model:value`) and fire on every input. Uncontrolled use takes
//   `default-value`. Like a React controlled textarea, a `value` the parent
//   does not update after input is put back.
// - As in React, the textarea's text content (its `defaultValue`) follows
//   the controlled value, or `default-value` when uncontrolled.

type ListenerValue = ((event: Event) => void) | Array<(event: Event) => void> | undefined

const invoke = (handler: unknown, event: Event) => {
  for (const fn of ([] as unknown[]).concat(handler ?? [])) {
    if (typeof fn === "function") fn(event)
  }
}

const TextareaComponent = defineComponent({
  name: "Textarea",
  inheritAttrs: false,
  props: {
    /** Visual style of the textarea. @default "outline" */
    variant: { type: String as PropType<Variants<"outline" | "soft">>, default: "outline" },
    /** Controls the size of the textarea. @default "md" */
    size: { type: String as PropType<ControlSize>, default: "md" },
    /** Controls gutter on the edges of the textarea, defaults to value from `size`. */
    gutterSize: String as PropType<Sizes<"2xs" | "xs" | "sm" | "md" | "lg" | "xl">>,
    /** Disables the textarea visually and from interactions. @default false */
    disabled: { type: Boolean, default: false },
    /** Makes the textarea read-only. @default false */
    readOnly: { type: Boolean, default: false },
    /** Native spelling of `readOnly` (`<Textarea readonly />`). @default false */
    readonly: { type: Boolean, default: false },
    /** Mark the textarea as invalid. @default false */
    invalid: { type: Boolean, default: false },
    /** Allow autofill extensions to appear in the textarea. @default `true` when `name` is set, else `false` */
    allowAutofillExtensions: { type: Boolean, default: undefined },
    /** Select all contents of the textarea when mounted (and whenever it turns `true`). @default false */
    autoSelect: { type: Boolean, default: undefined },
    /** Default number of rows to display. @default 3 */
    rows: { type: Number, default: 3 },
    /** Automatically adjust the height of the textarea based on its contents. @default false */
    autoResize: { type: Boolean, default: undefined },
    /** Maximum number of rows that can be displayed when autoResize is enabled. @default Math.max(rows, 10) */
    maxRows: Number,
    id: String,
    name: String,
    /** Controlled value (`v-model:value`) */
    value: { type: [String, Number] as PropType<string | number>, default: undefined },
    /** Initial value when uncontrolled */
    defaultValue: { type: [String, Number] as PropType<string | number>, default: undefined },
    // Accepted and dropped, as in React (which destructures and never renders it)
    autoComplete: String,
  },
  emits: {
    "update:value": (_value: string) => true,
    /** Fired when the browser autofills the textarea */
    "autofill": () => true,
  },
  setup(props, { attrs, emit, expose }) {
    const textAreaRef = ref<HTMLTextAreaElement | null>(null)
    // Prevent 1Password from appearing: 1Password won't display if it thinks this field is for searching
    // Allow user to override this for connecting to labels.
    const onePasswordPreventionId = `search-ui-input-${useId()}`
    const focused = ref(false)

    const computedMaxRows = computed(() =>
      props.autoResize ? Math.max(props.maxRows ?? 10, props.rows) : props.rows,
    )
    const controlledValue = () => props.value

    const runAutoSelect = () => {
      if (props.autoSelect) {
        textAreaRef.value?.select()
      }
    }

    const autosizeTextarea = () => {
      const textarea = textAreaRef.value
      if (!props.autoResize || !textarea || computedMaxRows.value === undefined) return
      textarea.style.height = "0px"
      const scrollHeight = textarea.scrollHeight
      textarea.style.height = scrollHeight + "px"
    }

    // The textarea's value is set imperatively, like React DOM does: a `value`
    // prop would make Vue mirror it into a `value` attribute, which React
    // never renders. Puts the controlled value back when it differs.
    const syncValue = () => {
      const textarea = textAreaRef.value
      const value = controlledValue()
      if (!textarea || value == null) return
      const nextValue = String(value)
      if (textarea.value !== nextValue) textarea.value = nextValue
    }

    // React runs these effects after mount and when their dependencies change
    onMounted(() => {
      const textarea = textAreaRef.value
      // React's initTextarea: the initial text becomes the (dirty) value
      const initialValue = textarea?.textContent ?? ""
      if (textarea && initialValue !== "") textarea.value = initialValue
      runAutoSelect()
      autosizeTextarea()
    })
    // React DOM writes a new value while committing, before any effect runs,
    // so the selection covers the value that arrives with `autoSelect`
    watch(
      () => props.autoSelect,
      () => {
        syncValue()
        runAutoSelect()
      },
      { flush: "post" },
    )
    // Resize if value changes outside of user input - e.g. form reset
    watch(
      () => [controlledValue(), props.rows, props.autoResize, computedMaxRows.value],
      () => {
        syncValue()
        autosizeTextarea()
      },
      { flush: "post" },
    )

    const handleInput = (evt: Event) => {
      const next = (evt.target as HTMLTextAreaElement).value
      emit("update:value", next)
      autosizeTextarea()
      // A controlled value the parent did not update wins over the typed text,
      // as in React
      void nextTick(syncValue)
    }

    expose({
      /** The rendered <textarea> element */
      textarea: textAreaRef,
      focus: () => textAreaRef.value?.focus(),
    })

    return () => {
      const {
        class: className,
        // React drops `autoComplete`; drop the native spelling too
        autocomplete: _autocomplete,
        onInput,
        onFocus,
        onBlur,
        onAnimationstart,
        ...restAttrs
      } = attrs as Record<string, unknown>

      const { variant, size, gutterSize, disabled, invalid, rows } = props
      const readOnly = props.readOnly || props.readonly
      // Default to `true` when presence of `name`
      const allowAutofillExtensions = props.allowAutofillExtensions ?? !!props.name
      const value = controlledValue()
      // React keeps the textarea's defaultValue (its text content) in sync with
      // the controlled value, else with `defaultValue`
      const textContent = String(value ?? props.defaultValue ?? "")

      return h(
        "div",
        {
          "class": [s.Container, className],
          "data-variant": variant,
          "data-size": size,
          "data-gutter-size": gutterSize,
          "data-focused": String(focused.value),
          "data-disabled": disabled ? "" : undefined,
          "data-readonly": readOnly ? "" : undefined,
          "data-invalid": invalid ? "" : undefined,
          "style": toCssVariables({
            "textarea-min-rows": `${rows}`,
            "textarea-max-rows": `${computedMaxRows.value}`,
          }),
        },
        [
          h(
            "textarea",
            {
              ...restAttrs,
              "onInput": (evt: Event) => {
                invoke(onInput as ListenerValue, evt)
                handleInput(evt)
              },
              "ref": textAreaRef,
              "id": props.id || (allowAutofillExtensions ? undefined : onePasswordPreventionId),
              "class": s.Textarea,
              "name": props.name,
              "readonly": readOnly,
              "disabled": disabled,
              "rows": rows,
              "onFocus": (evt: Event) => {
                focused.value = true
                invoke(onFocus as ListenerValue, evt)
              },
              "onBlur": (evt: Event) => {
                focused.value = false
                invoke(onBlur as ListenerValue, evt)
              },
              "onAnimationstart": (evt: AnimationEvent) => {
                invoke(onAnimationstart as ListenerValue, evt)
                if (evt.animationName === "native-autofill-in") {
                  emit("autofill")
                }
              },
              // Prevent LastPass and 1Password from appearing
              "data-lpignore": allowAutofillExtensions ? undefined : true,
              "data-1p-ignore": allowAutofillExtensions ? undefined : true,
            },
            textContent,
          ),
        ],
      )
    }
  },
})

type TextareaOwnProps = InstanceType<typeof TextareaComponent>["$props"]

/** Textarea props plus the native <textarea> attributes that fall through to it, as in React. */
export type TextareaProps = TextareaOwnProps & Omit<TextareaHTMLAttributes, keyof TextareaOwnProps | "readonly">

export const Textarea = TextareaComponent as typeof TextareaComponent & { new (): { $props: TextareaProps } }
