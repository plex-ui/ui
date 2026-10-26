import { defineComponent, h, type HTMLAttributes, type PropType } from "vue"
import type { SemanticColors, Sizes, Variants } from "@plexui/styles/types"
import { wrapTextNodeSiblings } from "../../lib/renderHelpers.js"
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
    /** Size scale of the badge: `sm` 20px, `md` 22px, `lg` 24px. @default "sm" */
    size: { type: String as PropType<Sizes<"sm" | "md" | "lg">>, default: "sm" },
    /** Determines if the badge should be a fully rounded pill shape. @default false */
    pill: { type: Boolean, default: false },
    /** Color of the badge, related to its meaning or intent. @default "secondary" */
    color: { type: String as PropType<BadgeColor>, default: "secondary" },
  },
  setup(props, { slots }) {
    return () =>
      h(
        "div",
        {
          "class": s.Badge,
          "data-color": props.color,
          "data-size": props.size,
          "data-pill": props.pill ? "" : undefined,
          "data-variant": props.variant,
        },
        wrapTextNodeSiblings(slots.default?.()),
      )
  },
})

type BadgeOwnProps = InstanceType<typeof BadgeComponent>["$props"]

/** Badge props plus the native <div> attributes that fall through to it, as in React. */
export type BadgeProps = BadgeOwnProps & Omit<HTMLAttributes, keyof BadgeOwnProps>

export const Badge = BadgeComponent as typeof BadgeComponent & { new (): { $props: BadgeProps } }
