import { defineComponent, h, type PropType } from "vue"
import { Separator as RekaSeparator } from "reka-ui"
import s from "@plexui/styles/components/Separator/Separator.module.css"

/** Port of packages/ui/src/components/Separator/Separator.tsx on Reka UI's Separator. */
export const Separator = defineComponent({
  name: "Separator",
  props: {
    /** Direction of the separator. @default "horizontal" */
    orientation: { type: String as PropType<"horizontal" | "vertical">, default: "horizontal" },
    /**
     * When `true`, the separator is ignored by assistive technologies.
     * Set `false` when it conveys meaningful grouping (`role="separator"`).
     * @default true
     */
    decorative: { type: Boolean, default: true },
  },
  setup(props) {
    return () => h(RekaSeparator, { orientation: props.orientation, decorative: props.decorative, class: s.Separator })
  },
})
