import clsx, { type ClassValue } from "clsx"
import { defineComponent, h, mergeProps, nextTick, onMounted, ref, useId, watch, withDirectives, type ButtonHTMLAttributes, type InputHTMLAttributes, type PropType } from "vue"
import type { ControlSize, SemanticColor, Sizes, Variants } from "@plexui/styles/types"
import { X } from "../Icon/index.js"
import { vDefaultValue } from "../../lib/defaultValue.js"
import { hasContent } from "../../lib/slotContent.js"
import s from "@plexui/styles/components/Input/Input.module.css"

// Vue port of packages/ui/src/components/Input/Input.tsx.
// - `class` goes to the container; every other attribute and native listener
//   (`@input`, `@change`, `@focus`, `style`, `placeholder`, ...) goes to the
//   <input>, as React spreads its rest props there.
// - `value` + `update:value` support `v-model:value`; `default-value` sets the
//   initial value of an uncontrolled input through `vDefaultValue` (server
//   markup, hydration and later changes as in React), so re-renders never
//   reset what the user typed.
// - `startAdornment` / `endAdornment` are slots. `onClear` stays a function
//   prop (`@clear` in templates) because its presence adds the clear button.
// - `autoComplete` reaches the <input> as `autocomplete`, and `invalid` also
//   sets `aria-invalid` there unless the caller passes its own, as in React.

const InputComponent = defineComponent({
  name: "Input",
  inheritAttrs: false,
  props: {
    /** Visual style of the input. @default "outline" */
    variant: { type: String as PropType<Variants<"outline" | "soft" | "ghost">>, default: "outline" },
    /** Controls the size of the input: `3xs` 22px up to `3xl` 48px. @default "md" */
    size: { type: String as PropType<ControlSize>, default: "md" },
    /** Controls gutter on the edges of the input, defaults to value from `size`. */
    gutterSize: String as PropType<Sizes<"2xs" | "xs" | "sm" | "md" | "lg" | "xl">>,
    /** Disables the input visually and from interactions. @default false */
    disabled: { type: Boolean, default: false },
    /** Makes the input read-only. @default false */
    readOnly: { type: Boolean, default: false },
    /** Native spelling of `readOnly` (`<Input readonly />`). @default false */
    readonly: { type: Boolean, default: false },
    /** Mark the input as invalid. @default false */
    invalid: { type: Boolean, default: false },
    /**
     * Allow autofill extensions to appear in the input.
     * @default true when `type="password"` or `name` is set, otherwise false
     */
    allowAutofillExtensions: { type: Boolean, default: undefined },
    /** Select all contents of the input when mounted, and whenever it turns true. @default false */
    autoSelect: { type: Boolean, default: undefined },
    /** Shows the clear button while the input has a value; called when it is clicked. */
    onClear: Function as PropType<(event: MouseEvent) => void>,
    /** Fully rounded pill shape. @default false */
    pill: { type: Boolean, default: undefined },
    /** Applies a negative margin using the current gutter to optically align the input with surrounding content. */
    opticallyAlign: String as PropType<"start" | "end">,
    id: String,
    name: String,
    /** @default "text" */
    type: { type: String, default: "text" },
    /** Controlled value. Bind `v-model:value` to keep it in sync. */
    value: { type: [String, Number] as PropType<string | number>, default: undefined },
    /** Initial value when uncontrolled. */
    defaultValue: { type: [String, Number] as PropType<string | number>, default: undefined },
    /** Native `autocomplete` of the <input>. */
    autoComplete: String,
  },
  emits: {
    "update:value": (_value: string) => true,
    "autofill": () => true,
  },
  setup(props, { attrs, slots, emit, expose }) {
    const inputRef = ref<HTMLInputElement | null>(null)
    // Prevent 1Password from appearing: 1Password won't display if it thinks this field is for searching
    // Allow user to override this for connecting to labels.
    const onePasswordPreventionId = `search-ui-input-${useId()}`
    const focused = ref(false)

    // Redirect clicks on the container and adornments
    const handleMouseDown = (evt: MouseEvent) => {
      const input = inputRef.value
      // Bail out if the target is not an element or the input is not found
      if (!evt.target || !(evt.target instanceof Element) || !input) {
        return
      }
      // Bail out if the target is inside the input
      if (input.contains(evt.target)) {
        return
      }
      // Bail out if the target is a button
      if (evt.target.closest("button, [type='button'], [role='button'], [role='menuitem']")) {
        return
      }

      evt.preventDefault()
      // If the input is not focused, focus it
      if (document.activeElement !== input) {
        input.focus()
      }

      const { left, top } = input.getBoundingClientRect()
      const { clientX, clientY } = evt
      // "Before" the input: top/left
      const isBefore = clientY < top || clientX < left
      // email, number and other types without the selection API throw on setSelectionRange
      const hasSelection = input.selectionStart !== null

      // If this is the first click, clear the selection.
      if (evt.detail === 1) {
        if (!hasSelection) return
        if (isBefore) {
          input.setSelectionRange(0, 0)
        } else {
          const length = input.value.length
          input.setSelectionRange(length, length)
        }
      }
      // If this is the second click, select the first or last word
      else if (evt.detail === 2) {
        if (!hasSelection) return
        // Split the input value into words and non-word characters
        const words = input.value.match(/\w+|[^\w\s]/g) || []
        const selectedWord = isBefore ? words.at(0) : words.at(-1)
        if (selectedWord) {
          const wordIndex = isBefore ? input.value.indexOf(selectedWord) : input.value.lastIndexOf(selectedWord)
          input.setSelectionRange(wordIndex, wordIndex + selectedWord.length)
        }
      }
      // If this is the third click or greater, select the entire input
      else {
        input.select()
      }
    }

    const selectIfAuto = () => {
      if (props.autoSelect) {
        inputRef.value?.select()
      }
    }
    onMounted(selectIfAuto)
    watch(() => props.autoSelect, selectIfAuto, { flush: "post" })

    // The clear button unmounts once the value is gone, so keep focus in the input
    const handleClear = (evt: MouseEvent) => {
      inputRef.value?.focus()
      props.onClear?.(evt)
    }

    const handleAnimationStart = (evt: AnimationEvent) => {
      if (evt.animationName === "native-autofill-in") {
        emit("autofill")
      }
    }

    const handleInput = (evt: Event) => {
      const target = evt.currentTarget as HTMLInputElement
      emit("update:value", target.value)
      // Like a React controlled input, a `value` the parent does not update
      // is put back (Vue only re-applies `value` when this component renders)
      void nextTick(() => {
        if (props.value === undefined) return
        const value = String(props.value)
        if (target.value !== value) target.value = value
      })
    }

    expose({ focus: () => inputRef.value?.focus(), input: inputRef })

    return () => {
      const { class: className, ...restAttrs } = attrs
      const { value, defaultValue, disabled } = props
      const readOnly = props.readOnly || props.readonly
      // Default to `true` when type="password" or presence of `name`
      const allowAutofillExtensions = props.allowAutofillExtensions ?? (props.type === "password" || !!props.name)
      const startAdornment = slots.startAdornment?.()
      const endAdornment = slots.endAdornment?.()
      const hasStartAdornment = hasContent(startAdornment)
      const hasEndAdornment = hasContent(endAdornment)

      // Determine if clear button should be shown
      const hasValue = value !== undefined ? !!value : !!defaultValue
      const showClearButton = !!props.onClear && hasValue && !disabled && !readOnly

      return h(
        "div",
        {
          "class": clsx(s.Container, className as ClassValue),
          "data-slot": "input",
          "data-variant": props.variant,
          "data-size": props.size,
          "data-gutter-size": props.gutterSize,
          "data-focused": focused.value,
          "data-disabled": disabled ? "" : undefined,
          "data-readonly": readOnly ? "" : undefined,
          "data-invalid": props.invalid ? "" : undefined,
          "data-pill": props.pill ? "" : undefined,
          "data-optically-align": props.opticallyAlign,
          "data-has-start-adornment": hasStartAdornment ? "" : undefined,
          "data-has-end-adornment": hasEndAdornment || showClearButton ? "" : undefined,
          "onMousedown": handleMouseDown,
        },
        [
          hasStartAdornment ? startAdornment : null,
          withDirectives(
            h(
              "input",
              mergeProps(restAttrs, {
                "ref": inputRef,
                "id": props.id || (allowAutofillExtensions ? undefined : onePasswordPreventionId),
                "class": s.Input,
                "type": props.type,
                // Only when set, so a native `autocomplete` attribute still applies
                ...(props.autoComplete !== undefined ? { autocomplete: props.autoComplete } : {}),
                // Expose the visual invalid state to assistive tech; an explicit aria-invalid wins
                "aria-invalid": restAttrs["aria-invalid"] ?? (props.invalid || undefined),
                "name": props.name,
                // Controlled: the `value` property follows the prop. Uncontrolled:
                // `vDefaultValue` below sets the initial value, as in React.
                ...(value !== undefined ? { value } : {}),
                "readonly": readOnly,
                "disabled": disabled,
                "onInput": handleInput,
                "onFocus": () => {
                  focused.value = true
                },
                "onBlur": () => {
                  focused.value = false
                },
                "onAnimationstart": handleAnimationStart,
                // Prevent LastPass and 1Password from appearing
                "data-lpignore": allowAutofillExtensions ? undefined : true,
                "data-1p-ignore": allowAutofillExtensions ? undefined : true,
              }),
            ),
            [[vDefaultValue, value === undefined ? defaultValue : undefined]],
          ),
          showClearButton
            ? h("button", { "type": "button", "aria-label": "Clear input", "class": s.Clear, "onClick": handleClear }, [
                h(X),
              ])
            : null,
          hasEndAdornment ? endAdornment : null,
        ],
      )
    }
  },
})

type InputOwnProps = InstanceType<typeof InputComponent>["$props"]

/** Input props plus the native <input> attributes that fall through to it, as in React. */
export type InputProps = InputOwnProps & Omit<InputHTMLAttributes, keyof InputOwnProps>

/** Text input with adornment slots, a clear button and autofill-extension control. */
export const Input = InputComponent as typeof InputComponent & { new (): { $props: InputProps } }

/**
 * Canonical inline action button for Input adornments (React
 * `Input.AdornmentButton`): mic toggle, visibility toggle, copy, ... It sizes
 * itself off the parent Input so it matches the built-in clear button.
 */
const InputAdornmentButtonComponent = defineComponent({
  name: "InputAdornmentButton",
  props: {
    /** @default "button" */
    type: { type: String as PropType<"button" | "submit" | "reset">, default: "button" },
    /**
     * Semantic color tint for the pressed (`aria-pressed="true"`) state, the
     * same palette Button accepts. Unset keeps the neutral primary-soft tint.
     */
    color: String as PropType<SemanticColor>,
  },
  setup(props, { slots }) {
    return () =>
      h("button", { "type": props.type, "class": s.AdornmentButton, "data-color": props.color }, slots.default?.())
  },
})

type InputAdornmentButtonOwnProps = InstanceType<typeof InputAdornmentButtonComponent>["$props"]

/** AdornmentButton props plus the native <button> attributes that fall through to it. */
export type InputAdornmentButtonProps = InputAdornmentButtonOwnProps &
  Omit<ButtonHTMLAttributes, keyof InputAdornmentButtonOwnProps>

export const InputAdornmentButton = InputAdornmentButtonComponent as typeof InputAdornmentButtonComponent & {
  new (): { $props: InputAdornmentButtonProps }
}
