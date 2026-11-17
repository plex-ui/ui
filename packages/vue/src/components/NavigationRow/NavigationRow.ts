import { type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ComponentPublicInstance, defineComponent, h, nextTick, onBeforeUnmount, onMounted, onUpdated, type PropType, ref, type VNodeChild, watch } from "vue"
import { Button, ButtonLink } from "../Button/index.js"
import { Disclosure } from "../Icon/index.js"
import { useFieldColumns } from "../../lib/fieldRow.js"
import type { LinkComponent } from "../PlexUIProvider/index.js"
import { hasContent } from "../../lib/slotContent.js"
import s from "@plexui/styles/components/NavigationRow/NavigationRow.module.css"

type RouteTarget = string | Record<string, unknown>

const shown = (value: unknown) => value !== null && value !== undefined && value !== false && value !== ""

/** Whether the label and the value of a row fit beside each other on one line: measured in the end layout, unwrapped */
const valueFitsBeside = (row: HTMLElement) => {
  const content = row.querySelector<HTMLElement>("[data-navigation-row-content]")
  if (!content) return true
  const below = row.hasAttribute("data-value-below")
  row.removeAttribute("data-value-below")
  row.setAttribute("data-measuring", "")
  const fits = [content, ...content.querySelectorAll<HTMLElement>("[data-navigation-row-part]")].every(
    (element) => element.scrollWidth <= element.clientWidth + 0.5,
  )
  row.removeAttribute("data-measuring")
  if (below) row.setAttribute("data-value-below", "")
  return fits
}

/**
 * Vue port of `NavigationRow` from packages/ui/src/components/NavigationRow/NavigationRow.tsx: a FieldGroup row
 * that opens what it holds, as an iOS Settings drill-in. Attributes (id, class, ARIA, data, listeners) fall through
 * to the pressable. The `label`, `value` and `description` slots take the place of their props; the `leading` slot
 * (an `Avatar` or a picture) leads the row, as React's `leading`.
 */
const NavigationRowComponent = defineComponent({
  name: "NavigationRow",
  inheritAttrs: false,
  props: {
    /** The row's name, where a row's label starts */
    label: [String, Number] as PropType<string | number>,
    /** The current value, at the end of the row in the secondary label. `0` shows; `null`, `undefined` and `""` do not. */
    value: [String, Number] as PropType<string | number | null>,
    /** A line under the label; the row grows from 52 to hold it. A `<br />` in the slot starts a second line. */
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
    /**
     * Where the value stands: at the `end` of the row, `below` the label at the full width, or `auto`: at the end while
     * it fits beside the label on one line, otherwise below (as Calendar sets a long value).
     */
    valuePlacement: { type: String as PropType<"end" | "below" | "auto">, default: "end" },
  },
  setup(props, { attrs, slots, expose }) {
    const pressable = ref<ComponentPublicInstance | null>(null)
    const element = () => (pressable.value?.$el ?? null) as HTMLElement | null
    // A ref reaches the pressable, as in React: its element and focus()
    expose({ focus: (options?: FocusOptions) => element()?.focus(options), get element() { return element() } })

    // "auto": measure after each render and when the row's width changes
    const row = ref<HTMLElement | null>(null)
    const fits = ref(true)
    const hasValueNow = () => !!slots.value || shown(props.value)
    const check = () => {
      if (props.valuePlacement !== "auto" || !hasValueNow() || !row.value) return
      const next = valueFitsBeside(row.value)
      if (next !== fits.value) fits.value = next
    }
    let observer: ResizeObserver | undefined
    let width = -1
    // A web font that arrives late (font-display: swap) changes the words' widths, not the row's
    const fonts = typeof document !== "undefined" ? document.fonts : undefined
    let live = true
    const onFonts = () => {
      if (live) check()
    }
    onMounted(() => {
      fonts?.addEventListener?.("loadingdone", onFonts)
      if (typeof ResizeObserver === "undefined" || !row.value) {
        check()
        fonts?.ready.then(onFonts)
        return
      }
      // The first measure waits for the observer's first report, after the frame's layout and before its paint: a
      // measure on mount forced a layout for every row while a sheet of rows was being built. Fonts that finish
      // loading after that report measure again; before it, the report itself measures with them.
      fonts?.ready.then(() => {
        if (width !== -1) onFonts()
      })
      observer = new ResizeObserver((entries?: ResizeObserverEntry[]) => {
        const next = entries?.[entries.length - 1]?.contentRect.width ?? row.value?.getBoundingClientRect().width ?? width
        if (next === width) return
        width = next
        check()
      })
      observer.observe(row.value)
    })
    onUpdated(check)
    // FieldGroup columns give the label a column of its own: a change of them measures again, after the group renders
    const columns = useFieldColumns()
    watch(columns, () => nextTick(check), { flush: "post" })
    onBeforeUnmount(() => {
      live = false
      fonts?.removeEventListener?.("loadingdone", onFonts)
      observer?.disconnect()
    })

    return () => {
      const label: VNodeChild = slots.label ? slots.label() : props.label
      const value: VNodeChild = slots.value ? slots.value() : shown(props.value) ? props.value : undefined
      const description: VNodeChild = slots.description ? slots.description() : props.description
      const hasValue = slots.value ? true : shown(props.value)
      const hasDescription = slots.description ? true : shown(props.description)
      // A slot that renders nothing (a v-if that is off) leaves no column, as React's empty `leading` does
      const leading = slots.leading?.()
      const hasLeading = hasContent(leading)
      const below = hasValue && (props.valuePlacement === "below" || (props.valuePlacement === "auto" && !fits.value))

      const content = () =>
        h("span", { "class": s.Content, "data-navigation-row-content": "" }, [
          hasLeading ? h("span", { class: s.Leading }, [leading as never]) : null,
          h("span", { class: s.Text }, [
            h("span", { "class": s.Label, "data-navigation-row-part": "" }, [label as never]),
            hasDescription ? h("span", { class: s.Description }, [description as never]) : null,
          ]),
          hasValue ? h("span", { "class": s.Value, "data-navigation-row-part": "" }, [value as never]) : null,
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
          "ref": row,
          "class": s.NavigationRow,
          "data-row": "",
          "data-value-below": below ? "" : undefined,
          "data-value": hasValue ? "" : undefined,
          "data-description": hasDescription ? "" : undefined,
          "data-leading": hasLeading ? "" : undefined,
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
