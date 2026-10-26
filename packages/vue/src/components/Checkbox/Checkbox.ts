import { computed, defineComponent, h, onMounted, ref, useId, watch, type PropType } from "vue"
import { CheckboxIndicator as RekaCheckboxIndicator, CheckboxRoot as RekaCheckboxRoot } from "reka-ui"
import { bubbleInputStyle, useBubbleInputEffect, useCheckedTracker, useIsFormControl, useSize } from "./bubbleInput.js"
import { ControlButton, isListener, type Listeners } from "./ControlButton.js"
import s from "@plexui/styles/components/Checkbox/Checkbox.module.css"

// Vue port of packages/ui/src/components/Checkbox/Checkbox.tsx on Reka UI's
// Checkbox (state, role, aria-checked, Enter handling, indicator presence).
// Where Reka's DOM differs from Radix's, Radix's is rendered (see the parity
// tests): the button carries `value`, no `aria-disabled` and no `aria-label`
// copied from the label text; the hidden form input is Radix's BubbleInput;
// the consumer's handlers run before the toggle and can cancel it; a form
// reset restores the initial state.

export type CheckedState = boolean | "indeterminate"

const CheckboxComponent = defineComponent({
  name: "Checkbox",
  inheritAttrs: false,
  props: {
    /** The `id` of the checkbox. */
    id: String,
    /** The state of the checkbox when it is initially rendered. Use when you do not need to control its state. */
    defaultChecked: { type: [Boolean, String] as PropType<CheckedState>, default: undefined },
    /** The controlled state of the checkbox. Bind with `v-model:checked`. */
    checked: { type: [Boolean, String] as PropType<CheckedState>, default: undefined },
    /** Optional accessible label rendered to the right of the checkbox. The `label` slot takes rich content. */
    label: String,
    /** Optional second line below the label, linked via `aria-describedby`. The `description` slot takes rich content. */
    description: String,
    /** When `true`, prevents the user from interacting with the checkbox. */
    disabled: { type: Boolean, default: false },
    /** When `true`, indicates that the user must check the checkbox before the owning form can be submitted. */
    required: { type: Boolean, default: undefined },
    /** The name of the checkbox. Submitted with its owning form as part of a name/value pair. */
    name: String,
    /** The value given as data when submitted with a `name`. @default "on" */
    value: String,
    /** The orientation of the checkbox relative to the label. @default "left" */
    orientation: { type: String as PropType<"left" | "right">, default: "left" },
    /** Determines if the checkbox should be a fully rounded pill shape. @default false */
    pill: { type: Boolean, default: false },
    /** Visual style: `"solid"` fills the box when checked, `"ghost"` shows the checkmark only. @default "solid" */
    variant: { type: String as PropType<"solid" | "ghost">, default: "solid" },
  },
  emits: {
    /** The state of the checkbox changed */
    "update:checked": (_checked: CheckedState) => true,
    /** The checkbox gained focus */
    focus: (_event: FocusEvent) => true,
    /** The checkbox lost focus */
    blur: (_event: FocusEvent) => true,
  },
  setup(props, { attrs, slots, emit }) {
    const generatedId = useId()
    const container = ref<HTMLDivElement | null>(null)
    const control = ref<HTMLButtonElement | null>(null)
    const bubbleInput = ref<HTMLInputElement | null>(null)
    useCheckedTracker(bubbleInput)

    // Radix's useControllableState: controlled while `checked` is set, and
    // only actual changes are reported
    const internalChecked = ref<CheckedState>(props.defaultChecked ?? false)
    const checked = computed(() => props.checked ?? internalChecked.value)
    // The state a click asks for (Reka's toggle sets it), for the user click
    let requestedChecked = true
    const setChecked = (next: CheckedState) => {
      requestedChecked = next === true
      if (next === checked.value) return
      if (props.checked === undefined) internalChecked.value = next
      emit("update:checked", next)
    }

    const initialChecked = checked.value
    const isFormControl = useIsFormControl(control, () => attrs.form)
    const controlSize = useSize(() => (isFormControl.value ? control.value : null))
    const onUserClick = useBubbleInputEffect(bubbleInput, () => checked.value, true)

    onMounted(() => {
      control.value = (container.value?.firstElementChild as HTMLButtonElement | null) ?? null
    })

    // Like a native checkbox, a form reset restores the initial state
    watch(control, (button, _, onCleanup) => {
      const form = button?.form
      if (!form) return
      const reset = () => setChecked(initialChecked)
      form.addEventListener("reset", reset)
      onCleanup(() => form.removeEventListener("reset", reset))
    })

    // In a form, the button's click stops here; the input's click bubbles instead
    const afterClick = (event: Event) => {
      const hasConsumerStoppedPropagation = event.cancelBubble
      onUserClick({ requestedChecked, hasConsumerStoppedPropagation })
      if (bubbleInput.value && isFormControl.value && !hasConsumerStoppedPropagation) event.stopPropagation()
    }

    // Prevents text selection when double-clicking the label
    const handleLabelMouseDown = (event: MouseEvent) => {
      if (!event.defaultPrevented && event.detail > 1) event.preventDefault()
    }

    return () => {
      const { class: className, form, ...rest } = attrs
      const id = props.id ?? generatedId
      const hasLabel = Boolean(slots.label || props.label)
      // The description only renders next to a label; it comes before any ids
      // the caller (a Field, say) passes
      const descriptionId = hasLabel && (slots.description || props.description) ? `${id}-description` : undefined
      const indeterminateDefault = props.defaultChecked === "indeterminate" ? false : props.defaultChecked
      const inputDefaultChecked = indeterminateDefault ?? (initialChecked === "indeterminate" ? false : initialChecked)

      // The consumer's listeners compose with Reka's; other attributes land
      // on the button after the component's own, as `{...restProps}` does
      const listeners: Listeners = {
        onFocus: (event: FocusEvent) => emit("focus", event),
        onBlur: (event: FocusEvent) => emit("blur", event),
      }
      const buttonAttrs: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(rest)) {
        if (isListener(key)) listeners[key] = value
        else buttonAttrs[key] = value
      }
      const ariaDescribedBy =
        [descriptionId, buttonAttrs["aria-describedby"] as string | undefined].filter(Boolean).join(" ") || undefined
      const labelElement = hasLabel
        ? h("label", { for: id, class: s.Label, onMousedown: handleLabelMouseDown }, slots.label ? slots.label() : props.label)
        : null

      return h(
        "div",
        {
          "ref": container,
          "data-disabled": props.disabled ? "" : undefined,
          "data-has-label": hasLabel ? "" : undefined,
          "data-orientation": props.orientation,
          "class": [className, s.Container],
        },
        [
          h(
            RekaCheckboxRoot as never,
            {
              "asChild": true,
              "modelValue": checked.value,
              "onUpdate:modelValue": setChecked,
              "disabled": props.disabled,
              // Passed even when unset, so Reka renders no aria-required="false"
              "required": props.required,
            },
            {
              default: () =>
                h(
                  ControlButton,
                  {
                    "listeners": listeners,
                    "after": { onClick: afterClick },
                    "class": s.Checkbox,
                    "id": id,
                    "data-pill": props.pill ? "" : undefined,
                    "data-variant": props.variant,
                    "value": props.value ?? "on",
                    // Reka marks a disabled checkbox aria-disabled; Radix does not
                    "aria-disabled": undefined,
                    ...buttonAttrs,
                    "aria-describedby": ariaDescribedBy,
                  },
                  { default: () => h(RekaCheckboxIndicator, { class: s.CheckMark }) },
                ),
            },
          ),
          isFormControl.value
            ? h("input", {
                "ref": bubbleInput,
                "type": "checkbox",
                "aria-hidden": "true",
                "^checked": inputDefaultChecked ? "" : undefined,
                "required": props.required,
                "disabled": props.disabled,
                "name": props.name,
                "^value": props.value ?? "on",
                "form": form,
                "tabindex": -1,
                "style": bubbleInputStyle(controlSize.value, { transform: "translateX(-100%)" }),
              })
            : null,
          descriptionId
            ? h("div", { class: s.LabelGroup }, [
                labelElement,
                h(
                  "span",
                  { id: descriptionId, class: s.Description },
                  slots.description ? slots.description() : props.description,
                ),
              ])
            : labelElement,
        ],
      )
    }
  },
})

type CheckboxOwnProps = InstanceType<typeof CheckboxComponent>["$props"]

export type CheckboxProps = CheckboxOwnProps

export const Checkbox = CheckboxComponent
