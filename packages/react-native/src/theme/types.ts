import type { ColorScheme, TokenValue } from "@plexui/styles/tokens"
import type { TextStyle } from "react-native"

export type { ColorScheme, TokenValue }

/** The interface a component draws: iOS 26 or Material 3. */
export type PlatformStyle = "ios" | "android"

/** The on color of Switch, Checkbox and RadioGroup: the Plex primary (the ink, or a brand's) or the platform's accent. */
export type SelectionColor = "primary" | "accent"

export type FontWeightName = "regular" | "medium" | "semibold" | "bold"

/**
 * Font families by weight. On Android a custom face needs a family per weight (a weight on a custom family is
 * synthesized), so a family per weight is what a theme takes; a single family name is used for every weight.
 */
export type FontFamilies = {
  sans?: string | Partial<Record<FontWeightName, string>>
  mono?: string
}

/** The radius scale of the kit, in px. */
export type RadiusName = "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full"

/**
 * A brand theme: what a product changes of Plex UI, as it would on `:root` on the web.
 *
 * - `colors.accent` is `--color-accent`, the tint of the kit (links, focus, the iOS tint, Material's primary role);
 *   its lighter and darker steps follow. Other keys are token names without `--` (`"color-text"`).
 * - `tokens` overrides any token with a CSS value: `{ "--color-surface": "light-dark(#fff, #101418)" }`.
 * - `fonts` sets the faces; `radius` the radius scale.
 */
export type BrandTheme = {
  colors?: { accent?: string } & Record<string, string | undefined>
  tokens?: Record<string, string>
  fonts?: FontFamilies
  radius?: Partial<Record<RadiusName, number>>
}

/** Material 3 color roles, drawn from Plex UI tokens (decision 0017). */
export type MaterialColors = {
  primary: string
  onPrimary: string
  primaryContainer: string
  onPrimaryContainer: string
  secondary: string
  onSecondary: string
  secondaryContainer: string
  onSecondaryContainer: string
  tertiaryContainer: string
  onTertiaryContainer: string
  surface: string
  surfaceDim: string
  surfaceBright: string
  surfaceVariant: string
  surfaceContainerLowest: string
  surfaceContainerLow: string
  surfaceContainer: string
  surfaceContainerHigh: string
  surfaceContainerHighest: string
  onSurface: string
  onSurfaceVariant: string
  outline: string
  outlineVariant: string
  inverseSurface: string
  inverseOnSurface: string
  inversePrimary: string
  error: string
  onError: string
  errorContainer: string
  onErrorContainer: string
  scrim: string
}

/** Common semantic colors, resolved for the current scheme. */
export type ThemeColors = {
  text: string
  textSecondary: string
  textTertiary: string
  textDisabled: string
  textInverse: string
  textAccent: string
  textDanger: string
  /** The positive color as text: a "Verified" or "Saved" line (`--color-text-success`). */
  textSuccess: string
  accent: string
  /** The positive color as a fill or a glyph: a verified checkmark, a done state (`--color-background-success-solid`; iOS's systemGreen place). */
  success: string
  /** The color of text and glyphs on `success`. */
  onSuccess: string
  /** The destructive color as a fill (`--color-background-danger-solid`). */
  danger: string
  /** The canvas of a plain screen. */
  background: string
  /** The canvas of a grouped screen (iOS grouped lists). */
  groupedBackground: string
  /** A cell or card on the grouped canvas. */
  groupedSurface: string
  surface: string
  surfaceSecondary: string
  surfaceElevated: string
  border: string
  borderSubtle: string
  borderStrong: string
  separator: string
  /** iOS label roles: translucent like the native ones. */
  labelSecondary: string
  labelTertiary: string
  labelQuaternary: string
}

export type Theme = {
  scheme: ColorScheme
  platform: PlatformStyle
  isIOS: boolean
  isAndroid: boolean
  /** The on color of selection controls (`ThemeProvider`'s `selectionColor`). */
  selectionColor: SelectionColor
  reducedMotion: boolean
  /** A token resolved for the scheme: a color string, a length in px, a time in ms, a number or text. */
  token(name: string): TokenValue | undefined
  /** A color token (`"--color-text"` or `"color-text"`); transparent when it is not a color. */
  color(name: string, fallback?: string): string
  /** A length token in px. */
  length(name: string, fallback?: number): number
  /** A time token in ms (0 with reduced motion for the motion tokens, as the CSS does). */
  duration(name: string, fallback?: number): number
  /** Resolves any CSS value against the tokens: `theme.value("alpha(var(--gray-1000), 8%)")`. */
  value(css: string): TokenValue | undefined
  /** The tracking of the sans face at a font size, the Plex kit's Inter tracking. */
  tracking(fontSize: number): number
  /** The family and weight of the sans face for a weight. */
  font(weight: FontWeightName): Pick<TextStyle, "fontFamily" | "fontWeight">
  monoFont: Pick<TextStyle, "fontFamily">
  colors: ThemeColors
  material: MaterialColors
}
