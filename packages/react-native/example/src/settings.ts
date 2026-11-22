import type { ColorScheme, PlatformStyle } from "@plexui/react-native"
import { createContext } from "react"
import { Platform } from "react-native"

export type BrandName = "plex" | "violet"

export type Settings = {
  platform: PlatformStyle
  scheme: ColorScheme
  brand: BrandName
  screen: string
  /** How far down the screen a link opens (`scroll=800`), for screenshots of a device without a finger. */
  scroll?: number
  /** An overlay a link opens on its screen (`open=dialog`, `sheet`, `actions`, `menu`, `toast`). */
  open?: string
}

/** The settings of the last link, for a screen to open what it names (`open=`); a new link is a new object. */
export const LinkContext = createContext<Settings | null>(null)

declare const location: { hash: string } | undefined

/**
 * The first settings of the gallery. In a browser they come from the fragment of the address (`#platform=android&
 * scheme=dark&brand=violet&screen=buttons`; the Expo dev server takes `?platform=` for itself), so a test or a link
 * opens any state directly.
 */
export function initialSettings(defaults: Settings): Settings {
  if (Platform.OS !== "web" || typeof location === "undefined") return defaults
  return settingsFrom(location.hash.replace(/^#/, ""), defaults)
}

/**
 * The settings a link names: the query of a deep link on a device (`exp://host:8081/--/?platform=android&screen=bars`,
 * `xcrun simctl openurl` or `adb shell am start -d`), so a state opens without a tap.
 */
export function settingsFromUrl(url: string, defaults: Settings): Settings {
  const query = url.includes("?") ? url.slice(url.indexOf("?") + 1) : ""
  return query ? settingsFrom(query, defaults) : defaults
}

function settingsFrom(search: string, defaults: Settings): Settings {
  const query = new URLSearchParams(search)
  const pick = <T extends string>(name: string, values: readonly T[], fallback: T): T => {
    const value = query.get(name)
    return values.includes(value as T) ? (value as T) : fallback
  }
  return {
    platform: pick("platform", ["ios", "android"] as const, defaults.platform),
    scheme: pick("scheme", ["light", "dark"] as const, defaults.scheme),
    brand: pick("brand", ["plex", "violet"] as const, defaults.brand),
    screen: query.get("screen") ?? defaults.screen,
    scroll: Number(query.get("scroll")) > 0 ? Number(query.get("scroll")) : undefined,
    open: query.get("open") ?? undefined,
  }
}
