import {
  defineComponent,
  h,
  inject,
  nextTick,
  onMounted,
  provide,
  ref,
  watch,
  withDirectives,
  type HTMLAttributes,
  type InjectionKey,
  type InputHTMLAttributes,
  type PropType,
  type TextareaHTMLAttributes,
} from "vue"
import type { ControlSize, Variants } from "@plexui/styles/types"
import { Button, type ButtonColor, type ButtonProps } from "../Button/index.js"
import { vDefaultValue, vServerText } from "../../lib/defaultValue.js"
import s from "@plexui/styles/components/InputGroup/InputGroup.module.css"

// Vue port of packages/ui/src/components/InputGroup/InputGroup.tsx.
// Exports are flat (`InputGroupInput` for `InputGroup.Input`, ...). The group
// provides its size, pill, disabled and invalid state to the parts, as the
// React context does. React spreads the remaining props after its own
// attributes, so caller attributes win; Vue's attribute fallthrough merges
// them the same way. `InputGroupInput` / `InputGroupTextarea` take
// `v-model:value` and `default-value` like Input and Textarea (the textarea's
// text content follows the value and its value is set imperatively, as in
// Textarea).

type InputGroupContext = {
  readonly size: ControlSize
  readonly pill: boolean
  readonly disabled: boolean
  readonly invalid: boolean
}

const InputGroupKey: InjectionKey<InputGroupContext> = Symbol("InputGroup")

const CONTROL_SELECTOR = "[data-slot='input-group-control']"

// A fallthrough listener is a function or, when merged, an array of them
const callListeners = (listener: unknown, evt: Event) => {
  for (const fn of Array.isArray(listener) ? listener : [listener]) {
    if (typeof fn === "function") fn(evt)
  }
}

/** Button size for each group size: the closest Button that fits inside the control */
const BUTTON_SIZE: Record<ControlSize, ControlSize> = {
  "3xs": "3xs",
  "2xs": "3xs",
  "xs": "3xs",
  "sm": "3xs",
  "md": "2xs",
  "lg": "sm",
  "xl": "md",
  "2xl": "lg",
  "3xl": "xl",
}

const InputGroupComponent = defineComponent({
  name: "InputGroup",
  inheritAttrs: false,
  props: {
    /** Visual style of the group. @default "outline" */
    variant: { type: String as PropType<Variants<"outline" | "soft">>, default: "outline" },
    /** Controls the size of the group, on the same scale as Input: `3xs` 22px up to `3xl` 48px. @default "md" */
    size: { type: String as PropType<ControlSize>, default: "md" },
    /** Fully rounded group, with pill buttons inside. @default false */
    pill: { type: Boolean, default: false },
    /** Disables the control and the buttons inside the group. @default false */
    disabled: { type: Boolean, default: false },
    /** Mark the group as invalid. @default false */
    invalid: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    provide(InputGroupKey, {
      get size() {
        return props.size
      },
      get pill() {
        return props.pill
      },
      get disabled() {
        return props.disabled
      },
      get invalid() {
        return props.invalid
      },
    })

    // Clicks on the frame, icons and text focus the control, as in Input
    const handleMouseDown = (evt: MouseEvent) => {
      callListeners(attrs.onMousedown, evt)
      const control = (evt.currentTarget as HTMLElement).querySelector<HTMLElement>(CONTROL_SELECTOR)
      const { target } = evt
      if (evt.defaultPrevented || !control || !(target instanceof Element) || control.contains(target)) {
        return
      }
      // Buttons, links, menus and other controls in the addons take their own clicks
      if (target.closest("button, a, input, textarea, select, [role='button'], [role='menuitem']")) {
        return
      }
      evt.preventDefault()
      control.focus()
    }

    return () => {
      const { class: className, onMousedown: _onMousedown, ...restAttrs } = attrs
      return h(
        "div",
        {
          "role": "group",
          "data-slot": "input-group",
          "data-variant": props.variant,
          "data-size": props.size,
          "data-pill": props.pill ? "" : undefined,
          "data-disabled": props.disabled ? "" : undefined,
          "data-invalid": props.invalid ? "" : undefined,
          "class": [s.InputGroup, className],
          "onMousedown": handleMouseDown,
          ...restAttrs,
        },
        slots.default?.(),
      )
    }
  },
})

type InputGroupOwnProps = InstanceType<typeof InputGroupComponent>["$props"]

/** InputGroup props plus the native <div> attributes that fall through to it, as in React. */
export type InputGroupProps = InputGroupOwnProps & Omit<HTMLAttributes, keyof InputGroupOwnProps>

/** An input or textarea with icons, text, buttons and menus attached inside one frame. */
export const InputGroup = InputGroupComponent as typeof InputGroupComponent & {
  new (): { $props: InputGroupProps }
}

// `value` / `default-value` / `update:value` for the native control, as in Input
const controlProps = {
  /** Controlled value; use with `v-model:value` */
  value: { type: [String, Number] as PropType<string | number>, default: undefined },
  /** Initial value of an uncontrolled control */
  defaultValue: { type: [String, Number] as PropType<string | number>, default: undefined },
  /** Disables the control; defaults to the group's `disabled` */
  disabled: { type: Boolean, default: undefined },
}

const useControl = (props: { value?: string | number }, emit: (event: "update:value", value: string) => void) => {
  const group = inject(InputGroupKey, null)
  const handleInput = (evt: Event) => {
    const target = evt.currentTarget as HTMLInputElement | HTMLTextAreaElement
    emit("update:value", target.value)
    // Like a React controlled input, a `value` the parent does not update is put back
    void nextTick(() => {
      if (props.value === undefined) return
      const value = String(props.value)
      if (target.value !== value) target.value = value
    })
  }
  return { group, handleInput }
}

const InputGroupInputComponent = defineComponent({
  name: "InputGroupInput",
  props: {
    ...controlProps,
    /** @default "text" */
    type: { type: String, default: "text" },
  },
  emits: {
    "update:value": (_value: string) => true,
  },
  setup(props, { emit }) {
    const { group, handleInput } = useControl(props, emit)
    return () =>
      withDirectives(
        h("input", {
          "type": props.type,
          "data-slot": "input-group-control",
          "class": s.Control,
          "disabled": props.disabled ?? group?.disabled,
          // Expose the group's invalid state to assistive tech; an explicit aria-invalid wins
          "aria-invalid": group?.invalid || undefined,
          ...(props.value !== undefined ? { value: props.value } : {}),
          "onInput": handleInput,
        }),
        [[vDefaultValue, props.value === undefined ? props.defaultValue : undefined]],
      )
  },
})

type InputGroupInputOwnProps = InstanceType<typeof InputGroupInputComponent>["$props"]

/** InputGroupInput props plus the native <input> attributes that fall through to it. */
export type InputGroupInputProps = InputGroupInputOwnProps &
  Omit<InputHTMLAttributes, keyof InputGroupInputOwnProps | "size">

/** The native <input> of the group, without its own frame (React `InputGroup.Input`). */
export const InputGroupInput = InputGroupInputComponent as typeof InputGroupInputComponent & {
  new (): { $props: InputGroupInputProps }
}

const InputGroupTextareaComponent = defineComponent({
  name: "InputGroupTextarea",
  props: {
    ...controlProps,
    /** @default 3 */
    rows: { type: [Number, String] as PropType<number | string>, default: 3 },
  },
  emits: {
    "update:value": (_value: string) => true,
  },
  setup(props, { emit }) {
    const group = inject(InputGroupKey, null)
    const textareaRef = ref<HTMLTextAreaElement | null>(null)

    // Set imperatively, like React DOM: a `value` prop would make Vue mirror
    // it into a `value` attribute, which React never renders
    const syncValue = () => {
      const textarea = textareaRef.value
      if (!textarea || props.value === undefined) return
      const value = String(props.value)
      if (textarea.value !== value) textarea.value = value
    }
    onMounted(() => {
      // React's initTextarea: the initial text becomes the (dirty) value
      const textarea = textareaRef.value
      const initialValue = textarea?.textContent ?? ""
      if (textarea && initialValue !== "") textarea.value = initialValue
    })
    watch(() => props.value, syncValue, { flush: "post" })

    const handleInput = (evt: Event) => {
      emit("update:value", (evt.currentTarget as HTMLTextAreaElement).value)
      // A controlled value the parent did not update wins over the typed text
      void nextTick(syncValue)
    }

    return () => {
      // React keeps the textarea's text content in sync with the controlled
      // value, else with `defaultValue`
      const textContent = String(props.value ?? props.defaultValue ?? "")
      return withDirectives(
        h("textarea", {
          "ref": textareaRef,
          "rows": props.rows,
          "data-slot": "input-group-control",
          "class": s.Control,
          "disabled": props.disabled ?? group?.disabled,
          "aria-invalid": group?.invalid || undefined,
          textContent,
          "onInput": handleInput,
        }),
        [[vServerText, textContent]],
      )
    }
  },
})

type InputGroupTextareaOwnProps = InstanceType<typeof InputGroupTextareaComponent>["$props"]

/** InputGroupTextarea props plus the native <textarea> attributes that fall through to it. */
export type InputGroupTextareaProps = InputGroupTextareaOwnProps &
  Omit<TextareaHTMLAttributes, keyof InputGroupTextareaOwnProps>

/** The native <textarea> of the group (React `InputGroup.Textarea`). */
export const InputGroupTextarea = InputGroupTextareaComponent as typeof InputGroupTextareaComponent & {
  new (): { $props: InputGroupTextareaProps }
}

export type InputGroupAddonAlign = "inline-start" | "inline-end" | "block-start" | "block-end"

/** Icons, text and buttons beside, above or below the control (React `InputGroup.Addon`). */
export const InputGroupAddon = defineComponent({
  name: "InputGroupAddon",
  props: {
    /**
     * Where the addon sits: before or after the control on its line, or as a
     * row above or below it.
     * @default "inline-start"
     */
    align: { type: String as PropType<InputGroupAddonAlign>, default: "inline-start" },
  },
  setup(props, { slots }) {
    return () =>
      h(
        "div",
        { "data-slot": "input-group-addon", "data-align": props.align, "class": s.Addon },
        slots.default?.(),
      )
  },
})

export type InputGroupAddonProps = InstanceType<typeof InputGroupAddon>["$props"] &
  Omit<HTMLAttributes, keyof InstanceType<typeof InputGroupAddon>["$props"]>

const InputGroupButtonComponent = defineComponent({
  name: "InputGroupButton",
  props: {
    /** Color for the button. @default "secondary" */
    color: { type: String as PropType<ButtonColor>, default: "secondary" },
    /** Style variant. @default "ghost" */
    variant: { type: String as PropType<Variants<"solid" | "soft" | "outline" | "ghost">>, default: "ghost" },
    pill: { type: Boolean, default: undefined },
    disabled: { type: Boolean, default: undefined },
  },
  setup(props, { slots }) {
    const group = inject(InputGroupKey, null)
    return () =>
      h(
        Button,
        {
          color: props.color,
          variant: props.variant,
          size: BUTTON_SIZE[group?.size ?? "md"],
          pill: props.pill ?? group?.pill,
          disabled: props.disabled ?? group?.disabled,
          class: s.Button,
        },
        slots,
      )
  },
})

type InputGroupButtonOwnProps = InstanceType<typeof InputGroupButtonComponent>["$props"]

/** InputGroupButton props plus the Button props (except `size`) that fall through to it, as in React. */
export type InputGroupButtonProps = InputGroupButtonOwnProps &
  Omit<ButtonProps, keyof InputGroupButtonOwnProps | "size">

/**
 * A ghost `Button` sized from the group (React `InputGroup.Button`). Takes the
 * Button props except `size`; `pill` and `disabled` default to the group's.
 */
export const InputGroupButton = InputGroupButtonComponent as typeof InputGroupButtonComponent & {
  new (): { $props: InputGroupButtonProps }
}

/** Text and icons inside an addon: prefixes, units, counters (React `InputGroup.Text`). */
export const InputGroupText = defineComponent({
  name: "InputGroupText",
  setup(_props, { slots }) {
    return () => h("span", { "data-slot": "input-group-text", "class": s.Text }, slots.default?.())
  },
})

export type InputGroupTextProps = HTMLAttributes
