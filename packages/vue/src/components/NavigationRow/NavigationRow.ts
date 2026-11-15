import { type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ComponentPublicInstance, defineComponent, h, type PropType, ref, type VNodeChild } from "vue"
import { Button, ButtonLink } from "../Button/index.js"
import { Disclosure } from "../Icon/index.js"
import type { LinkComponent } from "../PlexUIProvider/index.js"
import s from "@plexui/styles/components/NavigationRow/NavigationRow.module.css"

type RouteTarget = string | Record<string, unknown>

const shown = (value: unknown) => value !== null && value !== undefined && value !== false && value !== ""

/**
 * Vue port of `NavigationRow` from packages/ui/src/components/NavigationRow/NavigationRow.tsx: a FieldGroup row
 * that opens what it holds, as an iOS Settings drill-in. Attributes (id, class, ARIA, data, listeners) fall through
 * to the pressable. The `label`, `value` and `description` slots take the place of their props.
 */
const NavigationRowComponent = defineComponent({
  name: "NavigationRow",
  inheritAttrs: false,
  props: {
    /** The row's name, where a row's label starts */
    label: [String, Number] as PropType<string | number>,
    /** The current value, at the end of the row in the secondary label. `0` shows; `null`, `undefined` and `""` do not. */
    value: [String, Number] as PropType<string | number | null>,
    /** A line under the label; the row grows from 52 to hold it */
    description: [String, Number] as PropType<string | number>,
    /** Where the row goes. With it the row is a link (through `PlexUIProvider`'s `linkComponent`, or `as`). */
    href: String,
    /** A router target; with it the row is a link through the provider's link component */
    to: [String, Object] as PropType<RouteTarget>,
    /** Force external-link behavior */
    external: { type: Boolean, default: undefined },
    /** Link component override (e.g. a router link). */
    as: [String, Object, Function] as PropType<LinkComponent>,
    /** The row can't be pressed. A disabled link renders as a disabled button, so it never navigates. */
    disabled: { type: Boolean, default: undefined },
  },
  setup(props, { attrs, slots, expose }) {
    const pressable = ref<ComponentPublicInstance | null>(null)
    const element = () => (pressable.value?.$el ?? null) as HTMLElement | null
    // A ref reaches the pressable, as in React: its element and focus()
    expose({ focus: (options?: FocusOptions) => element()?.focus(options), get element() { return element() } })

    return () => {
      const label: VNodeChild = slots.label ? slots.label() : props.label
      const value: VNodeChild = slots.value ? slots.value() : shown(props.value) ? props.value : undefined
      const description: VNodeChild = slots.description ? slots.description() : props.description
      const hasValue = slots.value ? true : shown(props.value)
      const hasDescription = slots.description ? true : shown(props.description)

      const content = () =>
        h("span", { class: s.Content }, [
          h("span", { class: s.Text }, [
            h("span", { class: s.Label }, [label as never]),
            hasDescription ? h("span", { class: s.Description }, [description as never]) : null,
          ]),
          hasValue ? h("span", { class: s.Value }, [value as never]) : null,
          h(Disclosure, { "class": s.Disclosure, "aria-hidden": "true", "data-no-autosize": "" }),
        ])

      const { class: className, ...rest } = attrs
      const shared = {
        "class": [s.Pressable, className],
        "block": true,
        "color": "secondary",
        "variant": "ghost",
        "data-navigation-row": "",
      } as const
      const link = (props.href !== undefined || props.to !== undefined) && !props.disabled

      return h(
        "div",
        {
          "class": s.NavigationRow,
          "data-row": "",
          "data-value": hasValue ? "" : undefined,
          "data-description": hasDescription ? "" : undefined,
        },
        [
          link
            ? h(
                ButtonLink,
                { ...rest, ...shared, ref: pressable, href: props.href, to: props.to, external: props.external, as: props.as },
                { default: content },
              )
            : h(Button, { ...rest, ...shared, ref: pressable, disabled: props.disabled }, { default: content }),
        ],
      )
    }
  },
})

type NavigationRowOwnProps = InstanceType<typeof NavigationRowComponent>["$props"]

/** NavigationRow props plus the native button and link attributes and the click listener that fall through to the
 * pressable, as in React. */
export type NavigationRowProps = NavigationRowOwnProps &
  Omit<ButtonHTMLAttributes, keyof NavigationRowOwnProps | "value" | "type"> &
  Pick<AnchorHTMLAttributes, "target" | "rel" | "download" | "hreflang" | "ping" | "referrerpolicy"> & {
    onClick?: (event: MouseEvent) => void
  }

export const NavigationRow = NavigationRowComponent as typeof NavigationRowComponent & {
  new (): { $props: NavigationRowProps; focus: (options?: FocusOptions) => void; element: HTMLElement | null }
}
