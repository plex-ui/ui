import { defineComponent, h, type PropType } from "vue"
import { toCssVariables } from "../../lib/helpers.js"
import s from "@plexui/styles/components/Indicator/LoadingIndicator.module.css"

export const LoadingIndicator = defineComponent({
  name: "LoadingIndicator",
  props: {
    /** Size of the indicator, in pixels. Defaults to 1em. */
    size: [Number, String] as PropType<number | string>,
    /** Stroke width of the indicator, in pixels. Defaults to 2. */
    strokeWidth: Number,
  },
  setup(props, { attrs }) {
    return () =>
      h("span", {
        class: s.LoadingIndicator,
        // A style passed by the caller replaces the size variables, as in React
        style: attrs.style
          ? undefined
          : toCssVariables({
              "indicator-size": props.size,
              "indicator-stroke": props.strokeWidth,
            }),
      })
  },
})
