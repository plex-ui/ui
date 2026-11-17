import { defineComponent, h, type HTMLAttributes, type PropType } from "vue"
import { ProgressIndicator, ProgressRoot } from "reka-ui"
import s from "@plexui/styles/components/Progress/Progress.module.css"

// Vue port of packages/ui/src/components/Progress/Progress.tsx on Reka UI's
// Progress. Radix and Reka differ in three places, smoothed over here so the
// DOM matches React:
// - Radix announces the percentage as `aria-valuetext` (via `getValueLabel`),
//   Reka as `aria-label`. Reka's label is turned off and its value text set.
// - Radix falls back to `max = 100` for an invalid max and to an
//   indeterminate value for an invalid value. Reka keeps them and asks the
//   parent to correct them, so the same fallbacks are applied before Reka.
// - Caller attributes still win over Reka's, as `{...restProps}` does in React.

const DEFAULT_MAX = 100

const isNumber = (value: unknown): value is number => typeof value === "number"
const isValidMax = (max: unknown): max is number => isNumber(max) && !Number.isNaN(max) && max > 0
const isValidValue = (value: unknown, max: number): value is number =>
  isNumber(value) && !Number.isNaN(value) && value <= max && value >= 0

export type ProgressSize = "sm" | "md" | "lg"

export type ProgressColor = "primary" | "secondary" | "success" | "warning" | "caution" | "danger" | "info" | "discovery"

/** A part of a segmented bar: its share of `max`, its color, and the name it is read with. */
export type ProgressSegment = {
  value: number
  /** @default "primary" */
  color?: ProgressColor
  /** Read out with its share, such as "Paid 60%" */
  label?: string
}

/** The parts of a segmented bar, each clamped so their sum stays within `max`, and their sum. */
export const progressSegments = (segments: ProgressSegment[], max: number) => {
  let total = 0
  const parts = segments.map((segment) => {
    const value = Math.max(0, Math.min(max - total, segment.value || 0))
    total += value
    return { ...segment, value }
  })
  return { parts, total }
}

const segmentsLabel = (parts: ProgressSegment[], max: number) =>
  parts.map((part) => `${part.label ? `${part.label} ` : ""}${Math.round((part.value / max) * 100)}%`).join(", ")

const defaultGetValueLabel = (value: number, max: number) => `${Math.round((value / max) * 100)}%`

const ProgressComponent = defineComponent({
  name: "Progress",
  props: {
    /**
     * Current progress value, between `0` and `max`.
     * Omit (or pass `null`) for an indeterminate state.
     */
    value: { type: Number as PropType<number | null>, default: null },
    /** Maximum value. @default 100 */
    max: { type: Number, default: DEFAULT_MAX },
    /** Accessible value text for the current value. @default "<percentage>%" */
    getValueLabel: Function as PropType<(value: number, max: number) => string>,
    /**
     * Parts of one bar, side by side in their colors, such as paid, pending and due. The value is their sum; they
     * take `value`'s place. A part's share is clamped so the bar never passes `max`.
     */
    segments: { type: Array as PropType<ProgressSegment[]>, default: undefined },
    /**
     * The bar's thickness: `sm` 4px (iOS's progress view), `md` 6px, `lg` 8px (a bar in a stats card, as Apple Fitness).
     * @default "sm"
     */
    size: { type: String as PropType<ProgressSize>, default: "sm" },
    /**
     * The color of the filled part, such as `secondary` (grey) for a second series beside a `primary` one. A segmented
     * bar's parts take their own colors.
     * @default "primary"
     */
    color: { type: String as PropType<ProgressColor>, default: "primary" },
  },
  setup(props) {
    const getValueText = (value: number | null | undefined, max: number) =>
      isNumber(value) ? (props.getValueLabel ?? defaultGetValueLabel)(value, max) : undefined

    return () => {
      if (props.segments) {
        const rootMax = isValidMax(props.max) ? props.max : DEFAULT_MAX
        const { parts, total } = progressSegments(props.segments, rootMax)
        return h(
          ProgressRoot,
          {
            "modelValue": total,
            "max": rootMax,
            "getValueLabel": () => undefined,
            "getValueText": (current: number | null | undefined, currentMax: number) =>
              props.getValueLabel && isNumber(current) ? props.getValueLabel(current, currentMax) : segmentsLabel(parts, rootMax),
            "class": s.Root,
            "data-segmented": "",
            "data-size": props.size,
          },
          {
            default: () => parts.map((part, index) =>
              part.value > 0
                ? h("div", { "key": index, "class": s.Segment, "data-color": part.color ?? "primary", "style": { width: `${(part.value / rootMax) * 100}%` } })
                : null),
          },
        )
      }
      const { value, max } = props
      const resolved = value == null ? null : Math.max(0, Math.min(max, value))
      const percentage = resolved == null ? null : (resolved / max) * 100

      // What Radix renders for the props React hands it
      const rootMax = isValidMax(max) ? max : DEFAULT_MAX
      const rootValue = isValidValue(resolved, rootMax) ? resolved : null

      return h(
        ProgressRoot,
        {
          "modelValue": rootValue,
          "max": rootMax,
          "getValueLabel": () => undefined,
          "getValueText": getValueText,
          "class": s.Root,
          "data-size": props.size,
          "data-color": props.color,
        },
        {
          default: () =>
            h(ProgressIndicator, {
              "class": s.Indicator,
              "style": percentage == null ? undefined : { transform: `translateX(-${100 - percentage}%)` },
              "data-indeterminate": percentage == null ? "" : undefined,
            }),
        },
      )
    }
  },
})

type ProgressOwnProps = InstanceType<typeof ProgressComponent>["$props"]

/** Progress props plus the native <div> attributes that fall through to the root, as in React. */
export type ProgressProps = ProgressOwnProps & Omit<HTMLAttributes, keyof ProgressOwnProps>

export const Progress = ProgressComponent as typeof ProgressComponent & { new (): { $props: ProgressProps } }
