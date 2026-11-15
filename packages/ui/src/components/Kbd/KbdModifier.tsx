"use client"

import clsx from "clsx"
import { useSyncExternalStore } from "react"
import s from "@plexui/styles/components/Kbd/Kbd.module.css"
import type { KbdProps } from "./Kbd"

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

const subscribe = () => () => {}

export type KbdModifierProps = Omit<KbdProps, "children"> & {
  /** The modifier: `mod` is ⌘ on an Apple keyboard and Ctrl on another, as an app's shortcuts are. @default "mod" */
  name?: KbdModifierName
  /** The keyboard to print for; by default the one the browser runs on (Apple on the server). */
  platform?: KbdPlatform
}

/** A modifier key printed as the reader's keyboard prints it: ⌘ on a Mac, Ctrl elsewhere; its name is read out. */
export const KbdModifier = ({ name = "mod", platform, size = "sm", variant = "soft", className, ...restProps }: KbdModifierProps) => {
  const apple = useSyncExternalStore(subscribe, isApplePlatform, () => true)
  const key = KBD_MODIFIERS[name][platform ?? (apple ? "apple" : "other")]
  return (
    <kbd className={clsx(s.Kbd, className)} data-size={size} data-variant={variant} data-modifier={name} {...restProps}>
      {key.symbol === key.name ? (
        key.symbol
      ) : (
        <>
          <span aria-hidden="true">{key.symbol}</span>
          <span className={s.Name}>{key.name}</span>
        </>
      )}
    </kbd>
  )
}
