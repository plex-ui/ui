import clsx from "clsx"
import { defineComponent, h, mergeProps, onMounted, ref, useId, watch, type PropType, type VNodeChild } from "vue"
import { Eye, EyeOff, X } from "../Icon/index.js"
import s from "@plexui/styles/components/FloatingLabelInput/FloatingLabelInput.module.css"

/**
 * Port of packages/ui/src/components/FloatingLabelInput/FloatingLabelInput.tsx.
 * Attributes other than `class` go to the <input> (dropped for `multiline`,
 * as in React). `value` + `update:value` support `v-model:value`.
 */
export const FloatingLabelInput = defineComponent({
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
    onMounted(autoResize)
    watch(() => props.multiline, autoResize, { flush: "post" })

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
      const length = input.value.length
      input.setSelectionRange(length, length)
    }

    const handleInput = (evt: Event) => {
      const target = evt.currentTarget as HTMLInputElement
      hasValue.value = !!target.value
      emit("update:value", target.value)
      autoResize()
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
      const description: VNodeChild = slots.description?.() ?? props.description
      const descriptionId = description ? `${inputId}-description` : undefined
      const errorId = props.errorMessage ? `${inputId}-error` : undefined
      const startAdornment = slots.startAdornment?.()
      const endAdornment = slots.endAdornment?.()
      const { class: className, "aria-describedby": ariaDescribedByAttr, ...restAttrs } = attrs

      const invalid = props.invalid ?? !!props.errorMessage
      // Determine if clear button should be shown
      const showClearButton = !!props.onClear && hasValue.value && !props.disabled && !props.readOnly
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
        "value": props.value ?? undefined,
        "disabled": props.disabled,
        "readonly": props.readOnly,
        "aria-invalid": invalid ? true : undefined,
        "aria-describedby": ariaDescribedBy,
        "onInput": handleInput,
        "onFocus": () => (focused.value = true),
        "onBlur": () => (focused.value = false),
      }
      // Uncontrolled: start from defaultValue, as React does
      const initialValue = props.value === undefined ? props.defaultValue : undefined

      return h("div", { class: clsx(s.Root, className as string | undefined) }, [
        h(
          "div",
          {
            "class": clsx(s.FieldFootprint, { [s.HasValue!]: hasValue.value || !!startAdornment }),
            "data-focused": focused.value ? "" : undefined,
            "data-has-value": hasValue.value ? "" : undefined,
            "data-invalid": invalid ? "" : undefined,
            "data-disabled": props.disabled ? "" : undefined,
            "data-readonly": props.readOnly ? "" : undefined,
            "data-multiline": props.multiline ? "" : undefined,
            "onMousedown": handleContainerMouseDown,
          },
          [
            h("label", { class: s.TypeableLabel, for: inputId }, [
              h("div", { class: s.LabelPositioner }, [h("div", { class: s.LabelText }, props.label)]),
            ]),
            startAdornment ? h("div", { class: s.StartAdornment }, startAdornment) : null,
            props.multiline
              ? h("textarea", {
                  ...controlProps,
                  rows: props.rows,
                  class: s.Textarea,
                  ...(initialValue !== undefined ? { value: initialValue } : {}),
                })
              : h(
                  "input",
                  mergeProps(restAttrs, {
                    ...controlProps,
                    "type": effectiveType,
                    "class": s.Input,
                    ...(initialValue !== undefined ? { value: initialValue } : {}),
                    "onAnimationstart": handleAnimationStart,
                    "data-lpignore": props.allowAutofillExtensions ? undefined : true,
                    "data-1p-ignore": props.allowAutofillExtensions ? undefined : true,
                  }),
                ),
            endAdornment ? h("div", { class: s.EndAdornment }, endAdornment) : null,
            showClearButton
              ? h("button", { "type": "button", "aria-label": "Clear input", "class": s.ClearButton, "onClick": props.onClear }, [h(X)])
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
