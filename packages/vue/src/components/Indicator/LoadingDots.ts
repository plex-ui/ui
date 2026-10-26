import { defineComponent, h } from "vue"
import s from "@plexui/styles/components/Indicator/LoadingDots.module.css"

/** Port of packages/ui/src/components/Indicator/LoadingDots.tsx. */
export const LoadingDots = defineComponent({
  name: "LoadingDots",
  setup() {
    return () =>
      h("div", { class: s.LoadingDots }, [h("div", { class: s.Dot }), h("div", { class: s.Dot }), h("div", { class: s.Dot })])
  },
})
