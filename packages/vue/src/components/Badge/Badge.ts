import { defineComponent, h, type HTMLAttributes, type PropType } from "vue"
import type { SemanticColors, Sizes, Variants } from "@plexui/styles/types"
import { wrapTextNodeSiblings } from "../../lib/renderHelpers.js"
import { X } from "../Icon/index.js"
import s from "@plexui/styles/components/Badge/Badge.module.css"

// Vue port of packages/ui/src/components/Badge/index.tsx. React spreads the
// remaining props after its own attributes, so caller attributes win; Vue's
// attribute fallthrough merges them onto the root the same way.

export type BadgeColor = SemanticColors<
  "secondary" | "success" | "danger" | "warning" | "info" | "discovery" | "caution"
>

const BadgeComponent = defineComponent({
  name: "Badge",
  props: {
    /** Visual style of the badge. @default "soft" */
    variant: { type: String as PropType<Variants<"solid" | "soft" | "outline">>, default: "soft" },
    /** Size scale of the badge: `sm` 20px, `md` 22px, `lg` 24px, `xl` 32px. @default "sm" */
    size: { type: String as PropType<Sizes<"sm" | "md" | "lg" | "xl">>, default: "sm" },
    /** Determines if the badge should be a fully rounded pill shape. @default false */
    pill: { type: Boolean, default: false },
    /** Color of the badge, related to its meaning or intent. @default "secondary" */
    color: { type: String as PropType<BadgeColor>, default: "secondary" },
    /** Adds a cross at the end of the badge that calls this when pressed. */
    onRemove: Function as PropType<(event: MouseEvent) => void>,
    /** Accessible name of the cross. @default "Remove" */
    removeLabel: { type: String, default: "Remove" },
    /** Shows the cross as a mark, for a badge inside a control that takes the press. @default false */
    removable: { type: Boolean, default: false },
  },
  setup(props, { slots }) {
    const renderRemove = () => {
      if (props.onRemove) {
        return h(
          "button",
          { "type": "button", "class": s.Remove, "aria-label": props.removeLabel, "onClick": props.onRemove },
          [h(X)],
        )
      }
      return props.removable ? h("span", { "class": s.Remove, "aria-hidden": "true" }, [h(X)]) : null
    }

    return () => {
      const children = slots.default?.() ?? []
      const remove = renderRemove()

      return h(
        "div",
        {
          "class": s.Badge,
          "data-color": props.color,
          "data-size": props.size,
          "data-pill": props.pill ? "" : undefined,
          "data-variant": props.variant,
        },
        wrapTextNodeSiblings(remove ? [...children, remove] : children),
      )
    }
  },
})

type BadgeOwnProps = InstanceType<typeof BadgeComponent>["$props"]

/** Badge props plus the native <div> attributes that fall through to it, as in React. */
export type BadgeProps = BadgeOwnProps & Omit<HTMLAttributes, keyof BadgeOwnProps>

export const Badge = BadgeComponent as typeof BadgeComponent & { new (): { $props: BadgeProps } }
