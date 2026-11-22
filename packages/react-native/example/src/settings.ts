import type { ColorScheme, PlatformStyle } from "@plexui/react-native"
import { Platform } from "react-native"

export type BrandName = "plex" | "violet"

export type Settings = {
  platform: PlatformStyle
  scheme: ColorScheme
  brand: BrandName
  screen: string
}

declare const location: { hash: string } | undefined

/**
 * The first settings of the gallery. In a browser they come from the fragment of the address (`#platform=android&
 * scheme=dark&brand=violet&screen=buttons`; the Expo dev server takes `?platform=` for itself), so a test or a link
 * opens any state directly.
 */
export function initialSettings(defaults: Settings): Settings {
  if (Platform.OS !== "web" || typeof location === "undefined") return defaults
  const query = new URLSearchParams(location.hash.replace(/^#/, ""))
  const pick = <T extends string>(name: string, values: readonly T[], fallback: T): T => {
    const value = query.get(name)
    return values.includes(value as T) ? (value as T) : fallback
  }
  return {
    platform: pick("platform", ["ios", "android"] as const, defaults.platform),
    scheme: pick("scheme", ["light", "dark"] as const, defaults.scheme),
    brand: pick("brand", ["plex", "violet"] as const, defaults.brand),
    screen: query.get("screen") ?? defaults.screen,
  }
}
