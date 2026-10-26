import { defineComponent, h, type PropType } from "vue"
import { useLinkComponent } from "../PlexUIProvider/internal.js"
import type { LinkComponent } from "../PlexUIProvider/index.js"
import s from "@plexui/styles/components/TextLink/TextLink.module.css"

type RouteTarget = string | Record<string, unknown>

// Drops undefined entries so a router link's own `href` is not overridden
const defined = (props: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined))

/** Vue port of packages/ui/src/components/TextLink/TextLink.tsx. */
export const TextLink = defineComponent({
  name: "TextLink",
  inheritAttrs: false,
  props: {
    /** URL */
    href: String,
    /** Router link destination (internal) */
    to: [String, Object] as PropType<RouteTarget>,
    /** Applies a primary color to the link and removes the default `underline`. @default false */
    primary: { type: Boolean, default: false },
    /** Apply `text-decoration: underline` to the Link. @default true unless `primary` */
    underline: { type: Boolean, default: undefined },
    /** Force external link behavior, which is automatically detected based on the URL. */
    forceExternal: { type: Boolean, default: undefined },
    /** Override the default component used for the link (e.g. a router link). */
    as: [String, Object, Function] as PropType<LinkComponent>,
    // Accepted and ignored, as in React: external links always open in a new tab
    target: String,
  },
  setup(props, { slots, attrs }) {
    const DefaultComponent = useLinkComponent()

    return () => {
      const { href, to, primary } = props
      const underline = props.underline ?? !primary
      const isExternal = props.forceExternal ?? /^https?:\/\//.test(href ?? (typeof to === "string" ? to : "") ?? "")
      const Component = props.as || (isExternal ? "a" : DefaultComponent.value)

      // Caller attributes first, so the link's own class and data attributes win
      const sharedProps = {
        ...attrs,
        "class": [s.TextLink, attrs.class],
        "data-primary": primary ? "" : undefined,
        "data-underline": underline ? "" : undefined,
      }

      // Visible link, but non-anchor element. Useful if you want a visual link
      // that cannot be naturally meta-clicked (e.g., inadvertently open a new tab)
      if (!href && !to) {
        return h("span", { ...sharedProps, role: "button" }, slots.default?.())
      }

      const linkProps = defined({
        ...(isExternal ? { target: "_blank", rel: "noopener noreferrer", href: href ?? to } : { href, to }),
        ...sharedProps,
      })

      return typeof Component === "string"
        ? h(Component, linkProps, slots.default?.())
        : h(Component, linkProps, { default: () => slots.default?.() })
    }
  },
})
