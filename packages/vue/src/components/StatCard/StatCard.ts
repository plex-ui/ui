import {
  Comment,
  Fragment,
  defineComponent,
  h,
  type HTMLAttributes,
  type PropType,
  type VNode,
  type VNodeArrayChildren,
} from "vue"
import { Badge } from "../Badge/index.js"
import { InfoCircle } from "../Icon/index.js"
import { Tooltip } from "../Tooltip/index.js"
import s from "@plexui/styles/components/StatCard/StatCard.module.css"

// Vue port of packages/ui/src/components/StatCard/StatCard.tsx. Props,
// defaults and rendered DOM match React (checked by the parity tests).
// ReactNode props are slots: `value` (also a prop, for plain values),
// `icon` and `sparkline`. React spreads the remaining props after its own
// attributes, so caller attributes win; Vue's fallthrough does the same.

export type StatCardTrend = {
  /** The percentage change value (e.g. 12.5 for +12.5%) */
  value: number
  /** Optional label for the trend (e.g. "vs last month") */
  label?: string
}

export type StatCardAccentColor =
  | "primary"
  | "secondary"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "discovery"
  | "caution"

// A slot counts as content when it renders something other than comments
// (v-if placeholders), like a truthy ReactNode in React
const hasContent = (nodes: VNodeArrayChildren | undefined): boolean =>
  !!nodes?.some((node) => {
    if (node == null || typeof node === "boolean") return false
    if (Array.isArray(node)) return hasContent(node)
    if (typeof node !== "object") return node !== ""
    const vnode = node as VNode
    if (vnode.type === Comment) return false
    if (vnode.type === Fragment) return hasContent(vnode.children as VNodeArrayChildren)
    return true
  })

const StatCardComponent = defineComponent({
  name: "StatCard",
  props: {
    /** Label describing the metric */
    label: { type: String, required: true },
    /** The primary metric value (e.g. "1,234" or "$50K"); the `value` slot takes rich content */
    value: { type: [String, Number] as PropType<string | number>, default: undefined },
    /** Optional description or subtitle below the value */
    description: String,
    /** Trend indicator with percentage change */
    trend: Object as PropType<StatCardTrend>,
    /** When true, a positive trend is bad (red) and negative is good (green). Use for metrics like "Error Rate" or "Avg Completion Time". */
    invertTrend: { type: Boolean, default: undefined },
    /** Progress value from 0 to 100. Shows a progress bar at the bottom. */
    progress: Number,
    /** Label displayed next to the progress bar */
    progressLabel: String,
    /** Tooltip text: renders an (i) icon next to the label with a tooltip on hover */
    tooltip: String,
    /** Where the trend indicator is positioned: next to the value, or right-aligned in the header row. @default "value" */
    trendPosition: { type: String as PropType<"value" | "header">, default: "value" },
    /** Visual style of the trend indicator: plain colored text, or a Badge. @default "text" */
    trendVariant: { type: String as PropType<"text" | "badge">, default: "text" },
    /** Size of the card: standard dashboard card, or compact for dense layouts. @default "default" */
    size: { type: String as PropType<"default" | "sm">, default: "default" },
    /** Visual variant of the card. @default "default" */
    variant: { type: String as PropType<"default" | "accent">, default: "default" },
    /** Accent border color for the "accent" variant. @default "primary" */
    accentColor: { type: String as PropType<StatCardAccentColor>, default: "primary" },
  },
  setup(props, { slots }) {
    return () => {
      const { label, description, trend, invertTrend, progress, progressLabel, tooltip, trendPosition, trendVariant } =
        props

      const trendValue = trend?.value ?? 0
      const trendClassName =
        trendValue === 0
          ? s.TrendNeutral
          : trendValue > 0
            ? invertTrend
              ? s.TrendNegative
              : s.TrendPositive
            : invertTrend
              ? s.TrendPositive
              : s.TrendNegative

      const trendText = `${trendValue > 0 ? "+" : ""}${trendValue}%`
      const progressValue = progress === undefined ? undefined : Math.min(100, Math.max(0, progress))

      const trendBadgeColor =
        trendValue === 0
          ? "secondary"
          : trendValue > 0
            ? invertTrend
              ? "danger"
              : "success"
            : invertTrend
              ? "success"
              : "danger"

      const trendEl =
        trend != null
          ? trendVariant === "badge"
            ? h(Badge, { size: "sm", color: trendBadgeColor }, { default: () => trendText })
            : h("div", { class: [s.Trend, trendClassName] }, trendText)
          : null

      const headerEl = h("div", { class: s.Header }, [
        h("div", { class: s.LabelRow }, [
          h("div", { class: s.Label }, label),
          tooltip
            ? h(Tooltip, { content: tooltip }, { default: () => h("span", { class: s.InfoIcon }, [h(InfoCircle)]) })
            : null,
        ]),
        trendPosition === "header" && trendEl ? h("div", { class: s.HeaderEnd }, [trendEl]) : null,
      ])

      const valueSlot = slots.value?.()
      const valueRowEl = h("div", { class: s.ValueRow }, [
        h("div", { class: s.Value }, hasContent(valueSlot) ? valueSlot : props.value),
        trendPosition === "value" ? trendEl : null,
        description ? h("div", { class: s.Description }, description) : null,
      ])

      const footerEl = trend?.label
        ? h("div", { class: s.Footer }, [h("div", { class: s.TrendLabel }, trend.label)])
        : null

      const progressEl =
        progressValue !== undefined || progressLabel
          ? h("div", { class: s.Progress }, [
              h("div", { class: s.ProgressTrack }, [
                h("div", {
                  "class": s.ProgressBar,
                  "style": { width: `${progressValue ?? 0}%` },
                  "aria-hidden": "true",
                }),
              ]),
              progressLabel ? h("div", { class: s.ProgressLabel }, progressLabel) : null,
            ])
          : null

      const sparklineSlot = slots.sparkline?.()
      const sparklineEl = hasContent(sparklineSlot) ? h("div", { class: s.Sparkline }, sparklineSlot) : null

      const iconSlot = slots.icon?.()
      const content = [headerEl, valueRowEl, footerEl, progressEl, sparklineEl]

      return h(
        "div",
        {
          "class": s.StatCard,
          "data-variant": props.variant,
          "data-size": props.size,
          "data-accent-color": props.accentColor,
        },
        hasContent(iconSlot)
          ? [
              h("div", { class: s.Body }, [
                h("div", { class: s.IconWrapper }, iconSlot),
                h("div", { class: s.Content }, content),
              ]),
            ]
          : content,
      )
    }
  },
})

type StatCardOwnProps = InstanceType<typeof StatCardComponent>["$props"]

/** StatCard props plus the native <div> attributes that fall through to it, as in React. */
export type StatCardProps = StatCardOwnProps & Omit<HTMLAttributes, keyof StatCardOwnProps>

export const StatCard = StatCardComponent as typeof StatCardComponent & { new (): { $props: StatCardProps } }
