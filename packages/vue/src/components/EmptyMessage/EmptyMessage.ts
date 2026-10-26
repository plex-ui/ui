import clsx, { type ClassValue } from "clsx"
import { defineComponent, h, type PropType } from "vue"
import type { SemanticColors, Sizes } from "@plexui/styles/types"
import s from "@plexui/styles/components/EmptyMessage/EmptyMessage.module.css"

// Vue port of packages/ui/src/components/EmptyMessage/EmptyMessage.tsx.
// React's parts take only `children`, `className` and their own props and
// spread nothing else, so other attributes are dropped here too
// (`inheritAttrs: false`, only `class` is applied). Exports are flat
// (`EmptyMessageIcon` for `EmptyMessage.Icon`, ...).

const classOf = (attrs: Record<string, unknown>) => attrs.class as ClassValue

/** Centered message for empty, error and onboarding states. */
export const EmptyMessage = defineComponent({
  name: "EmptyMessage",
  inheritAttrs: false,
  props: {
    /** Determines how the container fills available space. @default "static" */
    fill: { type: String as PropType<"static" | "absolute" | "none">, default: "static" },
    /** `sm` is the compact message for a panel, a card section or an empty list. @default "md" */
    size: { type: String as PropType<Sizes<"sm" | "md">>, default: "md" },
    /** `start` left-aligns the message, for an empty state under a section heading. @default "center" */
    align: { type: String as PropType<"center" | "start">, default: "center" },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        "div",
        {
          "class": clsx(s.EmptyMessage, classOf(attrs)),
          "data-fill": props.fill,
          "data-size": props.size === "sm" ? props.size : undefined,
          "data-align": props.align === "start" ? props.align : undefined,
        },
        slots.default?.(),
      )
  },
})

/** Icon badge of an EmptyMessage (React `EmptyMessage.Icon`). */
export const EmptyMessageIcon = defineComponent({
  name: "EmptyMessageIcon",
  inheritAttrs: false,
  props: {
    /** @default "md" */
    size: { type: String as PropType<Sizes<"sm" | "md">>, default: "md" },
    /** @default "secondary" */
    color: { type: String as PropType<SemanticColors<"secondary" | "danger" | "warning">>, default: "secondary" },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        "div",
        { "class": clsx(s.IconBadge, classOf(attrs)), "data-size": props.size, "data-color": props.color },
        slots.default?.(),
      )
  },
})

/** Title of an EmptyMessage (React `EmptyMessage.Title`). */
export const EmptyMessageTitle = defineComponent({
  name: "EmptyMessageTitle",
  inheritAttrs: false,
  props: {
    /** @default "secondary" */
    color: { type: String as PropType<SemanticColors<"secondary" | "danger" | "warning">>, default: "secondary" },
  },
  setup(props, { attrs, slots }) {
    return () => h("div", { "class": clsx(s.Title, classOf(attrs)), "data-color": props.color }, slots.default?.())
  },
})

/** Description text of an EmptyMessage (React `EmptyMessage.Description`). */
export const EmptyMessageDescription = defineComponent({
  name: "EmptyMessageDescription",
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => h("div", { class: clsx(s.Description, classOf(attrs)) }, slots.default?.())
  },
})

/** Row of actions below an EmptyMessage (React `EmptyMessage.ActionRow`). */
export const EmptyMessageActionRow = defineComponent({
  name: "EmptyMessageActionRow",
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => h("div", { class: clsx(s.ActionRow, classOf(attrs)) }, slots.default?.())
  },
})

export type EmptyMessageProps = InstanceType<typeof EmptyMessage>["$props"] & { class?: string }
export type EmptyMessageIconProps = InstanceType<typeof EmptyMessageIcon>["$props"] & { class?: string }
export type EmptyMessageTitleProps = InstanceType<typeof EmptyMessageTitle>["$props"] & { class?: string }
