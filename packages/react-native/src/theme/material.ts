import type { MaterialColors } from "./types"

/** The steps of the Plex gray ramp: the neutral roles are mixed from the two that bracket their Material tone. */
const GRAY_STEPS = [0, 25, 50, 75, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 700, 800, 900, 1000] as const

const channel = (hex: string, at: number) => parseInt(hex.slice(at, at + 2), 16) / 255
const linear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const encode = (y: number) => (y <= 0.0031308 ? 12.92 * y : 1.055 * y ** (1 / 2.4) - 0.055)

/** The relative luminance Y of a color (linear light, 0-1). */
const luminance = (hex: string) => 0.2126 * linear(channel(hex, 1)) + 0.7152 * linear(channel(hex, 3)) + 0.0722 * linear(channel(hex, 5))

/** Material's tone of a color: its CIELAB lightness L*, 0 (black) to 100 (white). */
export function toneOf(hex: string): number {
  const y = luminance(hex)
  const f = y > 216 / 24389 ? Math.cbrt(y) : ((24389 / 27) * y + 16) / 116
  return 116 * f - 16
}

/** The relative luminance of a tone. */
function luminanceOfTone(tone: number): number {
  const f = (tone + 16) / 116
  return f ** 3 > 216 / 24389 ? f ** 3 : (116 * f - 16) / (24389 / 27)
}

const hex2 = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0")

/**
 * A Material tone of the Plex neutrals: Material builds each neutral role from a tone (L*) of its neutral palette,
 * and the Plex grays are that palette for a Plex app. The two grays of the ramp on either side of the tone are
 * mixed, channel by channel, by how far the tone lies between them, so a ramp tinted by a theme keeps its tint.
 */
function neutralTone(grays: readonly string[], tone: number): string {
  const ramp = grays.filter((gray) => /^#[0-9a-f]{6}$/i.test(gray)).map((gray) => ({ gray, tone: toneOf(gray) })).sort((a, b) => a.tone - b.tone)
  if (ramp.length === 0) return "transparent"
  if (tone <= ramp[0].tone) return ramp[0].gray
  const last = ramp[ramp.length - 1]
  if (tone >= last.tone) return last.gray
  const upper = ramp.findIndex((step) => step.tone >= tone)
  const [a, b] = [ramp[upper - 1], ramp[upper]]
  const ya = luminance(a.gray)
  const yb = luminance(b.gray)
  const t = yb === ya ? 0 : Math.min(1, Math.max(0, (luminanceOfTone(tone) - ya) / (yb - ya)))
  return "#" + [1, 3, 5].map((at) => hex2(encode(linear(channel(a.gray, at)) + (linear(channel(b.gray, at)) - linear(channel(a.gray, at))) * t))).join("")
}

/**
 * The tones of Material's neutral roles (Compose material3 `ColorLightTokens` / `ColorDarkTokens`: Neutral,
 * NeutralVariant, Secondary and Tertiary palettes; a Plex app's are all its grays).
 */
const NEUTRAL_TONES = {
  light: {
    surface: 98, surfaceDim: 87, surfaceBright: 98, surfaceVariant: 90,
    surfaceContainerLowest: 100, surfaceContainerLow: 96, surfaceContainer: 94, surfaceContainerHigh: 92, surfaceContainerHighest: 90,
    onSurfaceVariant: 30, outline: 50, outlineVariant: 80, inverseSurface: 20, inverseOnSurface: 95,
    secondary: 40, onSecondary: 100, secondaryContainer: 90, onSecondaryContainer: 10, tertiaryContainer: 90, onTertiaryContainer: 10,
  },
  dark: {
    surface: 6, surfaceDim: 6, surfaceBright: 24, surfaceVariant: 30,
    surfaceContainerLowest: 4, surfaceContainerLow: 10, surfaceContainer: 12, surfaceContainerHigh: 17, surfaceContainerHighest: 22,
    onSurfaceVariant: 80, outline: 60, outlineVariant: 30, inverseSurface: 90, inverseOnSurface: 20,
    secondary: 80, onSecondary: 20, secondaryContainer: 30, onSecondaryContainer: 90, tertiaryContainer: 30, onTertiaryContainer: 90,
  },
} as const

/**
 * Material 3 color roles drawn from Plex UI tokens (decisions 0017, 0026). Primary is the brand accent
 * (`--color-accent`), as Material's primary is the key color of a product, and the text keeps the Plex ink. The
 * neutral roles (surfaces and their containers, outlines, the inverse surface, secondary and tertiary) are the tones
 * Material gives them, mixed from the Plex grays: the same steps of lightness as an Android app, in the Plex neutral.
 */
export function materialColors(resolve: (css: string) => string, scheme?: "light" | "dark"): MaterialColors {
  const mode = scheme ?? (resolve("light-dark(#000000, #ffffff)") === "#ffffff" ? "dark" : "light")
  const grays = GRAY_STEPS.map((step) => resolve(`var(--gray-${step})`))
  const tones = NEUTRAL_TONES[mode]
  const neutral = Object.fromEntries(Object.entries(tones).map(([role, tone]) => [role, neutralTone(grays, tone)])) as Record<keyof typeof tones, string>
  return {
    ...neutral,
    primary: resolve("var(--color-background-accent-solid)"),
    onPrimary: resolve("var(--color-text-accent-solid)"),
    primaryContainer: resolve("var(--color-background-accent-soft)"),
    onPrimaryContainer: resolve("var(--color-text-accent)"),
    onSurface: resolve("var(--color-text)"),
    inversePrimary: resolve("light-dark(var(--accent-200), var(--accent-500))"),
    error: resolve("var(--color-background-danger-solid)"),
    onError: resolve("var(--color-text-danger-solid)"),
    errorContainer: resolve("var(--color-background-danger-soft)"),
    onErrorContainer: resolve("var(--color-text-danger-soft)"),
    scrim: "#000000",
  }
}

/**
 * Material 3 state layers: an overlay of the content color over a container (m3.material.io, Interaction states).
 * Hover 8%, focus 10%, pressed 10%, dragged 16%.
 */
export const stateLayer = { hover: 0.08, focus: 0.1, pressed: 0.1, dragged: 0.16 } as const

/**
 * Material's shadow elevations as CSS box shadows (the key and ambient shadows of the Material web components'
 * `--md-elevation-level`): level 2 is a menu, level 3 a snackbar.
 */
export const elevationShadow = {
  level2: "0 2px 6px 2px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.3)",
  level3: "0 1px 3px rgba(0, 0, 0, 0.3), 0 4px 8px 3px rgba(0, 0, 0, 0.15)",
} as const

/** A color with its alpha multiplied: a state layer or a disabled container. */
export function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("#") && (color.length === 7 || color.length === 9)) {
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    const a = color.length === 9 ? parseInt(color.slice(7, 9), 16) / 255 : 1
    return `rgba(${r}, ${g}, ${b}, ${Math.round(a * alpha * 1000) / 1000})`
  }
  const match = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(color)
  if (match) return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${Math.round(Number(match[4]) * alpha * 1000) / 1000})`
  return color
}
