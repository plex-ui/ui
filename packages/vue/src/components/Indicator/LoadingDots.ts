import { defineComponent, h, type HTMLAttributes } from "vue"
import s from "@plexui/styles/components/Indicator/LoadingDots.module.css"

const LoadingDotsComponent = defineComponent({
  name: "LoadingDots",
  setup() {
    return () =>
      h("div", { class: s.LoadingDots }, [h("div", { class: s.Dot }), h("div", { class: s.Dot }), h("div", { class: s.Dot })])
  },
})

/** The native <div> attributes that fall through to LoadingDots, as in React. */
export type LoadingDotsProps = HTMLAttributes

/** Port of packages/ui/src/components/Indicator/LoadingDots.tsx. */
export const LoadingDots = LoadingDotsComponent as typeof LoadingDotsComponent & { new (): { $props: LoadingDotsProps } }
