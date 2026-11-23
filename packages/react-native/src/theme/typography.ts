import type { FontWeightName, PlatformStyle } from "./types"

/**
 * The text styles of a phone. The names are Apple's (Human Interface Guidelines, Typography, Specifications:
 * the default Large Dynamic Type size); on Android each one takes the nearest role of the Material 3 type scale
 * (m3.material.io/styles/typography/type-scale-tokens), or the Plex Android look's own size where it sets that text
 * (`title3`, `footnote`). Sizes are pt on iOS and sp on Android.
 */
export type TextVariant =
  | "largeTitle"
  | "title1"
  | "title2"
  | "title3"
  | "headline"
  | "body"
  | "callout"
  | "subheadline"
  | "footnote"
  | "caption1"
  | "caption2"

export type TypeStyle = { fontSize: number; lineHeight: number; weight: FontWeightName }

/** iOS (HIG): Large Title 34/41, Title 1 28/34, Title 2 22/28, Title 3 20/25, Headline 17/22 semibold, Body 17/22,
 * Callout 16/21, Subheadline 15/20, Footnote 13/18, Caption 1 12/16, Caption 2 11/13. */
const IOS: Record<TextVariant, TypeStyle> = {
  largeTitle: { fontSize: 34, lineHeight: 41, weight: "regular" },
  title1: { fontSize: 28, lineHeight: 34, weight: "regular" },
  title2: { fontSize: 22, lineHeight: 28, weight: "regular" },
  title3: { fontSize: 20, lineHeight: 25, weight: "regular" },
  headline: { fontSize: 17, lineHeight: 22, weight: "semibold" },
  body: { fontSize: 17, lineHeight: 22, weight: "regular" },
  callout: { fontSize: 16, lineHeight: 21, weight: "regular" },
  subheadline: { fontSize: 15, lineHeight: 20, weight: "regular" },
  footnote: { fontSize: 13, lineHeight: 18, weight: "regular" },
  caption1: { fontSize: 12, lineHeight: 16, weight: "regular" },
  caption2: { fontSize: 11, lineHeight: 13, weight: "regular" },
}

/** Material 3 roles: Headline L 32/40, M 28/36, S 24/32; Title M 16/24 medium; Body L 16/24, M 14/20; Label M
 * 12/16 medium, S 11/16 medium. The Android look's own: the title of a dialog or a sheet, Medium 20, and the
 * secondary line of a row, 13. */
const ANDROID: Record<TextVariant, TypeStyle> = {
  largeTitle: { fontSize: 32, lineHeight: 40, weight: "regular" }, // headlineLarge
  title1: { fontSize: 28, lineHeight: 36, weight: "regular" }, // headlineMedium
  title2: { fontSize: 24, lineHeight: 32, weight: "regular" }, // headlineSmall
  title3: { fontSize: 20, lineHeight: 24, weight: "medium" }, // the Android dialog and sheet title
  headline: { fontSize: 16, lineHeight: 24, weight: "medium" }, // titleMedium
  body: { fontSize: 16, lineHeight: 24, weight: "regular" }, // bodyLarge
  callout: { fontSize: 16, lineHeight: 24, weight: "regular" }, // bodyLarge
  subheadline: { fontSize: 14, lineHeight: 20, weight: "regular" }, // bodyMedium
  footnote: { fontSize: 13, lineHeight: 16, weight: "regular" }, // the Android row's secondary line
  caption1: { fontSize: 12, lineHeight: 16, weight: "medium" }, // labelMedium
  caption2: { fontSize: 11, lineHeight: 16, weight: "medium" }, // labelSmall
}

export function typeStyle(platform: PlatformStyle, variant: TextVariant): TypeStyle {
  return (platform === "android" ? ANDROID : IOS)[variant]
}

/** Material 3 type roles, for components that follow the Material spec on Android. */
export const materialType = {
  titleLarge: { fontSize: 22, lineHeight: 28, weight: "regular" },
  titleMedium: { fontSize: 16, lineHeight: 24, weight: "medium" },
  titleSmall: { fontSize: 14, lineHeight: 20, weight: "medium" },
  bodyLarge: { fontSize: 16, lineHeight: 24, weight: "regular" },
  bodyMedium: { fontSize: 14, lineHeight: 20, weight: "regular" },
  bodySmall: { fontSize: 12, lineHeight: 16, weight: "regular" },
  labelLarge: { fontSize: 14, lineHeight: 20, weight: "medium" },
  labelMedium: { fontSize: 12, lineHeight: 16, weight: "medium" },
  labelSmall: { fontSize: 11, lineHeight: 16, weight: "medium" },
  headlineSmall: { fontSize: 24, lineHeight: 32, weight: "regular" },
  headlineMedium: { fontSize: 28, lineHeight: 36, weight: "regular" },
} as const satisfies Record<string, TypeStyle>

/** The Plex UI text and heading scale of @plexui/styles (`--font-text-*`, `--font-heading-*`). */
export type TextSize = "3xs" | "2xs" | "xs" | "sm" | "md" | "lg"
export type HeadingSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl"
