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
  },
  setup(props) {
    const getValueText = (value: number | null | undefined, max: number) =>
      isNumber(value) ? (props.getValueLabel ?? defaultGetValueLabel)(value, max) : undefined

    return () => {
      const { value, max } = props
      const resolved = value == null ? null : Math.max(0, Math.min(max, value))
      const percentage = resolved == null ? null : (resolved / max) * 100

      // What Radix renders for the props React hands it
      const rootMax = isValidMax(max) ? max : DEFAULT_MAX
      const rootValue = isValidValue(resolved, rootMax) ? resolved : null

      return h(
        ProgressRoot,
        {
          modelValue: rootValue,
          max: rootMax,
          getValueLabel: () => undefined,
          getValueText,
          class: s.Root,
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
