import { defineComponent, h } from "vue"
import s from "@plexui/styles/components/Skeleton/Skeleton.module.css"

/**
 * Skeleton component for displaying loading placeholders.
 * Use to show a placeholder while content is loading.
 */
export const Skeleton = defineComponent({
  name: "Skeleton",
  props: {
    /** Makes the skeleton circular (border-radius: 50%). @default false */
    circle: Boolean,
  },
  setup(props, { slots }) {
    return () => h("div", { "class": s.Skeleton, "data-circle": props.circle ? "" : undefined }, slots.default?.())
  },
})
