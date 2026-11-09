import clsx from "clsx"
import {
  computed,
  defineComponent,
  h,
  inject,
  provide,
  ref,
  type ComputedRef,
  type InjectionKey,
  type PropType,
} from "vue"
import { RovingFocusGroup, RovingFocusItem } from "reka-ui"
import type { ControlSize, SemanticColors } from "@plexui/styles/types"
import s from "@plexui/styles/components/ToggleGroup/ToggleGroup.module.css"
import {
  GROUP_COMPOSED,
  ITEM_COMPOSED,
  RovingElement,
  focusFirst,
  splitListeners,
} from "../../lib/rovingFocus.js"
import { Button } from "../Button/index.js"

// Vue port of packages/ui/src/components/ToggleGroup/ToggleGroup.tsx: the same DOM (a toolbar of Buttons with
// `aria-pressed`) and the same behaviour. React builds on Radix ToggleGroup type="multiple". Reka's ToggleGroup
// runs its toggle before the caller's click handler and enters the group by attributes Radix does not render, so
// the multiple-select part of Radix ToggleGroup and Toggle is inlined here, and keyboard focus comes from Reka's
// RovingFocusGroup and RovingFocusItem, the roving tabindex Radix uses. React's `value` + `onChange` become
// `value` + `update:value` (`v-model:value`) and `change`.

type ToggleGroupColor = SemanticColors<
  "primary" | "secondary" | "danger" | "success" | "info" | "discovery" | "caution" | "warning"
>

type ToggleGroupContext = ComputedRef<{
  value: readonly string[]
  color: ToggleGroupColor
  size: ControlSize
  pill: boolean
  uniform: boolean
  disabled: boolean
  toggle: (item: string) => void
}>

const TOGGLE_GROUP: InjectionKey<ToggleGroupContext> = Symbol("ToggleGroup")

type ExposedRovingFocusGroup = { getItems: () => { ref: HTMLElement }[] }

/**
 * A row of buttons that each stay pressed or not, any number at a time, such as the days an alarm repeats on.
 * For one choice out of several, use SegmentedControl or RadioGroup.
 */
export const ToggleGroup = defineComponent({
  name: "ToggleGroup",
  inheritAttrs: false,
  props: {
    /** The values of the pressed items (controlled). Bind with `v-model:value`. */
    value: { type: Array as PropType<string[]>, default: undefined },
    /** The values of the items pressed when the group is first rendered (uncontrolled). @default [] */
    defaultValue: { type: Array as PropType<string[]>, default: () => [] },
    /** The fill of a pressed item, a solid button in this color. An item that is not pressed is a soft secondary button. @default "primary" */
    color: { type: String as PropType<ToggleGroupColor>, default: "primary" },
    /** The size of the items, as the Button sizes. @default "md" */
    size: { type: String as PropType<ControlSize>, default: "md" },
    /** Fully rounded items. With `uniform`, each item is a circle. @default false */
    pill: { type: Boolean, default: false },
    /** Items as wide as they are tall, for a letter or an icon. @default false */
    uniform: { type: Boolean, default: false },
    /** Fills the width of its container and spreads the items across it, the first and the last at the edges. @default false */
    block: { type: Boolean, default: false },
    /** Disables every item. @default false */
    disabled: { type: Boolean, default: false },
    /** The reading direction of the items, which the arrow keys follow. @default "ltr" */
    dir: { type: String as PropType<"ltr" | "rtl">, default: undefined },
  },
  emits: {
    /** The pressed items changed */
    "update:value": (value: string[]) => Array.isArray(value),
    /** The pressed items changed (React `onChange`), a newly pressed one last */
    change: (value: string[]) => Array.isArray(value),
  },
  setup(props, { attrs, emit, slots }) {
    const internalValue = ref<string[]>([...props.defaultValue])
    const value = computed(() => props.value ?? internalValue.value)
    const groupRef = ref<ExposedRovingFocusGroup | null>(null)

    // Radix ToggleGroup type="multiple": a pressed item is added last, a released one removed
    const toggle = (item: string) => {
      const next = value.value.includes(item) ? value.value.filter((pressed) => pressed !== item) : [...value.value, item]
      if (props.value === undefined) internalValue.value = next
      emit("update:value", next)
      emit("change", next)
    }

    provide(
      TOGGLE_GROUP,
      computed(() => ({
        value: value.value,
        color: props.color,
        size: props.size,
        pill: props.pill,
        uniform: props.uniform,
        disabled: props.disabled,
        toggle,
      })),
    )

    // Radix enters the group on the pressed item, then the one focused last, then the first. Reka looks for
    // attributes Radix does not render and for item ids these buttons do not have, so its entry is replaced.
    const handleEntryFocus = (event: Event) => {
      event.preventDefault()
      const items = (groupRef.value?.getItems() ?? [])
        .map((item) => item.ref)
        .filter((item) => !item.hasAttribute("disabled"))
      const pressedItem = items.find((item) => item.getAttribute("data-state") === "on")
      const currentItem = items.find((item) => item.getAttribute("tabindex") === "0")
      focusFirst([pressedItem, currentItem, ...items].filter((item): item is HTMLElement => !!item))
    }

    return () => {
      const { class: className, ...otherAttrs } = attrs
      const { listeners, rest: restAttrs } = splitListeners(otherAttrs, GROUP_COMPOSED)
      return h(
        RovingFocusGroup,
        { ref: groupRef, asChild: true, loop: true, dir: props.dir, onEntryFocus: handleEntryFocus },
        {
          default: () =>
            h(
              RovingElement,
              {
                "as": "div",
                "composed": GROUP_COMPOSED,
                "listeners": listeners,
                // `dir` comes from RovingFocusGroup ("ltr" unless set), like Radix
                ...restAttrs,
                // Radix ToggleGroup type="multiple" (radix-ui 1.8) is a toolbar: one tab stop, the arrow keys between items
                "role": "toolbar",
                "class": clsx(s.ToggleGroup, className as string | undefined),
                "data-slot": "toggle-group",
                "data-block": props.block ? "" : undefined,
              },
              { default: () => slots.default?.() },
            ),
        },
      )
    }
  },
})

/** One button of a ToggleGroup, pressed while its `value` is in the group's value. */
export const ToggleGroupItem = defineComponent({
  name: "ToggleGroupItem",
  inheritAttrs: false,
  props: {
    /** The value of the item, in the group's `value` while it is pressed. */
    value: { type: String, required: true },
    /** Disables the item. @default false */
    disabled: { type: Boolean, default: false },
  },
  emits: {
    /** A click, before the item is pressed or released; `event.preventDefault()` keeps it as it is */
    click: (event: MouseEvent) => {
      void event
      return true
    },
  },
  setup(props, { attrs, emit, slots }) {
    const group = inject(TOGGLE_GROUP, null)
    if (!group) throw new Error("ToggleGroupItem must be rendered inside a ToggleGroup")

    return () => {
      const { value, color, size, pill, uniform, toggle } = group.value
      const disabled = group.value.disabled || props.disabled
      const pressed = value.includes(props.value)
      const { class: className, ...otherAttrs } = attrs
      const { listeners, rest: restAttrs } = splitListeners(otherAttrs, ITEM_COMPOSED)

      // Radix Toggle: the caller's click handler runs first and can cancel the toggle. An emitted event, so a
      // `.once` listener runs first too.
      const handleClick = (event: MouseEvent) => {
        // React does not dispatch mouse handlers on a disabled button
        if (disabled) return
        emit("click", event)
        if (event.defaultPrevented) return
        toggle(props.value)
      }

      return h(
        RovingFocusItem,
        { asChild: true, focusable: !disabled, active: pressed },
        {
          default: () =>
            h(
              RovingElement,
              {
                "as": Button,
                "composed": ITEM_COMPOSED,
                "listeners": listeners,
                ...restAttrs,
                // Radix Toggle's state; Reka's RovingFocusItem marks the active item, which Radix does not
                "aria-pressed": pressed,
                "data-state": pressed ? "on" : "off",
                "data-active": undefined,
                "class": clsx(s.Item, className as string | undefined),
                "color": pressed ? color : "secondary",
                "variant": pressed ? "solid" : "soft",
                "size": size,
                "pill": pill,
                "uniform": uniform,
                // Inert rather than Button's disabled look, which paints a pressed and a released item alike: a
                // disabled item keeps its state at half opacity (ToggleGroup.module.css). Reka's RovingFocusItem marks
                // an item that cannot take focus `data-disabled`, which would bring that look back.
                "inert": disabled,
                "data-disabled": undefined,
                "onClick": handleClick,
              },
              { default: () => slots.default?.() },
            ),
        },
      )
    }
  },
})
