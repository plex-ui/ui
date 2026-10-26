import { defineComponent, h, type LabelHTMLAttributes } from "vue"
import { Label as RekaLabel } from "reka-ui"
import s from "@plexui/styles/components/Label/Label.module.css"

const LabelComponent = defineComponent({
  name: "Label",
  props: {
    /** The id of the element the label is associated with */
    for: String,
  },
  setup(props, { slots }) {
    return () => h(RekaLabel, { class: s.Label, for: props.for }, { default: () => slots.default?.() })
  },
})

type LabelOwnProps = InstanceType<typeof LabelComponent>["$props"]

/** Label props plus the native <label> attributes that fall through to it, as in React. */
export type LabelProps = LabelOwnProps & Omit<LabelHTMLAttributes, keyof LabelOwnProps>

/** Port of packages/ui/src/components/Label/Label.tsx on Reka UI's Label. */
export const Label = LabelComponent as typeof LabelComponent & { new (): { $props: LabelProps } }
