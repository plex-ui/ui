import {
  computed,
  defineComponent,
  h,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  useId,
  watch,
  withCtx,
  type ComputedRef,
  type HTMLAttributes,
  type InjectionKey,
  type PropType,
  type Ref,
} from "vue"
import { Presence, RovingFocusGroup, RovingFocusItem } from "reka-ui"
import { bubbleInputStyle, useIsFormControl, useSize } from "../Checkbox/bubbleInput.js"
import s from "@plexui/styles/components/RadioGroup/RadioGroup.module.css"

// Vue port of packages/ui/src/components/RadioGroup/RadioGroup.tsx. Props,
// defaults, rendered DOM and behaviour match React (checked by the parity
// tests).
//
// React builds on Radix RadioGroup. Reka's RadioGroupItem renders different
// markup (`aria-label` copied from the label, `required` and `name` on the
// button, a visually hidden input only when a `name` is set), stops every
// click and checks an arrow-focused radio a tick later. So the Radix group
// and radio (state, button attributes, hidden form input, arrow-key
// selection) are rendered here, and keyboard focus comes from Reka's
// RovingFocusGroup and RovingFocusItem, the same roving tabindex Radix uses.

type Direction = "col" | "row"

type RadioGroupContextValue = {
  disabled: ComputedRef<boolean>
  name: ComputedRef<string | undefined>
  value: ComputedRef<string | null>
  setValue: (value: string) => void
}

const RadioGroupContextKey: InjectionKey<RadioGroupContextValue> = Symbol("PlexUIRadioGroup")

const useRadioGroupContext = () => {
  const context = inject(RadioGroupContextKey, null)

  if (!context) {
    throw new Error("RadioGroup components must be wrapped in <RadioGroup />")
  }

  return context
}

type ExposedRovingFocusGroup = { getItems: () => { ref: HTMLElement }[] }

const ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]

// Radix RovingFocusGroup's focusFirst
const focusFirst = (candidates: HTMLElement[]) => {
  const previouslyFocused = document.activeElement
  for (const candidate of candidates) {
    if (candidate === previouslyFocused) return
    candidate.focus({ preventScroll: false })
    if (document.activeElement !== previouslyFocused) return
  }
}

const callHandlers = (handlers: unknown, event: Event) => {
  for (const handler of Array.isArray(handlers) ? handlers : [handlers]) {
    if (typeof handler === "function") handler(event)
  }
}

// The caller's listeners the group element composes with Reka's
const GROUP_LISTENERS = ["onMousedown", "onMouseup", "onFocus", "onBlur", "onFocusin", "onFocusout"] as const

// Internal: the radiogroup element rendered through Reka's RovingFocusGroup
// (`asChild`), with Reka's group handlers wired the Radix way:
// - Radix runs the caller's mousedown handler first and skips its own once
//   the event is default-prevented; Reka merges its own in front.
// - Radix's group focus and blur handlers are React `onFocus` / `onBlur`,
//   which bubble from the radios: a radio's focus ends a click focus and its
//   blur ends Shift+Tab's "tabbing back out" (the group is tabbable again).
//   Reka listens to the group's own native focus and blur only, so its
//   handlers run on `focusin` / `focusout` here.
// - Reka also ends a click focus on mouseup, which Radix does not.
const GroupElement = defineComponent({
  name: "RadioGroupElement",
  inheritAttrs: false,
  props: {
    listeners: { type: Object as PropType<Record<string, unknown>>, default: () => ({}) },
  },
  setup(props, { attrs, slots }) {
    return () => {
      const { onMousedown, onMouseup: _onMouseup, onFocus, onBlur, ...restAttrs } = attrs
      const caller = props.listeners
      const handlers: Record<string, (event: Event) => void> = {
        onMousedown: (event) => {
          callHandlers(caller.onMousedown, event)
          if (!event.defaultPrevented) callHandlers(onMousedown, event)
        },
        onFocusin: (event) => {
          callHandlers(caller.onFocusin, event)
          callHandlers(onFocus, event)
        },
        onFocusout: (event) => {
          callHandlers(caller.onFocusout, event)
          callHandlers(onBlur, event)
        },
      }
      for (const key of ["onMouseup", "onFocus", "onBlur"] as const) {
        if (caller[key]) handlers[key] = (event) => callHandlers(caller[key], event)
      }
      return h("div", { ...restAttrs, ...handlers }, slots.default?.())
    }
  },
})

const RadioGroupComponent = defineComponent({
  name: "RadioGroup",
  inheritAttrs: false,
  props: {
    /** Initial selected value when uncontrolled */
    defaultValue: String,
    /** Controlled selected value. Bind with `v-model:value`; leave unset for an uncontrolled group. */
    value: { type: String, default: undefined },
    /** Name submitted with the owning form */
    name: String,
    /** Determines the layout direction of the radio items. @default "row" */
    direction: { type: String as PropType<Direction>, default: "row" },
    /** Controls whether the entire radio group is disabled. @default false */
    disabled: { type: Boolean, default: false },
    /** Marks the group as required (`aria-required`). @default false */
    required: { type: Boolean, default: false },
  },
  emits: {
    /** The selected value changed (`v-model:value`) */
    "update:value": (_value: string) => true,
    /** Same payload as `update:value`, named after React's `onChange` */
    "change": (_value: string) => true,
  },
  setup(props, { attrs, slots, emit }) {
    const groupRef = ref<ExposedRovingFocusGroup | null>(null)

    // Radix useControllableState: controlled while `value` is set
    const uncontrolledValue = ref<string | null>(props.defaultValue ?? null)
    const value = computed(() => (props.value !== undefined ? props.value : uncontrolledValue.value))

    const reportChange = (nextValue: string) => {
      emit("update:value", nextValue)
      emit("change", nextValue)
    }

    const setValue = (nextValue: string) => {
      if (props.value !== undefined) {
        if (nextValue !== props.value) reportChange(nextValue)
      } else {
        uncontrolledValue.value = nextValue
      }
    }

    // Radix reports an uncontrolled change from the group's effect, which
    // React runs after the items' effects (the hidden inputs' clicks)
    watch(
      uncontrolledValue,
      (nextValue) => {
        void nextTick(() => {
          if (nextValue !== null) reportChange(nextValue)
        })
      },
      { flush: "post" },
    )

    provide(RadioGroupContextKey, {
      disabled: computed(() => props.disabled),
      name: computed(() => props.name),
      value,
      setValue,
    })

    // Radix moves focus into the group onto the checked radio, then the last
    // focused one, then the first. Reka looks for a `data-active` attribute
    // that Radix does not render, so its entry focus is replaced here.
    const handleEntryFocus = (event: Event) => {
      event.preventDefault()
      const items = (groupRef.value?.getItems() ?? [])
        .map((item) => item.ref)
        .filter((item) => !item.hasAttribute("data-disabled"))
      const activeItem = items.find((item) => item.getAttribute("data-state") === "checked")
      const currentItem = items.find((item) => item.getAttribute("tabindex") === "0")
      focusFirst([activeItem, currentItem, ...items].filter((item): item is HTMLElement => !!item))
    }

    return () => {
      const { class: className, dir, ...otherAttrs } = attrs
      const listeners: Record<string, unknown> = {}
      const restAttrs: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(otherAttrs)) {
        if ((GROUP_LISTENERS as readonly string[]).includes(key)) listeners[key] = value
        else restAttrs[key] = value
      }

      return h(
        RovingFocusGroup,
        {
          ref: groupRef,
          asChild: true,
          loop: true,
          dir: dir as "ltr" | "rtl" | undefined,
          onEntryFocus: handleEntryFocus,
        },
        {
          default: () =>
            h(
              GroupElement,
              {
                // `dir`, `tabindex` and `style="outline: none"` come from RovingFocusGroup, like Radix
                "listeners": listeners,
                "role": "radiogroup",
                "aria-required": props.required,
                "data-disabled": props.disabled ? "" : undefined,
                "class": [s.RadioGroup, className],
                "data-direction": props.direction,
                ...restAttrs,
              },
              { default: () => slots.default?.() },
            ),
        },
      )
    }
  },
})

// React's value tracker per hidden input: its `checked` on mount, then the
// one React last saw in a click that bubbled to its root. The native setter
// Radix uses bypasses it.
const trackedChecked = new WeakMap<HTMLInputElement, boolean>()

const useCheckedTracker = (input: Ref<HTMLInputElement | null>) =>
  watch(
    input,
    (el) => {
      if (!el || trackedChecked.has(el)) return
      // React creates the input by setting its `checked` property, so later
      // changes of the `checked` attribute never move its checkedness
      el.checked = el.checked
      trackedChecked.set(el, el.checked)
    },
    { flush: "sync" },
  )

/**
 * Radix's RadioBubbleInput effect: sets the hidden radio's `checked` through
 * the native setter and dispatches a bubbling `click` so form listeners see
 * the change. React turns that click into the form's `onChange` when the
 * input's `checked` differs from its value tracker, then refreshes the
 * trackers of the other radios with the same name in the same form; Vue's
 * form listeners are native, so a native `change` follows in those cases.
 */
const dispatchBubbleClick = (input: HTMLInputElement, checked: boolean) => {
  const setChecked = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "checked")?.set
  if (!setChecked) return
  setChecked.call(input, checked)
  input.dispatchEvent(new Event("click", { bubbles: true }))
  if (trackedChecked.get(input) === input.checked) return
  trackedChecked.set(input, input.checked)
  input.dispatchEvent(new Event("change", { bubbles: true }))

  const name = input.getAttribute("name")
  if (name === null) return
  for (const other of Array.from(input.ownerDocument.querySelectorAll<HTMLInputElement>('input[type="radio"]'))) {
    if (other !== input && other.getAttribute("name") === name && other.form === input.form && trackedChecked.has(other)) {
      trackedChecked.set(other, other.checked)
    }
  }
}

const RadioGroupItemComponent = defineComponent({
  name: "RadioGroupItem",
  inheritAttrs: false,
  props: {
    /** Value of this option */
    value: { type: String, required: true },
    /** Determines if a given radio item is disabled. @default false */
    disabled: { type: Boolean, default: false },
    /** Marks the hidden form input of this item as required */
    required: { type: Boolean, default: undefined },
    /** Stretches the item to fill the available width. @default false */
    block: { type: Boolean, default: false },
    /** The orientation of the radio indicator relative to the label. @default "left" */
    orientation: { type: String as PropType<"left" | "right">, default: "left" },
  },
  setup(props, { attrs, slots }) {
    const context = useRadioGroupContext()
    const id = useId()
    const wrapper = ref<HTMLDivElement | null>(null)
    const button = ref<HTMLButtonElement | null>(null)
    const bubbleInput = ref<HTMLInputElement | null>(null)

    const disabled = computed(() => context.disabled.value || props.disabled)
    const checked = computed(() => context.value.value === props.value)

    // Radix's Radio: the hidden input renders until the button mounts, then only inside a form
    const isFormControl = useIsFormControl(button, () => undefined)
    const controlSize = useSize(() => (isFormControl.value ? button.value : null))
    useCheckedTracker(bubbleInput)

    // Radix RadioGroupItem: an arrow key that moves focus onto a radio checks it
    let isArrowKeyPressed = false
    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (ARROW_KEYS.includes(event.key)) isArrowKeyPressed = true
    }
    const handleDocumentKeyUp = () => {
      isArrowKeyPressed = false
    }

    onMounted(() => {
      button.value = (wrapper.value?.firstElementChild as HTMLButtonElement | null) ?? null
      document.addEventListener("keydown", handleDocumentKeyDown)
      document.addEventListener("keyup", handleDocumentKeyUp)
    })

    onBeforeUnmount(() => {
      document.removeEventListener("keydown", handleDocumentKeyDown)
      document.removeEventListener("keyup", handleDocumentKeyUp)
    })

    watch(
      checked,
      (next, previous) => {
        if (bubbleInput.value && next !== previous) dispatchBubbleClick(bubbleInput.value, next)
      },
      { flush: "post" },
    )

    const handleClick = (event: MouseEvent) => {
      // React does not dispatch mouse handlers on a disabled button
      if (disabled.value) return
      if (!checked.value) context.setValue(props.value)
      // In a form, the button's click stops here; the hidden input's click
      // bubbles instead (Plex passes no click handler a consumer could stop)
      if (isFormControl.value) event.stopPropagation()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // According to WAI ARIA, radio groups don't activate items on enter keypress
      if (event.key === "Enter") event.preventDefault()
    }

    const handleFocus = (event: FocusEvent) => {
      // Roving focus moved here with an arrow key: check this radio by clicking it
      if (isArrowKeyPressed) (event.currentTarget as HTMLButtonElement).click()
    }

    // Prevents text selection when double-clicking the label
    const handleLabelMouseDown = (event: MouseEvent) => {
      if (!event.defaultPrevented && event.detail > 1) event.preventDefault()
    }

    return () => {
      const { class: className, ...restAttrs } = attrs
      const isChecked = checked.value
      const isDisabled = disabled.value
      const state = isChecked ? "checked" : "unchecked"
      const itemId = `${props.value}-${id}`

      // Providing an extra wrapper enables `label` to be inline-flex, avoiding clickable whitespace
      // when radio options are of varied lengths.
      // NOTE: Important that this is `flex` to prevent the `inline-flex` label from extra, unintentional whitespace.
      return h("div", { class: ["flex", props.block && "w-full"], ...restAttrs }, [
        h(
          "label",
          {
            "for": itemId,
            "class": [s.RadioLabel, className],
            "data-disabled": isDisabled ? "" : undefined,
            "data-block": props.block ? "" : undefined,
            "data-orientation": props.orientation,
            "onMousedown": handleLabelMouseDown,
          },
          [
            h("div", { class: s.RadioIndicatorWrapper, ref: wrapper }, [
              h(
                RovingFocusItem,
                { asChild: true, focusable: !isDisabled, active: isChecked },
                {
                  default: () =>
                    h(
                      "button",
                      {
                        "type": "button",
                        "role": "radio",
                        "aria-checked": isChecked,
                        "data-state": state,
                        "data-disabled": isDisabled ? "" : undefined,
                        "disabled": isDisabled,
                        "value": props.value,
                        "id": itemId,
                        "class": s.RadioItem,
                        // Reka's RovingFocusItem marks the active item; Radix does not
                        "data-active": undefined,
                        "onClick": handleClick,
                        "onKeydown": handleKeyDown,
                        "onFocus": handleFocus,
                      },
                      [
                        h(
                          Presence,
                          { present: isChecked },
                          {
                            // Presence calls its slot once during setup; withCtx marks it
                            // as a render slot so Vue does not warn about that call
                            default: withCtx(() => [
                              h("span", {
                                "data-state": state,
                                "data-disabled": isDisabled ? "" : undefined,
                                "class": s.RadioIndicator,
                              }),
                            ]),
                          },
                        ),
                      ],
                    ),
                },
              ),
              isFormControl.value
                ? h("input", {
                    "ref": bubbleInput,
                    "type": "radio",
                    "aria-hidden": "true",
                    // React's `defaultChecked`, updated on every render
                    "^checked": isChecked ? "" : undefined,
                    "name": context.name.value,
                    "^value": props.value,
                    // Only the item's own `required` reaches Radix's input
                    "required": props.required,
                    "disabled": isDisabled,
                    "tabindex": -1,
                    "style": bubbleInputStyle(controlSize.value, { transform: "translateX(-100%)" }),
                  })
                : null,
            ]),
            slots.default?.(),
          ],
        ),
      ])
    }
  },
})

type RadioGroupOwnProps = InstanceType<typeof RadioGroupComponent>["$props"]

/** RadioGroup props plus the attributes that fall through to the group element, as in React. */
export type RadioGroupProps = RadioGroupOwnProps &
  Omit<HTMLAttributes, keyof RadioGroupOwnProps> & { "aria-label"?: string }

type RadioGroupItemOwnProps = InstanceType<typeof RadioGroupItemComponent>["$props"]

/** RadioGroupItem props; `class` lands on the label, other attributes on the wrapper `<div>`. */
export type RadioGroupItemProps = RadioGroupItemOwnProps & Omit<HTMLAttributes, keyof RadioGroupItemOwnProps>

export const RadioGroupItem = RadioGroupItemComponent as typeof RadioGroupItemComponent & {
  new (): { $props: RadioGroupItemProps }
}

/**
 * Single-choice group of radio items. Flat export `RadioGroupItem` for
 * templates; `RadioGroup.Item` for render functions and SFCs.
 */
export const RadioGroup = Object.assign(
  RadioGroupComponent as typeof RadioGroupComponent & { new (): { $props: RadioGroupProps } },
  { Item: RadioGroupItem },
)
