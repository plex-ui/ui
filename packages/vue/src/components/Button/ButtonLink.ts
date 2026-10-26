import { defineComponent, h, mergeProps, type PropType } from "vue"
import type { ControlSize, Sizes, Variants } from "@plexui/styles/types"
import { handlePressableMouseEnter } from "../../lib/helpers.js"
import { wrapTextNodeSiblings } from "../../lib/renderHelpers.js"
import { useLinkComponent } from "../PlexUIProvider/internal.js"
import type { LinkComponent } from "../PlexUIProvider/index.js"
import type { ButtonColor } from "./Button.js"
import s from "@plexui/styles/components/Button/Button.module.css"

type RouteTarget = string | Record<string, unknown>

const defined = (props: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined))

/** Vue port of `ButtonLink` from packages/ui/src/components/Button/Button.tsx. */
export const ButtonLink = defineComponent({
  name: "ButtonLink",
  inheritAttrs: false,
  props: {
    /** Color for the link. @default "primary" */
    color: { type: String as PropType<ButtonColor>, default: "primary" },
    /** Style variant. @default "solid" */
    variant: { type: String as PropType<Variants<"solid" | "soft" | "outline" | "ghost">>, default: "solid" },
    /** Fully rounded pill shape. @default false */
    pill: { type: Boolean, default: false },
    /** Control height and typography scale. @default "md" */
    size: { type: String as PropType<ControlSize>, default: "md" },
    gutterSize: String as PropType<Sizes<"3xs" | "2xs" | "xs" | "sm" | "md" | "lg" | "xl">>,
    iconSize: String as PropType<Sizes<"sm" | "md" | "lg" | "xl" | "2xl">>,
    /** Force external-link behavior. */
    external: { type: Boolean, default: undefined },
    block: { type: Boolean, default: undefined },
    opticallyAlign: String as PropType<"start" | "end">,
    disabled: { type: Boolean, default: undefined },
    disabledTone: String as PropType<"relaxed">,
    /** Link component override (e.g. a router link). */
    as: [String, Object, Function] as PropType<LinkComponent>,
    href: String,
    to: [String, Object] as PropType<RouteTarget>,
  },
  emits: {
    click: (_event: MouseEvent) => true,
  },
  setup(props, { slots, attrs, emit }) {
    const DefaultComponent = useLinkComponent()

    return () => {
      const { href, to, disabled } = props
      const isExternal = props.external ?? /^https?:\/\//.test(href ?? (typeof to === "string" ? to : "") ?? "")
      const LinkComponent = props.as || (isExternal ? "a" : DefaultComponent.value)
      const { class: className, ...restAttrs } = attrs

      const sharedProps = {
        "class": [s.Button, className],
        // React renders boolean `disabled` on a link as an empty attribute
        "disabled": disabled ? "" : undefined,
        "aria-disabled": disabled,
        "tabindex": disabled ? -1 : undefined,
        // Visual disablement (inert not supported in links, always applied)
        "data-disabled": disabled ? "" : undefined,
        "data-disabled-tone": disabled ? props.disabledTone : undefined,
        "data-color": props.color,
        "data-variant": props.variant,
        "data-pill": props.pill ? "" : undefined,
        "data-block": props.block ? "" : undefined,
        "data-optically-align": props.opticallyAlign,
        "data-size": props.size,
        "data-gutter-size": props.gutterSize,
        "data-icon-size": props.iconSize,
        "onClick": disabled ? undefined : (event: MouseEvent) => emit("click", event),
        "onPointerenter": handlePressableMouseEnter,
      }
      const inner = () => h("span", { class: s.ButtonInner }, wrapTextNodeSiblings(slots.default?.()))

      if (disabled) {
        // Don't thread down stuff that isn't valid for a span - just keep the event handlers
        const eventProps = Object.fromEntries(
          Object.entries(restAttrs).filter(([key, value]) => key.startsWith("on") && typeof value === "function"),
        )
        // mergeProps keeps both pointerenter handlers, as React composes them
        return h("span", defined(mergeProps({ role: "link" }, sharedProps, eventProps)), [inner()])
      }

      const linkProps = defined(
        mergeProps(
          isExternal ? { target: "_blank", rel: "noopener noreferrer", href: href ?? to } : { href, to },
          sharedProps,
          restAttrs,
        ),
      )

      return typeof LinkComponent === "string"
        ? h(LinkComponent, linkProps, [inner()])
        : h(LinkComponent, linkProps, { default: () => [inner()] })
    }
  },
})
