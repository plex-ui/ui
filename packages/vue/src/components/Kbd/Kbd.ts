import { defineComponent, h, type HTMLAttributes, type PropType } from "vue"
import s from "@plexui/styles/components/Kbd/Kbd.module.css"

// Vue port of packages/ui/src/components/Kbd/Kbd.tsx. Attributes fall
// through to the <kbd> (and the group's <span>), as React spreads them.

const KbdComponent = defineComponent({
  name: "Kbd",
  props: {
    /** Height and text size: `xs` 16px, `sm` 20px, `md` 24px. @default "sm" */
    size: { type: String as PropType<"xs" | "sm" | "md">, default: "sm" },
    /** `soft` fills the key, `outline` draws its edge; both mix the text color. @default "soft" */
    variant: { type: String as PropType<"soft" | "outline">, default: "soft" },
  },
  setup(props, { slots }) {
    return () => h("kbd", { "class": s.Kbd, "data-size": props.size, "data-variant": props.variant }, slots.default?.())
  },
})

type KbdOwnProps = InstanceType<typeof KbdComponent>["$props"]

/** Kbd props plus the native attributes that fall through to the <kbd>. */
export type KbdProps = KbdOwnProps & Omit<HTMLAttributes, keyof KbdOwnProps>

/** A key or a shortcut, such as ⌘K, in a tooltip, a menu item or a sentence. */
export const Kbd = KbdComponent as typeof KbdComponent & { new (): { $props: KbdProps } }

/** Keys pressed together: a row of `Kbd` (React `Kbd.Group`). */
export const KbdGroup = defineComponent({
  name: "KbdGroup",
  setup(_props, { slots }) {
    return () => h("span", { class: s.Group }, slots.default?.())
  },
})

export type KbdGroupProps = HTMLAttributes
