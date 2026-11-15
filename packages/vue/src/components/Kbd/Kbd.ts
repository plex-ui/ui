import { defineComponent, h, onMounted, ref, type HTMLAttributes, type PropType } from "vue"
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

export type KbdModifierName = "mod" | "ctrl" | "alt" | "shift"
export type KbdPlatform = "apple" | "other"

/** Each modifier on an Apple keyboard (a symbol and its name) and on another one. `mod` is ⌘ there and Ctrl here. */
export const KBD_MODIFIERS: Record<KbdModifierName, Record<KbdPlatform, { symbol: string; name: string }>> = {
  mod: { apple: { symbol: "⌘", name: "Command" }, other: { symbol: "Ctrl", name: "Ctrl" } },
  ctrl: { apple: { symbol: "⌃", name: "Control" }, other: { symbol: "Ctrl", name: "Ctrl" } },
  alt: { apple: { symbol: "⌥", name: "Option" }, other: { symbol: "Alt", name: "Alt" } },
  shift: { apple: { symbol: "⇧", name: "Shift" }, other: { symbol: "Shift", name: "Shift" } },
}

/** Whether the browser runs on a Mac, an iPhone or an iPad, whose keyboards print ⌘ and ⌥. */
export const isApplePlatform = () => {
  if (typeof navigator === "undefined") return true
  const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform || navigator.platform || navigator.userAgent
  return /mac|iphone|ipad|ipod/i.test(platform)
}

const KbdModifierComponent = defineComponent({
  name: "KbdModifier",
  props: {
    /** The modifier: `mod` is ⌘ on an Apple keyboard and Ctrl on another, as an app's shortcuts are. @default "mod" */
    name: { type: String as PropType<KbdModifierName>, default: "mod" },
    /** The keyboard to print for; by default the one the browser runs on (Apple on the server). */
    platform: { type: String as PropType<KbdPlatform>, default: undefined },
    /** Height and text size: `xs` 16px, `sm` 20px, `md` 24px. @default "sm" */
    size: { type: String as PropType<"xs" | "sm" | "md">, default: "sm" },
    /** `soft` fills the key, `outline` draws its edge; both mix the text color. @default "soft" */
    variant: { type: String as PropType<"soft" | "outline">, default: "soft" },
  },
  setup(props) {
    // Apple until mounted, as on the server, so hydration matches; then the browser's own keyboard
    const apple = ref(true)
    onMounted(() => { apple.value = isApplePlatform() })
    return () => {
      const key = KBD_MODIFIERS[props.name][props.platform ?? (apple.value ? "apple" : "other")]
      return h("kbd", { "class": s.Kbd, "data-size": props.size, "data-variant": props.variant, "data-modifier": props.name },
        key.symbol === key.name
          ? key.symbol
          : [h("span", { "aria-hidden": "true" }, key.symbol), h("span", { class: s.Name }, key.name)])
    }
  },
})

type KbdModifierOwnProps = InstanceType<typeof KbdModifierComponent>["$props"]

/** KbdModifier props plus the native attributes that fall through to the <kbd>. */
export type KbdModifierProps = KbdModifierOwnProps & Omit<HTMLAttributes, keyof KbdModifierOwnProps>

/** A modifier key as the reader's keyboard prints it: ⌘ on a Mac, Ctrl elsewhere (React `Kbd.Modifier`). */
export const KbdModifier = KbdModifierComponent as typeof KbdModifierComponent & { new (): { $props: KbdModifierProps } }
