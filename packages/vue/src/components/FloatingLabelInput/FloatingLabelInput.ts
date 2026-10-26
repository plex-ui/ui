import clsx from "clsx"
import { defineComponent, h, mergeProps, nextTick, onMounted, ref, useId, watch, withDirectives, type InputHTMLAttributes, type PropType, type VNodeChild } from "vue"
import { Eye, EyeOff, X } from "../Icon/index.js"
import { vDefaultValue, vServerText } from "../../lib/defaultValue.js"
import { hasContent } from "../../lib/slotContent.js"
import s from "@plexui/styles/components/FloatingLabelInput/FloatingLabelInput.module.css"

// A fallthrough listener is a function or, when merged, an array of them
const callListeners = (listener: unknown, evt: Event) => {
  for (const fn of Array.isArray(listener) ? listener : [listener]) {
    if (typeof fn === "function") fn(evt)
  }
}

// Attributes that only mean something on <input>; everything else (required,
// maxlength, placeholder, key and clipboard listeners, aria-*, data-*) also
// applies to the multiline <textarea>, as in React
const INPUT_ONLY_ATTRS = new Set([
  "accept", "alt", "capture", "checked", "height", "list", "max", "min", "multiple",
  "pattern", "size", "src", "step", "width", "formaction", "formenctype",
  "formmethod", "formnovalidate", "formtarget",
])

const textareaAttrs = (attrs: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !INPUT_ONLY_ATTRS.has(key.toLowerCase())))

/**
 * Port of packages/ui/src/components/FloatingLabelInput/FloatingLabelInput.tsx.
 * Attributes other than `class` go to the <input>, or to the `multiline`
 * <textarea> except the input-only ones, as in React. `value` +
 * `update:value` support `v-model:value`.
 */
const FloatingLabelInputComponent = defineComponent({
  name: "FloatingLabelInput",
  inheritAttrs: false,
  props: {
    /** Label text for the floating label */
    label: { type: String, required: true },
    /** Error message to display below the input */
    errorMessage: String,
    /** Mark the input as invalid. @default false (or true if errorMessage is provided) */
    invalid: { type: Boolean, default: undefined },
    /** Disables the input visually and from interactions */
    disabled: { type: Boolean, default: false },
    /** Makes the input read-only */
    readOnly: { type: Boolean, default: false },
    /** Native spelling of `readOnly` (`<FloatingLabelInput readonly />`) */
    readonly: { type: Boolean, default: false },
    /** Shows the clear button; called when it is clicked */
    onClear: Function as PropType<() => void>,
    /** Allow autofill extensions to appear in the input */
    allowAutofillExtensions: { type: Boolean, default: false },
    /** Helper text below the input (or the `description` slot) */
    description: String,
    /** Built-in reveal toggle. @default true when type="password" and no end adornment */
    revealable: { type: Boolean, default: undefined },
    /** Render as a multi-line textarea instead of a single-line input */
    multiline: { type: Boolean, default: false },
    /** Number of visible text lines when `multiline` is true */
    rows: { type: Number, default: 2 },
    id: String,
    name: String,
    type: { type: String, default: "text" },
    value: { type: [String, Number] as PropType<string | number>, default: undefined },
    defaultValue: { type: [String, Number] as PropType<string | number>, default: undefined },
  },
  emits: {
    "update:value": (_value: string) => true,
    "autofill": () => true,
    "revealedChange": (_revealed: boolean) => true,
  },
  setup(props, { attrs, slots, emit, expose }) {
    const inputRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null)
    const generatedId = useId()
    const focused = ref(false)
    const hasValue = ref(!!(props.value !== undefined ? props.value : props.defaultValue))
    const revealed = ref(false)

    // Sync hasValue with controlled value prop
    watch(
      () => props.value,
      (value) => {
        if (value !== undefined) hasValue.value = !!value
      },
    )

    const autoResize = () => {
      const el = inputRef.value
      if (!props.multiline || !el) return
      el.style.height = "auto"
      el.style.height = `${el.scrollHeight}px`
    }
    // The multiline <textarea> gets its value imperatively, like React DOM: a
    // `value` prop would make Vue mirror it into a `value` attribute, which
    // React never renders (its text content carries the value instead)
    const syncTextareaValue = () => {
      const el = inputRef.value
      if (!props.multiline || !el || props.value === undefined) return
      const value = String(props.value)
      if (el.value !== value) el.value = value
    }
    onMounted(() => {
      // React's initTextarea: the initial text becomes the (dirty) value
      const el = inputRef.value
      if (props.multiline && el && el.textContent) el.value = el.textContent
      autoResize()
    })
    // Also resize when a controlled value or rows changes without a keystroke
    watch(
      [() => props.multiline, () => props.value, () => props.rows],
      () => {
        syncTextareaValue()
        autoResize()
      },
      { flush: "post" },
    )

    // Handle clicks on the container to focus the input
    const handleContainerMouseDown = (evt: MouseEvent) => {
      const input = inputRef.value
      if (!evt.target || !(evt.target instanceof Element) || !input) {
        return
      }
      if (input.contains(evt.target)) {
        return
      }
      if (evt.target.closest("button, [type='button'], [role='button']")) {
        return
      }
      evt.preventDefault()
      if (document.activeElement !== input) {
        input.focus()
      }
      // email, number and other types without the selection API throw on setSelectionRange
      if (input.selectionStart === null) return
      const length = input.value.length
      input.setSelectionRange(length, length)
    }

    // The clear button unmounts once the value is gone, so keep focus in the field
    const handleClear = (evt: MouseEvent) => {
      inputRef.value?.focus()
      ;(props.onClear as ((evt: MouseEvent) => void) | undefined)?.(evt)
    }

    const handleInput = (evt: Event) => {
      const target = evt.currentTarget as HTMLInputElement
      hasValue.value = !!target.value
      emit("update:value", target.value)
      autoResize()
      // Like a React controlled input, a `value` the parent does not update
      // is put back (Vue only re-applies `value` when this component renders)
      void nextTick(() => {
        if (props.value === undefined) return
        const value = String(props.value)
        if (target.value !== value) target.value = value
      })
    }

    const handleAnimationStart = (evt: AnimationEvent) => {
      // Detect browser autofill
      if (evt.animationName === "native-autofill-in") {
        hasValue.value = true
        emit("autofill")
      }
    }

    const handleRevealToggle = () => {
      revealed.value = !revealed.value
      emit("revealedChange", revealed.value)
    }

    expose({ focus: () => inputRef.value?.focus(), input: inputRef })

    return () => {
      const inputId = props.id || `floating-label-input-${generatedId}`
      // Slots that render nothing (a false v-if) count as absent, like a falsy ReactNode
      const descriptionSlot = slots.description?.()
      const description: VNodeChild = hasContent(descriptionSlot) ? descriptionSlot : props.description
      const descriptionId = description ? `${inputId}-description` : undefined
      const errorId = props.errorMessage ? `${inputId}-error` : undefined
      const startAdornmentSlot = slots.startAdornment?.()
      const startAdornment = hasContent(startAdornmentSlot) ? startAdornmentSlot : undefined
      const endAdornmentSlot = slots.endAdornment?.()
      const endAdornment = hasContent(endAdornmentSlot) ? endAdornmentSlot : undefined
      const readOnly = props.readOnly || props.readonly
      // Caller focus/blur listeners run from the shared handlers
      const {
        "class": className,
        "aria-describedby": ariaDescribedByAttr,
        "onFocus": onFocusAttr,
        "onBlur": onBlurAttr,
        ...restAttrs
      } = attrs

      const invalid = props.invalid ?? !!props.errorMessage
      // Determine if clear button should be shown
      const showClearButton = !!props.onClear && hasValue.value && !props.disabled && !readOnly
      // Built-in password reveal toggle
      const isPassword = props.type === "password"
      const revealable = props.revealable ?? (isPassword && !endAdornment)
      const showRevealButton = revealable && !props.disabled
      const effectiveType = isPassword && revealed.value ? "text" : props.type
      // Merge aria-describedby with error id
      const ariaDescribedBy = [ariaDescribedByAttr, errorId, descriptionId].filter(Boolean).join(" ") || undefined

      const controlProps = {
        "ref": inputRef,
        "id": inputId,
        "name": props.name,
        // Vue re-applies a present `value` key on every render, so an
        // uncontrolled field must not carry one (it would reset typed text)
        ...(props.value !== undefined ? { value: props.value } : {}),
        "disabled": props.disabled,
        "readonly": readOnly,
        // An explicit aria-invalid (e.g. from Field) wins over the computed state
        "aria-invalid": restAttrs["aria-invalid"] ?? (invalid ? true : undefined),
        "aria-describedby": ariaDescribedBy,
        "onInput": handleInput,
        "onFocus": (evt: FocusEvent) => {
          focused.value = true
          callListeners(onFocusAttr, evt)
        },
        "onBlur": (evt: FocusEvent) => {
          focused.value = false
          callListeners(onBlurAttr, evt)
        },
      }
      // Uncontrolled: `vDefaultValue` sets the initial value (server markup,
      // hydration and later changes as in React)
      const initialValue = props.value === undefined ? props.defaultValue : undefined
      // The textarea's text content follows the controlled value, else
      // `default-value`, as React keeps a textarea's defaultValue
      const { value: _value, ...textareaControlProps } = controlProps as typeof controlProps & { value?: unknown }
      const textContent = String(props.value ?? props.defaultValue ?? "")

      return h("div", { class: clsx(s.Root, className as string | undefined) }, [
        h(
          "div",
          {
            "class": clsx(s.FieldFootprint, { [s.HasValue!]: hasValue.value || !!startAdornment }),
            "data-focused": focused.value ? "" : undefined,
            "data-has-value": hasValue.value ? "" : undefined,
            "data-invalid": invalid ? "" : undefined,
            "data-disabled": props.disabled ? "" : undefined,
            "data-readonly": readOnly ? "" : undefined,
            "data-multiline": props.multiline ? "" : undefined,
            "onMousedown": handleContainerMouseDown,
          },
          [
            h("label", { class: s.TypeableLabel, for: inputId }, [
              h("div", { class: s.LabelPositioner }, [h("div", { class: s.LabelText }, props.label)]),
            ]),
            startAdornment ? h("div", { class: s.StartAdornment }, startAdornment) : null,
            props.multiline
              ? withDirectives(
                  h(
                    "textarea",
                    mergeProps(textareaAttrs(restAttrs), {
                      ...textareaControlProps,
                      rows: props.rows,
                      class: s.Textarea,
                      textContent,
                    }),
                  ),
                  [[vServerText, textContent]],
                )
              : withDirectives(
                  h(
                    "input",
                    mergeProps(restAttrs, {
                      ...controlProps,
                      "type": effectiveType,
                      "class": s.Input,
                      "onAnimationstart": handleAnimationStart,
                      "data-lpignore": props.allowAutofillExtensions ? undefined : true,
                      "data-1p-ignore": props.allowAutofillExtensions ? undefined : true,
                    }),
                  ),
                  [[vDefaultValue, initialValue]],
                ),
            endAdornment ? h("div", { class: s.EndAdornment }, endAdornment) : null,
            showClearButton
              ? h("button", { "type": "button", "aria-label": "Clear input", "class": s.ClearButton, "onClick": handleClear }, [h(X)])
              : null,
            showRevealButton
              ? h(
                  "button",
                  { "type": "button", "aria-label": revealed.value ? "Hide" : "Show", "class": s.RevealButton, "onClick": handleRevealToggle },
                  [revealed.value ? h(EyeOff) : h(Eye)],
                )
              : null,
          ],
        ),
        props.errorMessage ? h("div", { id: errorId, class: s.ErrorMessage, role: "alert" }, props.errorMessage) : null,
        description ? h("div", { id: descriptionId, class: s.Description }, description) : null,
      ])
    }
  },
})

type FloatingLabelInputOwnProps = InstanceType<typeof FloatingLabelInputComponent>["$props"]

/** FloatingLabelInput props plus the native <input> attributes that fall through to it, as in React. */
export type FloatingLabelInputProps = FloatingLabelInputOwnProps &
  Omit<InputHTMLAttributes, keyof FloatingLabelInputOwnProps>

/** Text input whose label floats above the value, with optional reveal toggle and multiline mode. */
export const FloatingLabelInput = FloatingLabelInputComponent as typeof FloatingLabelInputComponent & {
  new (): { $props: FloatingLabelInputProps }
}
