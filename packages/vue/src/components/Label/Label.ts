import { defineComponent, h } from "vue"
import { Label as RekaLabel } from "reka-ui"
import s from "@plexui/styles/components/Label/Label.module.css"

/** Port of packages/ui/src/components/Label/Label.tsx on Reka UI's Label. */
export const Label = defineComponent({
  name: "Label",
  props: {
    /** The id of the element the label is associated with */
    for: String,
  },
  setup(props, { slots }) {
    return () => h(RekaLabel, { class: s.Label, for: props.for }, { default: () => slots.default?.() })
  },
})
