import { defineComponent, h, type HTMLAttributes } from "vue"
import s from "@plexui/styles/components/Skeleton/Skeleton.module.css"

const SkeletonComponent = defineComponent({
  name: "Skeleton",
  props: {
    /** Makes the skeleton circular (border-radius: 50%). @default false */
    circle: Boolean,
  },
  setup(props, { slots }) {
    return () => h("div", { "class": s.Skeleton, "data-circle": props.circle ? "" : undefined }, slots.default?.())
  },
})

type SkeletonOwnProps = InstanceType<typeof SkeletonComponent>["$props"]

/** Skeleton props plus the native <div> attributes that fall through to it, as in React. */
export type SkeletonProps = SkeletonOwnProps & Omit<HTMLAttributes, keyof SkeletonOwnProps>

/**
 * Skeleton component for displaying loading placeholders.
 * Use to show a placeholder while content is loading.
 */
export const Skeleton = SkeletonComponent as typeof SkeletonComponent & { new (): { $props: SkeletonProps } }
