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
  shallowRef,
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

type BubbleInputEffect = { input: Ref<HTMLInputElement | null>; run: () => void }

type RadioGroupContextValue = {
  disabled: ComputedRef<boolean>
  required: ComputedRef<boolean>
  name: ComputedRef<string | undefined>
  value: ComputedRef<string | null>
  setValue: (value: string) => void
  bubbleInputEffects: Set<BubbleInputEffect>
  runBubbleInputEffects: () => void
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

    // React runs the items' hidden-input effects in tree order; Vue's post
    // watchers run in the order they were triggered, so the first item's
    // watcher runs them all here, in document order (each is a no-op when
    // nothing changed for it)
    const bubbleInputEffects = new Set<BubbleInputEffect>()
    const runBubbleInputEffects = () => {
      const effects = [...bubbleInputEffects].sort((a, b) => {
        const first = a.input.value
        const second = b.input.value
        if (!first || !second) return 0
        return first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
      })
      for (const effect of effects) effect.run()
    }

    provide(RadioGroupContextKey, {
      disabled: computed(() => props.disabled),
      required: computed(() => props.required),
      name: computed(() => props.name),
      value,
      setValue,
      bubbleInputEffects,
      runBubbleInputEffects,
    })

    // Radix: a reset of the group's form sets the value it first rendered
    const initialValue = value.value
    onMounted(() => {
      const element = (groupRef.value as { $el?: unknown } | null)?.$el
      const form = element instanceof Element ? element.closest("form") : null
      if (!form) return
      const reset = () => {
        if (initialValue !== null) setValue(initialValue)
      }
      form.addEventListener("reset", reset)
      onBeforeUnmount(() => form.removeEventListener("reset", reset))
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
// one React last saw in a click that reached its root (also when a handler
// stopped it from bubbling further). The native setter Radix uses bypasses it.
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
 * the native setter (unless `checked` is undefined) and dispatches a bubbling
 * `click`, which the input stops when `stop` is set, so form listeners see
 * the user's radio only. React turns that click into the form's `onChange`
 * when the input's `checked` differs from its value tracker, then refreshes
 * the trackers of the other radios with the same name in the same form;
 * Vue's form listeners are native, so a native `change` follows in those
 * cases.
 */
const dispatchBubbleClick = (input: HTMLInputElement, checked: boolean | undefined, stop: boolean) => {
  const setChecked = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "checked")?.set
  if (!setChecked) return
  if (checked !== undefined) setChecked.call(input, checked)
  const click = new Event("click", { bubbles: true })
  if (stop) input.addEventListener("click", (event) => event.stopPropagation(), { once: true })
  input.dispatchEvent(click)
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
    /** Sets `required` on this item's radio button (the hidden form input follows the group's) */
    required: { type: Boolean, default: undefined },
    /** Stretches the item to fill the available width. @default false */
    block: { type: Boolean, default: false },
    /** The orientation of the radio indicator relative to the label. @default "left" */
    orientation: { type: String as PropType<"left" | "right">, default: "left" },
    /** Optional second line below the option's label, linked via `aria-describedby` (or the `description` slot) */
    description: String,
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

    // Radix's RadioBubbleInput effect: the radio the user clicked reports its
    // click (also when the value did not change); a radio whose `checked`
    // changed otherwise reports it with a click that stops at the input
    type UserClick = { hasConsumerStoppedPropagation: boolean }
    const userClick = shallowRef<UserClick | null>(null)
    let prevChecked = checked.value
    let handledUserClick: UserClick | null = null
    const bubbleInputEffect: BubbleInputEffect = {
      input: bubbleInput,
      run: () => {
        const input = bubbleInput.value
        if (!input) return
        const isChecked = checked.value
        const checkedChanged = prevChecked !== isChecked
        prevChecked = isChecked
        const isNewUserClick = userClick.value !== null && userClick.value !== handledUserClick
        handledUserClick = userClick.value
        if (isNewUserClick) dispatchBubbleClick(input, checkedChanged ? isChecked : undefined, false)
        else if (checkedChanged) dispatchBubbleClick(input, isChecked, true)
      },
    }
    context.bubbleInputEffects.add(bubbleInputEffect)
    onBeforeUnmount(() => context.bubbleInputEffects.delete(bubbleInputEffect))
    watch([bubbleInput, checked, userClick], context.runBubbleInputEffects, { flush: "post" })

    // Radix's RadioBubbleInput renders `defaultChecked` from its first render
    let defaultChecked: boolean | undefined

    const handleClick = (event: MouseEvent) => {
      // React does not dispatch mouse handlers on a disabled button
      if (disabled.value) return
      if (!checked.value) {
        // Plex passes no click handler a consumer could stop
        userClick.value = { hasConsumerStoppedPropagation: false }
        context.setValue(props.value)
      }
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
      if (isFormControl.value) defaultChecked ??= isChecked
      else defaultChecked = undefined

      // Providing an extra wrapper enables `label` to be inline-flex, avoiding clickable whitespace
      // when radio options are of varied lengths.
      // NOTE: Important that this is `flex` to prevent the `inline-flex` label from extra, unintentional whitespace.
      const description = slots.description ? slots.description() : props.description
      const descriptionId = slots.description || props.description ? `${itemId}-description` : undefined
      const label = h(
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
                      // radix-ui 1.8: the item's own `required` lands on its button
                      "required": props.required ? "" : undefined,
                      "id": itemId,
                      "class": s.RadioItem,
                      "aria-describedby": descriptionId,
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
                  // React's `defaultChecked`, from the input's first render
                  "^checked": defaultChecked ? "" : undefined,
                  "name": context.name.value,
                  "^value": props.value,
                  // radix-ui 1.8: the group's `required` reaches every input
                  "required": context.required.value,
                  "disabled": isDisabled,
                  "tabindex": -1,
                  "style": bubbleInputStyle(controlSize.value, { transform: "translateX(-100%)" }),
                })
              : null,
          ]),
          slots.default?.(),
        ],
      )

      return h("div", { class: ["flex", props.block && "w-full"], ...restAttrs }, [
        descriptionId
          ? // The description stays outside the label, so it describes the radio instead of naming it
            h(
              "div",
              {
                "class": s.RadioItemGroup,
                "data-block": props.block ? "" : undefined,
                "data-orientation": props.orientation,
              },
              [
                label,
                h(
                  "span",
                  { "id": descriptionId, "class": s.RadioDescription, "data-disabled": isDisabled ? "" : undefined },
                  description,
                ),
              ],
            )
          : label,
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
// Typed explicitly so the published declaration refers to the parts instead of
// expanding them (an expanded component type fails consumers' type checks)
export const RadioGroup: typeof RadioGroupComponent & { new (): { $props: RadioGroupProps } } & {
  Item: typeof RadioGroupItem
} = Object.assign(
  RadioGroupComponent as typeof RadioGroupComponent & { new (): { $props: RadioGroupProps } },
  { Item: RadioGroupItem },
)
