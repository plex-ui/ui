import type { MaterialColors, Theme } from "./types"

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
 * NeutralVariant, Secondary and Tertiary palettes; a Plex app's are all its grays). The secondary roles take the
 * accent's hue (SECONDARY_TONES); for an accent with no hue they stay gray, and then `secondaryContainer` takes the
 * tone Material's own monochrome scheme gives it (material-color-utilities `ColorSpecDelegateImpl2021`: 85 light,
 * 30 dark), not the 90 of a colored scheme, where only the hue sets a selected tab's indicator apart from its bar (94).
 */
const NEUTRAL_TONES = {
  light: {
    surface: 98, surfaceDim: 87, surfaceBright: 98, surfaceVariant: 90,
    surfaceContainerLowest: 100, surfaceContainerLow: 96, surfaceContainer: 94, surfaceContainerHigh: 92, surfaceContainerHighest: 90,
    onSurfaceVariant: 30, outline: 50, outlineVariant: 80, inverseSurface: 20, inverseOnSurface: 95,
    secondary: 40, onSecondary: 100, secondaryContainer: 85, onSecondaryContainer: 10, tertiaryContainer: 90, onTertiaryContainer: 10,
  },
  dark: {
    surface: 6, surfaceDim: 6, surfaceBright: 24, surfaceVariant: 30,
    surfaceContainerLowest: 4, surfaceContainerLow: 10, surfaceContainer: 12, surfaceContainerHigh: 17, surfaceContainerHighest: 22,
    onSurfaceVariant: 80, outline: 60, outlineVariant: 30, inverseSurface: 90, inverseOnSurface: 20,
    secondary: 80, onSecondary: 20, secondaryContainer: 30, onSecondaryContainer: 90, tertiaryContainer: 30, onTertiaryContainer: 90,
  },
} as const

/** The CIELAB coordinates of a color (D65): L* is Material's tone, C and h the chroma and hue angle in degrees. */
function lch(hex: string): { l: number; c: number; h: number } {
  const [r, g, b] = [1, 3, 5].map((at) => linear(channel(hex, at)))
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116)
  const fx = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047)
  const fy = f(0.2126 * r + 0.7152 * g + 0.0722 * b)
  const fz = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883)
  const a = 500 * (fx - fy)
  const bb = 200 * (fy - fz)
  return { l: 116 * fy - 16, c: Math.hypot(a, bb), h: (Math.atan2(bb, a) * 180) / Math.PI }
}

/** A color of a tone, chroma and hue (CIELAB LCh), its chroma reduced until it fits sRGB. */
function fromLch(l: number, c: number, h: number): string {
  const finv = (t: number) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27))
  for (let chroma = c; chroma >= 0; chroma -= 0.5) {
    const fy = (l + 16) / 116
    const fx = fy + (chroma * Math.cos((h * Math.PI) / 180)) / 500
    const fz = fy - (chroma * Math.sin((h * Math.PI) / 180)) / 200
    const [x, y, z] = [finv(fx) * 0.95047, finv(fy), finv(fz) * 1.08883]
    const rgb = [3.2406 * x - 1.5372 * y - 0.4986 * z, -0.9689 * x + 1.8758 * y + 0.0415 * z, 0.0557 * x - 0.204 * y + 1.057 * z]
    if (rgb.every((v) => v >= -0.0005 && v <= 1.0005) || chroma < 0.5) return "#" + rgb.map((v) => hex2(encode(Math.min(1, Math.max(0, v))))).join("")
  }
  return neutralGray(l)
}

const neutralGray = (l: number) => {
  const fy = (l + 16) / 116
  const y = fy ** 3 > 216 / 24389 ? fy ** 3 : (116 * fy - 16) / (24389 / 27)
  return "#" + hex2(encode(y)).repeat(3)
}

/**
 * The secondary roles in the hue of the brand accent: on Android a selection (the selected tab's indicator and
 * symbol, a selected chip, a tonal button, a slider's inactive track) takes the theme's hue at a low chroma, as
 * Material's dynamic color draws it in Google's own apps (the secondary palette of SchemeTonalSpot: the key color's
 * hue at CAM16 chroma 16, about 13 in CIELAB; with the Plex accent #0285ff the indicator is #d9e3f9 light, as on a
 * Pixel). The surfaces keep the Plex grays. An accent with almost no hue (a gray brand) leaves the monochrome
 * tones of NEUTRAL_TONES.
 */
const SECONDARY_TONES = {
  light: { secondary: 40, onSecondary: 100, secondaryContainer: 90, onSecondaryContainer: 30 },
  dark: { secondary: 80, onSecondary: 20, secondaryContainer: 30, onSecondaryContainer: 90 },
} as const
const SECONDARY_CHROMA = 13

function secondaryRoles(accent: string, mode: "light" | "dark"): Partial<Record<keyof typeof SECONDARY_TONES.light, string>> {
  if (!/^#[0-9a-f]{6}$/i.test(accent)) return {}
  const { c, h } = lch(accent)
  if (c < 8) return {}
  return Object.fromEntries(Object.entries(SECONDARY_TONES[mode]).map(([role, tone]) => [role, fromLch(tone, Math.min(SECONDARY_CHROMA, c), h)]))
}

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
    ...secondaryRoles(resolve("var(--color-accent)"), mode),
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
 * The press of a row in a section on Android: black at 4.7% over a light card, as the reference's phone build draws a
 * held card row (its public source's settings selector, #1D000010 at 11%, reads too dark beside it), and the dark
 * theme's list selector, white at 5%, over a dark one.
 */
export const controlHighlight = (scheme: "light" | "dark") => (scheme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.047)")

/**
 * Android's list selector outside a section, the ripple of a popup's item and of a dialog's row: black at 0x0F of
 * 255 over a light surface, white at 0x0D at night.
 */
export const androidSelector = (scheme: "light" | "dark") => (scheme === "dark" ? "rgba(255, 255, 255, 0.051)" : "rgba(0, 0, 0, 0.059)")

/**
 * Text in the accent on Android, as the blue text over a card (a section header, a row's value). Light: #298ACF,
 * which the bright Plex accent (`primary`) is closest to. At night the blues get lighter (#79C4FC in the dark theme):
 * the Plex accent text (`--color-text-accent`, its 200 step at night).
 */
export function accentText(theme: Theme): string {
  return theme.scheme === "dark" ? theme.colors.textAccent : theme.material.primary
}

/**
 * Red text on Android, as destructive and error text (regular and bold): the Plex danger color over a light card
 * (#CC2929 on white), and a lighter red at night (#EE686F in the dark themes): the Plex danger soft text
 * (`--color-text-danger-soft`, its 200 step at night), as `accentText` takes the accent's.
 */
export function dangerText(theme: Theme): string {
  return theme.scheme === "dark" ? theme.color("--color-text-danger-soft", theme.material.error) : theme.material.error
}

/**
 * The divider between the rows of a card on Android: a light gray over a light card (#D9D9D9) and darker than the
 * card at night (#000000 under a #181819 card; the darkest Plex gray, `--gray-0`, the grouped canvas), as the web's
 * `--android-divider`.
 */
export function divider(theme: Theme): string {
  return theme.scheme === "dark" ? theme.color("--gray-0", theme.colors.separator) : "#D9D9D9"
}

/**
 * The fixed grays of the Plex Android look, each with its night pair, as the web's android.css sets them: an off
 * switch's track (`--android-switch-off`: #A7ADB2, `--gray-500` at night), an empty checkbox's ring
 * (`--android-checkbox-ring`: #B0B9C2, `--gray-500`), a field's idle line (`--android-field-line`: #DBDBDB, the text
 * at 24%), a field's hint (`--android-hint`: #A8A8A8, #7D7D7D), the gap between a row menu's groups
 * (`--android-popup-gap`: #F5F5F5, #262626) and a header menu's (`--android-menu-band`: the text at 6%).
 */
export function androidGray(theme: Theme, role: "switchOff" | "checkboxRing" | "fieldLine" | "hint" | "popupGap" | "menuBand"): string {
  const dark = theme.scheme === "dark"
  switch (role) {
    case "switchOff":
      return dark ? theme.color("--gray-500") : "#A7ADB2"
    case "checkboxRing":
      return dark ? theme.color("--gray-500") : "#B0B9C2"
    case "fieldLine":
      return dark ? withAlpha(theme.colors.text, 0.24) : "#DBDBDB"
    case "hint":
      return dark ? "#7D7D7D" : "#A8A8A8"
    case "popupGap":
      return dark ? "#262626" : "#F5F5F5"
    case "menuBand":
      return withAlpha(theme.colors.text, 0.06)
  }
}

/**
 * Material's shadow elevations as CSS box shadows (the key and ambient shadows of the Material web components'
 * `--md-elevation-level`): level 2 is a menu, level 3 a snackbar.
 */
export const elevationShadow = {
  /**
   * A floating bar's shadow as a Pixel draws it, measured on Google Photos' floating bar: a soft spot shadow about
   * 10% dark at the lower edge that fades out over 4dp, and an ambient one about 3% dark around the rest. The web's
   * level tokens (a 30% key shadow 1px down) read as an outline on a light screen, not as Android's elevation.
   */
  floating: "0 1.5px 4px rgba(0, 0, 0, 0.15), 0 0 2px rgba(0, 0, 0, 0.06)",
  /**
   * A bar's control on its own (a circle, a capsule, the tab bar), as the Android look draws it, measured on its
   * bars: about 4% dark under the lower edge fading over 9dp, 3% at the sides over 7dp, 2% over the top over 3dp.
   */
  bar: "0 2px 8px rgba(0, 0, 0, 0.06)",
  /** The same over a dark screen, where a light shadow does not show: the controls stand apart by their fill. */
  barDark: "0 2px 8px rgba(0, 0, 0, 0.3)",
  level2: "0 2px 6px 2px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.3)",
  level3: "0 1px 3px rgba(0, 0, 0, 0.3), 0 4px 8px 3px rgba(0, 0, 0, 0.15)",
} as const

/** A color with its alpha multiplied: a state layer or a disabled container. */
export function withAlpha(color: string, alpha: number): string {
  // `#rrggbb(aa)`, `rgb()` or `rgba()`, with or without spaces; any other form is returned as it is
  const c = channels(color)
  return c ? `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${Math.round(c[3] * alpha * 1000) / 1000})` : color
}

/** The channels of a `#rrggbb(aa)` or `rgb(a)()` color, alpha 0–1; undefined for any other form. */
function channels(color: string): [number, number, number, number] | undefined {
  if (color.startsWith("#") && (color.length === 7 || color.length === 9)) {
    const a = color.length === 9 ? parseInt(color.slice(7, 9), 16) / 255 : 1
    return [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16), a]
  }
  const match = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(color)
  return match ? [Number(match[1]), Number(match[2]), Number(match[3]), match[4] != null ? Number(match[4]) : 1] : undefined
}

/**
 * `color` at `amount` over an opaque `base`, as one opaque color: a tone between the two that can be drawn twice
 * without darkening where it overlaps (a translucent fill would). Returns `color` when either cannot be read.
 */
export function mix(color: string, base: string, amount: number): string {
  const top = channels(color)
  const under = channels(base)
  if (!top || !under) return color
  const t = amount * top[3]
  const channel = (i: number) => Math.round(top[i] * t + under[i] * (1 - t))
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`
}

/**
 * The fill of a bar's control on Android, as it draws its circles, capsules and search field: the color of a
 * card on the screen, white over a light screen and a lighter tone over a dark one.
 */
export function barSurface(material: MaterialColors, scheme: "light" | "dark"): string {
  return scheme === "dark" ? material.surfaceContainerHigh : material.surfaceContainerLowest
}

/** The shadow under a bar's control on Android, by scheme. */
export function barShadow(scheme: "light" | "dark"): string {
  return scheme === "dark" ? elevationShadow.barDark : elevationShadow.bar
}
