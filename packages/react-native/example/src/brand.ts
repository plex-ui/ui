import type { BrandTheme } from "@plexui/react-native"
import { Platform } from "react-native"

/**
 * A product's brand over Plex UI, as the colors page of the docs sets it on the web: a violet accent, solid primary
 * actions in the accent, rounder corners and a serif face. Everything else follows from the tokens.
 */
export const violetBrand: BrandTheme = {
  colors: { accent: "#7c3aed" },
  tokens: {
    "--color-background-primary-solid": "var(--color-accent)",
    "--color-background-primary-solid-hover": "var(--accent-500)",
    "--color-background-primary-solid-active": "var(--accent-500)",
    "--button-touch-radius": "var(--radius-lg)",
  },
  radius: { lg: 12 },
  fonts: { sans: Platform.select({ android: "serif", default: "Georgia" }) },
}
