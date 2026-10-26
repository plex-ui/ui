import { defineComponent, h, mergeProps, type HTMLAttributes, type PropType } from "vue"
import { useLinkComponent } from "../PlexUIProvider/internal.js"
import type { LinkComponent } from "../PlexUIProvider/index.js"
import s from "@plexui/styles/components/Card/Card.module.css"

// Vue port of packages/ui/src/components/Card/Card.tsx. Exports are flat
// (`CardHeader` for `Card.Header`, ...). As in React, caller attributes are
// applied after the card's own (`class` is merged), so they win.

export type CardVariant = "outline" | "solid" | "ghost"
export type CardSize = "sm" | "md" | "lg"

const defined = (props: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined))

const CardComponent = defineComponent({
  name: "Card",
  inheritAttrs: false,
  props: {
    /**
     * Visual variant of the card: `"outline"` (1px border), `"solid"` (muted
     * background) or `"ghost"` (no border, no background).
     * @default "outline"
     */
    variant: { type: String as PropType<CardVariant>, default: "outline" },
    /** Padding scale. @default "md" */
    size: { type: String as PropType<CardSize>, default: "md" },
    /** Adds hover/focus affordances. Automatic when `href` is provided. @default false */
    interactive: { type: Boolean, default: false },
    /** When provided, the Card renders as a link. */
    href: String,
    /** Explicitly flag as external, otherwise detected from `href`. */
    external: { type: Boolean, default: undefined },
    /** Override the rendered link component (e.g. a router link). */
    as: [String, Object, Function] as PropType<LinkComponent>,
  },
  setup(props, { attrs, slots }) {
    const DefaultLink = useLinkComponent()

    return () => {
      const { class: className, ...restAttrs } = attrs
      // React checks `typeof href === "string"`, so an empty href still makes a link
      const isLink = typeof props.href === "string"

      const sharedProps = {
        "class": [s.Card, className],
        "data-variant": props.variant,
        "data-size": props.size,
        "data-interactive": props.interactive || isLink ? "" : undefined,
      }

      if (!isLink) {
        return h("div", defined(mergeProps(sharedProps, restAttrs)), slots.default?.())
      }

      const href = props.href as string
      const isExternal = props.external ?? /^https?:\/\//.test(href)
      const LinkComponent = props.as || (isExternal ? "a" : DefaultLink.value)
      const linkAttrs = isExternal ? { target: "_blank", rel: "noopener noreferrer", href } : { href }
      const linkProps = defined(mergeProps(sharedProps, linkAttrs, restAttrs))

      return typeof LinkComponent === "string"
        ? h(LinkComponent, linkProps, slots.default?.())
        : h(LinkComponent, linkProps, { default: () => slots.default?.() })
    }
  },
})

type CardOwnProps = InstanceType<typeof CardComponent>["$props"]

/** Card props plus the native <div> / <a> attributes that fall through to it, as in React. */
export type CardProps = CardOwnProps & Omit<HTMLAttributes, keyof CardOwnProps>

/** Surface primitive. Renders a `<div>`, or a link when `href` is set. */
export const Card = CardComponent as typeof CardComponent & { new (): { $props: CardProps } }

const part = (name: string, tag: string, className: string | undefined) =>
  defineComponent({
    name,
    setup(_props, { slots }) {
      return () => h(tag, { class: className }, slots.default?.())
    },
  })

/** Title + description + optional action (React `Card.Header`). */
export const CardHeader = part("CardHeader", "div", s.Header)
/** Card heading, an `<h3>` (React `Card.Title`). */
export const CardTitle = part("CardTitle", "h3", s.Title)
/** Subtitle or explanation, a `<p>` (React `Card.Description`). */
export const CardDescription = part("CardDescription", "p", s.Description)
/** Primary body region (React `Card.Content`). */
export const CardContent = part("CardContent", "div", s.Content)
/** Trailing actions row (React `Card.Footer`). */
export const CardFooter = part("CardFooter", "div", s.Footer)
/** Absolute top-right slot inside `CardHeader` (React `Card.Action`). */
export const CardAction = part("CardAction", "div", s.Action)

/** Props of the Card parts: native attributes of their element. */
export type CardSlotProps = HTMLAttributes
