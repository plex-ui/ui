import { defineComponent, h, type HTMLAttributes, type PropType } from "vue"
import { Separator } from "../Separator/index.js"
import { firstElementChild, mergeSlotProps } from "../Tooltip/slot.js"
import s from "@plexui/styles/components/ButtonGroup/ButtonGroup.module.css"

// Vue port of packages/ui/src/components/ButtonGroup/ButtonGroup.tsx.
// Exports are flat (`ButtonGroupSeparator` for `ButtonGroup.Separator`, ...).
// React spreads the remaining props after its own attributes, so caller
// attributes win; Vue's attribute fallthrough merges them the same way.
// `asChild` merges the way Radix's Slot does (the slot's class comes first,
// the child's own props win, the child's handlers run first), which Reka's
// Slot does not, hence the Tooltip's slot helpers.

export type ButtonGroupOrientation = "horizontal" | "vertical"

const ButtonGroupComponent = defineComponent({
  name: "ButtonGroup",
  props: {
    /** Direction of the joined buttons. @default "horizontal" */
    orientation: { type: String as PropType<ButtonGroupOrientation>, default: "horizontal" },
  },
  setup(props, { slots }) {
    return () =>
      h(
        "div",
        {
          "role": "group",
          "data-slot": "button-group",
          "data-orientation": props.orientation,
          "class": s.Root,
        },
        slots.default?.(),
      )
  },
})

type ButtonGroupOwnProps = InstanceType<typeof ButtonGroupComponent>["$props"]

/** ButtonGroup props plus the native <div> attributes that fall through to it, as in React. */
export type ButtonGroupProps = ButtonGroupOwnProps & Omit<HTMLAttributes, keyof ButtonGroupOwnProps>

/** Joins buttons, inputs and other controls into a single visual unit. */
export const ButtonGroup = ButtonGroupComponent as typeof ButtonGroupComponent & {
  new (): { $props: ButtonGroupProps }
}

/** Thin divider between items (React `ButtonGroup.Separator`). Other props go to `Separator`. */
export const ButtonGroupSeparator = defineComponent({
  name: "ButtonGroupSeparator",
  props: {
    /**
     * When omitted, uses `"vertical"`, the axis that looks right between
     * horizontal items. Pass explicitly inside a vertical group.
     */
    orientation: String as PropType<ButtonGroupOrientation>,
  },
  setup(props) {
    return () =>
      h(Separator, {
        "data-slot": "button-group-separator",
        "orientation": props.orientation ?? "vertical",
        "class": s.Separator,
      })
  },
})

export type ButtonGroupSeparatorProps = InstanceType<typeof ButtonGroupSeparator>["$props"] & {
  decorative?: boolean
}

/** Muted label sharing the group's joined geometry (React `ButtonGroup.Text`). */
export const ButtonGroupText = defineComponent({
  name: "ButtonGroupText",
  inheritAttrs: false,
  props: {
    /**
     * Render the passed child (label, span, ...) instead of a `<div>`, while
     * keeping the group's visual treatment.
     * @default false
     */
    asChild: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    return () => {
      const { class: className, ...restAttrs } = attrs
      const ownProps = { "data-slot": "button-group-text", "class": [s.Text, className], ...restAttrs }
      if (!props.asChild) return h("div", ownProps, slots.default?.())
      const child = firstElementChild(slots.default?.())
      return child ? mergeSlotProps(child, ownProps) : null
    }
  },
})

export type ButtonGroupTextProps = InstanceType<typeof ButtonGroupText>["$props"] & HTMLAttributes
