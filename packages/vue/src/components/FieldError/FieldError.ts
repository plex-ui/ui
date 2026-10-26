import { defineComponent, h } from "vue"
import { ExclamationMarkCircle } from "../Icon/index.js"
import s from "@plexui/styles/components/FieldError/FieldError.module.css"

/**
 * Port of packages/ui/src/components/FieldError/FieldError.tsx. Like React,
 * only `class` and `id` reach the DOM; other attributes are dropped.
 */
export const FieldError = defineComponent({
  name: "FieldError",
  inheritAttrs: false,
  props: {
    id: String,
  },
  setup(props, { slots, attrs }) {
    return () =>
      h("div", { class: [s.FieldError, attrs.class], id: props.id, role: "alert" }, [
        h(ExclamationMarkCircle, { class: s.Icon }),
        h("span", null, slots.default?.()),
      ])
  },
})

export type FieldErrorProps = InstanceType<typeof FieldError>["$props"]
