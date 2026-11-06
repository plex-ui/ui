import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch, type PropType } from "vue"
import s from "@plexui/styles/components/ShimmerText/ShimmerText.module.css"

type ShimmerTag = "p" | "span" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "div"

/** If text will always shimmer, use the simpler interface. Like React, only `class` is applied. */
export const ShimmerText = defineComponent({
  name: "ShimmerText",
  inheritAttrs: false,
  props: {
    as: { type: String as PropType<ShimmerTag>, default: "div" },
  },
  setup(props, { slots, attrs }) {
    return () => h(props.as, { class: [s.Shimmer, attrs.class] }, slots.default?.())
  },
})

/** If text may end shimmering after playing for a time, or resume, use shimmerable text. */
export const ShimmerableText = defineComponent({
  name: "ShimmerableText",
  inheritAttrs: false,
  props: {
    as: { type: String as PropType<ShimmerTag>, default: "div" },
    shimmer: { type: Boolean, default: false },
  },
  setup(props, { slots, attrs }) {
    const paused = ref(!props.shimmer)
    const reducedMotion = ref(false)
    let query: MediaQueryList | undefined
    const updateMotion = () => { reducedMotion.value = query?.matches ?? false }
    onMounted(() => {
      if (typeof window.matchMedia !== "function") return
      query = window.matchMedia("(prefers-reduced-motion: reduce)")
      updateMotion()
      query.addEventListener("change", updateMotion)
    })
    onBeforeUnmount(() => query?.removeEventListener("change", updateMotion))

    // Pauses the animation at the start of (what would be) the next iteration.
    const handleAnimationIteration = () => {
      paused.value = true
    }

    watch(
      [() => props.shimmer, reducedMotion],
      ([shimmer, reduced]) => {
        if (shimmer) paused.value = false
        // CSS suppresses iteration events while motion is reduced.
        else if (reduced) paused.value = true
      },
    )

    return () =>
      h(
        props.as,
        {
          ...attrs,
          "class": [s.Shimmer, attrs.class],
          "onAnimationiteration": props.shimmer ? undefined : handleAnimationIteration,
          "data-idle": paused.value ? "" : undefined,
        },
        slots.default?.(),
      )
  },
})
