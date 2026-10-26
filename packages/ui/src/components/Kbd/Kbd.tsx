import clsx from "clsx"
import type { ComponentProps } from "react"
import s from "@plexui/styles/components/Kbd/Kbd.module.css"

export type KbdProps = ComponentProps<"kbd"> & {
  /**
   * Height and text size: `xs` 16px, `sm` 20px, `md` 24px
   * @default sm
   */
  size?: "xs" | "sm" | "md"
  /**
   * `soft` fills the key, `outline` draws its edge. Both mix the text color,
   * so the key reads on any surface.
   * @default soft
   */
  variant?: "soft" | "outline"
}

/** A key or a shortcut, such as ⌘K, in a tooltip, a menu item or a sentence. */
export const Kbd = ({ size = "sm", variant = "soft", className, ...restProps }: KbdProps) => {
  return <kbd className={clsx(s.Kbd, className)} data-size={size} data-variant={variant} {...restProps} />
}

export type KbdGroupProps = ComponentProps<"span">

/** Keys pressed together: a row of `Kbd`. */
const Group = ({ className, ...restProps }: KbdGroupProps) => {
  return <span className={clsx(s.Group, className)} {...restProps} />
}

Kbd.Group = Group
