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
    /** Shows the error icon before the message. @default true */
    icon: { type: Boolean, default: true },
  },
  setup(props, { slots, attrs }) {
    return () =>
      h("div", { class: [s.FieldError, attrs.class], id: props.id, role: "alert" }, [
        props.icon ? h(ExclamationMarkCircle, { class: s.Icon }) : null,
        h("span", null, slots.default?.()),
      ])
  },
})

export type FieldErrorProps = InstanceType<typeof FieldError>["$props"]
