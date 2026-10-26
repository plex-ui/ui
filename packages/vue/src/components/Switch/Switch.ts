import { computed, defineComponent, h, onMounted, ref, useId, watch, type PropType } from "vue"
import { SwitchRoot as RekaSwitchRoot, SwitchThumb as RekaSwitchThumb } from "reka-ui"
import { bubbleInputStyle, useBubbleInputEffect, useCheckedTracker, useIsFormControl, useSize } from "../Checkbox/bubbleInput.js"
import { ControlButton, isListener, type Listeners } from "../Checkbox/ControlButton.js"
import s from "@plexui/styles/components/Switch/Switch.module.css"

// Vue port of packages/ui/src/components/Switch/Switch.tsx on Reka UI's
// Switch (state, role, aria-checked, thumb). Where Reka's DOM differs from
// Radix's, Radix's is rendered (see the parity tests): no `aria-label`
// copied from the label text, the hidden form input is Radix's BubbleInput,
// the consumer's handlers run before the toggle and can cancel it, Enter
// is left to the browser (a native click), as Radix does, instead of Reka's
// own Enter toggle, and a form reset restores the initial state.

const SwitchComponent = defineComponent({
  name: "Switch",
  inheritAttrs: false,
  props: {
    /** The `id` of the switch. */
    id: String,
    /** The state of the switch when it is initially rendered. Use when you do not need to control its state. */
    defaultChecked: { type: Boolean, default: undefined },
    /** The controlled state of the switch. Bind with `v-model:checked`. */
    checked: { type: Boolean, default: undefined },
    /** Optional accessible label rendered next to the switch. The `label` slot takes rich content. */
    label: String,
    /** Optional description rendered below the label, linked via `aria-describedby`. The `description` slot takes rich content. */
    description: String,
    /** When `true`, prevents the user from interacting with the switch. */
    disabled: { type: Boolean, default: false },
    /** When `true`, indicates that the user must check the switch before the owning form can be submitted. */
    required: { type: Boolean, default: undefined },
    /** The name of the switch. Submitted with its owning form as part of a name/value pair. */
    name: String,
    /** The value given as data when submitted with a `name`. @default "on" */
    value: String,
    /** The position of the label relative to the switch. @default "end" */
    labelPosition: { type: String as PropType<"start" | "end">, default: "end" },
  },
  emits: {
    /** The state of the switch changed */
    "update:checked": (_checked: boolean) => true,
    /** The switch gained focus */
    focus: (_event: FocusEvent) => true,
    /** The switch lost focus */
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
    const internalChecked = ref(props.defaultChecked ?? false)
    const checked = computed(() => props.checked ?? internalChecked.value)
    const setChecked = (next: boolean) => {
      if (next === checked.value) return
      if (props.checked === undefined) internalChecked.value = next
      emit("update:checked", next)
    }

    const initialChecked = checked.value
    const isFormControl = useIsFormControl(control, () => attrs.form)
    const controlSize = useSize(() => (isFormControl.value ? control.value : null))
    const onUserClick = useBubbleInputEffect(bubbleInput, () => checked.value, false)

    onMounted(() => {
      control.value = (container.value?.firstElementChild as HTMLButtonElement | null) ?? null
    })

    // radix-ui 1.8: a reset of the switch's form restores the initial state
    watch(control, (button, _, onCleanup) => {
      const formId = attrs.form
      const form = typeof formId === "string" ? button?.ownerDocument.getElementById(formId) : button?.form
      if (!(form instanceof HTMLFormElement)) return
      const reset = () => setChecked(initialChecked)
      form.addEventListener("reset", reset)
      onCleanup(() => form.removeEventListener("reset", reset))
    })

    // In a form, the button's click stops here; the input's click bubbles instead
    const afterClick = (event: Event) => {
      const hasConsumerStoppedPropagation = event.cancelBubble
      onUserClick({ requestedChecked: !checked.value, hasConsumerStoppedPropagation })
      if (bubbleInput.value && isFormControl.value && !hasConsumerStoppedPropagation) event.stopPropagation()
    }

    return () => {
      const { class: className, form, ...rest } = attrs
      const id = props.id ?? generatedId
      const hasLabel = Boolean(slots.label || props.label)
      const hasDescription = Boolean(slots.description || props.description)
      // The description only renders next to a label
      const descriptionId = hasLabel && hasDescription ? `${id}-description` : undefined

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

      const label = () =>
        h("label", { for: id, class: s.Label }, slots.label ? slots.label() : props.label)

      return h(
        "div",
        {
          "ref": container,
          "class": [s.Container, className],
          "data-disabled": props.disabled ? "" : undefined,
          "data-has-label": hasLabel ? "" : undefined,
          "data-label-position": props.labelPosition,
        },
        [
          h(
            RekaSwitchRoot as never,
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
                    "drop": ["onKeydown"],
                    "id": id,
                    "class": s.Track,
                    "aria-describedby": descriptionId,
                    "value": props.value ?? "on",
                    ...buttonAttrs,
                  },
                  { default: () => h(RekaSwitchThumb, { class: s.Thumb }) },
                ),
            },
          ),
          isFormControl.value
            ? h("input", {
                "ref": bubbleInput,
                "type": "checkbox",
                "aria-hidden": "true",
                // React's `defaultChecked`: the prop, else the first state
                "^checked": (props.defaultChecked ?? initialChecked) ? "" : undefined,
                "name": props.name,
                "^value": props.value ?? "on",
                "required": props.required,
                "disabled": props.disabled,
                "form": form,
                "tabindex": -1,
                "style": bubbleInputStyle(controlSize.value, { transform: "translateX(-100%)" }),
              })
            : null,
          hasLabel
            ? hasDescription
              ? h("div", { class: s.LabelGroup }, [
                  label(),
                  h(
                    "span",
                    { id: descriptionId, class: s.Description },
                    slots.description ? slots.description() : props.description,
                  ),
                ])
              : label()
            : null,
        ],
      )
    }
  },
})

type SwitchOwnProps = InstanceType<typeof SwitchComponent>["$props"]

export type SwitchProps = SwitchOwnProps

export const Switch = SwitchComponent
