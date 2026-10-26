import { defineComponent, h, inject, provide, type HTMLAttributes, type InjectionKey, type PropType, type VNodeChild } from "vue"
import ChevronRightSm from "../Icon/svg/ChevronRightSm.js"
import { TextLink } from "../TextLink/index.js"
import s from "@plexui/styles/components/Breadcrumb/Breadcrumb.module.css"

// Vue port of packages/ui/src/components/Breadcrumb/Breadcrumb.tsx.
// `separator` is a slot on Breadcrumb; other attributes fall through to the
// <nav>, as React spreads them.

const SeparatorKey: InjectionKey<() => VNodeChild> = Symbol("BreadcrumbSeparator")

const BreadcrumbComponent = defineComponent({
  name: "Breadcrumb",
  props: {
    /** Text size: `sm` for a trail above a compact header, `md` above a page title. @default "md" */
    size: { type: String as PropType<"sm" | "md">, default: "md" },
    /** Accessible name of the navigation landmark. @default "Breadcrumb" */
    ariaLabel: { type: String, default: "Breadcrumb" },
  },
  setup(props, { slots }) {
    provide(SeparatorKey, () => (slots.separator ? slots.separator() : h(ChevronRightSm)))
    return () =>
      h("nav", { "aria-label": props.ariaLabel, "class": s.Breadcrumb, "data-size": props.size }, [
        h("ol", { class: s.List }, slots.default?.()),
      ])
  },
})

type BreadcrumbOwnProps = InstanceType<typeof BreadcrumbComponent>["$props"]

/** Breadcrumb props plus the attributes that fall through to the <nav>. */
export type BreadcrumbProps = BreadcrumbOwnProps & Omit<HTMLAttributes, keyof BreadcrumbOwnProps>

/**
 * The trail of pages that leads to the current one. Each `BreadcrumbItem` is
 * a link, a button (`@click`) or the current page (`current`). The
 * `separator` slot replaces the chevron between items.
 */
export const Breadcrumb = BreadcrumbComponent as typeof BreadcrumbComponent & { new (): { $props: BreadcrumbProps } }

/** One step of the trail (React `Breadcrumb.Item`). */
export const BreadcrumbItem = defineComponent({
  name: "BreadcrumbItem",
  inheritAttrs: false,
  props: {
    /** Link destination. Internal paths use the `linkComponent` of `PlexUIProvider` */
    href: String,
    /** Router link destination, for link components that take `to` */
    to: [String, Object] as PropType<string | Record<string, unknown>>,
    /** The current page: not a link, marked `aria-current="page"`. @default false */
    current: { type: Boolean, default: false },
    /** Makes an item without a destination act as a button (`@click`) */
    onClick: Function as PropType<(event: MouseEvent) => void>,
  },
  setup(props, { slots, attrs }) {
    const separator = inject(SeparatorKey, () => h(ChevronRightSm))
    return () => {
      let content: VNodeChild
      if (props.current) {
        content = h("span", { "class": s.Current, "aria-current": "page" }, slots.default?.())
      } else if (props.href || props.to || props.onClick) {
        content = h(
          TextLink,
          { class: s.Link, href: props.href, to: props.to, onClick: props.onClick, underline: false },
          { default: () => slots.default?.() },
        )
      } else {
        content = h("span", null, slots.default?.())
      }
      return h("li", { class: [s.Item, attrs.class] }, [
        h("span", { "class": s.Separator, "aria-hidden": "true" }, [separator()]),
        content,
      ])
    }
  },
})

export type BreadcrumbItemProps = InstanceType<typeof BreadcrumbItem>["$props"] & { class?: HTMLAttributes["class"] }
