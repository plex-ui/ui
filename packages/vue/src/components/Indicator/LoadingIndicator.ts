import { defineComponent, h, type HTMLAttributes, type PropType } from "vue"
import { toCssVariables } from "../../lib/helpers.js"
import s from "@plexui/styles/components/Indicator/LoadingIndicator.module.css"

const LoadingIndicatorComponent = defineComponent({
  name: "LoadingIndicator",
  props: {
    /** Size of the indicator, in pixels. Defaults to 1em, or 20px with the touch stylesheet. */
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
      }, Array.from({ length: 8 }, (_, index) => h("span", { key: index, class: s.Spoke, "aria-hidden": "true" })))
  },
})

type LoadingIndicatorOwnProps = InstanceType<typeof LoadingIndicatorComponent>["$props"]

/** LoadingIndicator props plus the native <span> attributes that fall through to it, as in React. */
export type LoadingIndicatorProps = LoadingIndicatorOwnProps & Omit<HTMLAttributes, keyof LoadingIndicatorOwnProps>

export const LoadingIndicator = LoadingIndicatorComponent as typeof LoadingIndicatorComponent & {
  new (): { $props: LoadingIndicatorProps }
}
