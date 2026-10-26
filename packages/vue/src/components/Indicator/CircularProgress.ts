import { defineComponent, h, type PropType } from "vue"
import { useSimulatedProgress } from "../../composables/useSimulatedProgress.js"
import { toCssVariables } from "../../lib/helpers.js"
import s from "@plexui/styles/components/Indicator/CircularProgress.module.css"

/** Port of packages/ui/src/components/Indicator/CircularProgress.tsx. */
export const CircularProgress = defineComponent({
  name: "CircularProgress",
  inheritAttrs: false,
  props: {
    /** Maximum duration to use for simulated upload progress in ms. @default 15000 */
    maxDuration: { type: Number, default: 15000 },
    /** Sets the progress to full and resolves the simulated timer. @default false */
    done: { type: Boolean, default: false },
    /** Explicit progress (0-100); disables the simulated timer */
    progress: Number,
    /** Size of the indicator, in pixels. @default 28px */
    size: [Number, String] as PropType<number | string>,
    /** Stroke width of the indicator, in pixels, between 1 and 4. @default 2 */
    strokeWidth: Number,
    /** Color of the active progress track (stroke) */
    trackActiveColor: String,
    /** Color of the base track (background stroke) */
    trackColor: String,
  },
  setup(props, { attrs }) {
    const currentTime = +new Date()
    const simulatedProgress = useSimulatedProgress(
      currentTime,
      () => props.maxDuration,
      () => props.progress !== undefined || props.done,
    )

    return () => {
      const progress = props.progress ?? simulatedProgress.value
      const { class: className, style, ...restAttrs } = attrs
      return h(
        "div",
        {
          ...restAttrs,
          class: [s.Container, className],
          style:
            style ||
            toCssVariables({
              "circular-progress-size": props.size,
              "circular-progress-stroke": props.strokeWidth ? Math.min(4, props.strokeWidth) : undefined,
              "circular-progress-track-active-color": props.trackActiveColor,
              "circular-progress-track-color": props.trackColor,
            }),
        },
        [
          h("svg", { "viewBox": "0 0 20 20", "class": s.Track, "data-no-autosize": "true" }, [
            h("circle", { cx: "10", cy: "10", r: "8", fill: "none" }),
          ]),
          h(
            "svg",
            {
              "viewBox": "0 0 20 20",
              "class": s.TrackProgress,
              // React writes this unitless number as-is
              "style": { strokeDashoffset: String(50 - 50 * (progress / 100)) },
              "data-no-autosize": "true",
            },
            [h("circle", { cx: "10", cy: "10", r: "8", fill: "none" })],
          ),
        ],
      )
    }
  },
})
