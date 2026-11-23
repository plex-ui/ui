import { createTokenResolver, tokenLayers, type TokenResolver, type TokenContext } from "@plexui/styles/tokens"
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { AccessibilityInfo, PixelRatio, Platform, type TextStyle, useColorScheme, useWindowDimensions } from "react-native"
import { normalizeCssColor } from "./cssColor"
import { materialColors } from "./material"
import type { BrandTheme, ColorScheme, FontFamilies, FontWeightName, PlatformStyle, SelectionColor, Theme, ThemeColors } from "./types"

export type ThemeProviderProps = {
  /** `"system"` follows the device. A nested ThemeProvider takes its parent's. @default "system" */
  scheme?: ColorScheme | "system"
  /**
   * The interface the components draw: iOS 26 or Material 3. Defaults to the parent ThemeProvider's, else to the
   * device (`Platform.OS`); a browser (react-native-web) draws iOS unless told otherwise, so a web demo of an app can
   * switch between the two.
   */
  platform?: PlatformStyle
  /**
   * The on color of every Switch, Checkbox and RadioGroup (and a Select's choices) that sets none of its own.
   * `"primary"` is the Plex primary, the ink, as on the web. `"accent"` is each platform's own: on iOS a switch turns
   * the system green and a checkbox or a checkmark the accent, the iOS tint; on Android all of them take the accent.
   * Pass `Platform.select` for a different one per platform. A nested ThemeProvider takes its parent's.
   * @default "primary"
   */
  selectionColor?: SelectionColor
  /**
   * The product's brand: colors, faces and radii over the Plex UI defaults. A nested ThemeProvider keeps its
   * parent's brand and lays its own over it.
   */
  brand?: BrandTheme
  /** Faces of the kit (a nested ThemeProvider takes its parent's). Without them the platform's own face is used; see `interFonts`. */
  fonts?: FontFamilies
  children?: ReactNode
}

/**
 * The family names `@expo-google-fonts/inter` registers, for `fonts`: Inter is the face of Plex UI on every platform.
 *
 * ```tsx
 * const [loaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold })
 * <ThemeProvider fonts={interFonts}>
 * ```
 */
export const interFonts: FontFamilies = {
  sans: { regular: "Inter_400Regular", medium: "Inter_500Medium", semibold: "Inter_600SemiBold", bold: "Inter_700Bold" },
}

const ThemeContext = createContext<Theme | null>(null)

/** What a ThemeProvider was given, for a ThemeProvider nested in it to start from. */
type ThemeSettings = {
  scheme: ColorScheme | "system"
  platform: PlatformStyle
  selectionColor: SelectionColor
  overrides: Record<string, string> | undefined; fonts: FontFamilies | undefined }
const ThemeSettingsContext = createContext<ThemeSettings | null>(null)

// On the web (react-native-web) the type is Inter's variable font, which the Plex UI tokens set at SF's own Medium and
// Semibold strokes, 510 and 590 (touch.css); a device's system font takes the named weights
const WEIGHTS: Record<FontWeightName, TextStyle["fontWeight"]> =
  Platform.OS === "web"
    ? { regular: "400", medium: "510" as TextStyle["fontWeight"], semibold: "590" as TextStyle["fontWeight"], bold: "700" }
    : { regular: "400", medium: "500", semibold: "600", bold: "700" }

/** The platform a ThemeProvider draws by default. */
export function defaultPlatform(): PlatformStyle {
  return Platform.OS === "android" ? "android" : "ios"
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    let active = true
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((value) => active && setReduced(value))
      .catch(() => {})
    const subscription = AccessibilityInfo.addEventListener?.("reduceMotionChanged", setReduced)
    return () => {
      active = false
      subscription?.remove()
    }
  }, [])
  return reduced
}

function brandOverrides(brand: BrandTheme | undefined): Record<string, string> | undefined {
  if (!brand) return undefined
  const out: Record<string, string> = {}
  // Colors in a syntax the resolver does not read (hsl(), oklch(), a name) are written as hex or rgba first
  for (const [name, value] of Object.entries(brand.colors ?? {})) {
    if (value === undefined) continue
    out[name === "accent" ? "--color-accent" : name.startsWith("--") ? name : `--${name}`] = normalizeCssColor(value)
  }
  for (const [name, value] of Object.entries(brand.radius ?? {})) {
    if (value !== undefined) out[`--radius-${name}`] = `${value}px`
  }
  for (const [name, value] of Object.entries(brand.tokens ?? {})) out[name] = normalizeCssColor(value)
  return Object.keys(out).length ? out : undefined
}

const isDev = () => typeof __DEV__ !== "undefined" && __DEV__

/** In development, a brand color that resolves to no color is named, rather than drawn as transparent. */
function warnUnresolvedColors(brand: BrandTheme | undefined, resolver: TokenResolver) {
  if (!brand?.colors || !isDev()) return
  for (const [name, value] of Object.entries(brand.colors)) {
    if (value === undefined) continue
    const token = name === "accent" ? "--color-accent" : name.startsWith("--") ? name : `--${name}`
    const resolved = [resolver.get(token, "light"), resolver.get(token, "dark")]
    if (resolved.some((color) => typeof color !== "string" || !(color.startsWith("#") || color.startsWith("rgba")))) {
      console.warn(`@plexui/react-native: the brand color ${name} (${JSON.stringify(value)}) does not resolve to a color; it draws as transparent.`)
    }
  }
}

function fontFor(fonts: FontFamilies | undefined, weight: FontWeightName) {
  const sans = fonts?.sans
  if (typeof sans === "string") return { fontFamily: sans, fontWeight: WEIGHTS[weight] }
  const family = sans?.[weight] ?? (weight === "semibold" ? sans?.bold : undefined) ?? sans?.regular
  // A family per weight carries its weight: a weight on top would be synthesized on Android
  if (family && sans?.[weight]) return { fontFamily: family }
  return family ? { fontFamily: family, fontWeight: WEIGHTS[weight] } : { fontWeight: WEIGHTS[weight] }
}

/** Builds a theme for a scheme and a platform (ThemeProvider does it for its children). */
export function createTheme(options: {
  resolver: TokenResolver
  scheme: ColorScheme
  platform: PlatformStyle
  fonts?: FontFamilies
  reducedMotion?: boolean
  selectionColor?: SelectionColor
}): Theme {
  const { resolver, scheme, platform, fonts, reducedMotion = false, selectionColor = "primary" } = options
  const token = (name: string) => resolver.get(name, scheme)
  const color = (name: string, fallback = "transparent") => {
    const value = token(name)
    return typeof value === "string" && (value.startsWith("#") || value.startsWith("rgba")) ? value : fallback
  }
  const length = (name: string, fallback = 0) => {
    const value = token(name)
    return typeof value === "number" ? value : fallback
  }
  const trackingCache = new Map<number, number>()
  const theme: Theme = {
    scheme,
    platform,
    isIOS: platform === "ios",
    isAndroid: platform === "android",
    selectionColor,
    reducedMotion,
    token,
    color,
    length,
    duration: (name, fallback = 0) => {
      const value = token(name)
      return typeof value === "number" ? value : fallback
    },
    value: (css) => resolver.value(css, scheme),
    tracking(fontSize) {
      let value = trackingCache.get(fontSize)
      if (value === undefined) {
        const resolved = resolver.at("--font-sans-tracking", scheme, fontSize)
        value = typeof resolved === "number" ? resolved : 0
        trackingCache.set(fontSize, value)
      }
      return value
    },
    font: (weight) => fontFor(fonts, weight),
    monoFont: fonts?.mono ? { fontFamily: fonts.mono } : { fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) },
    colors: {} as ThemeColors,
    material: materialColors((css) => {
      const value = resolver.value(css, scheme)
      return typeof value === "string" ? value : "transparent"
    }, scheme),
  }
  theme.colors = {
    text: color("--color-text"),
    textSecondary: color("--color-text-secondary"),
    textTertiary: color("--color-text-tertiary"),
    textDisabled: color("--color-text-disabled", color("--color-text-tertiary")),
    textInverse: color("--color-text-inverse"),
    textAccent: color("--color-text-accent"),
    textDanger: color("--color-text-danger"),
    accent: color("--color-accent"),
    background: color("--mobile-surface-plain-primary", color("--color-surface")),
    groupedBackground: color("--mobile-surface-grouped-primary", color("--color-surface-secondary")),
    groupedSurface: color("--mobile-surface-grouped-secondary", color("--color-surface")),
    surface: color("--color-surface"),
    surfaceSecondary: color("--color-surface-secondary"),
    surfaceElevated: color("--color-surface-elevated"),
    border: color("--color-border"),
    borderSubtle: color("--color-border-subtle"),
    borderStrong: color("--color-border-strong"),
    separator: color("--color-border"),
    labelSecondary: color("--mobile-label-secondary", color("--color-text-secondary")),
    labelTertiary: color("--mobile-label-tertiary", color("--color-text-tertiary")),
    labelQuaternary: color("--mobile-label-quaternary", color("--color-text-tertiary")),
  }
  return theme
}

/**
 * Gives its children the Plex UI theme: tokens resolved from @plexui/styles for the scheme, the brand and a phone,
 * and the platform the components draw. Nest one to theme a part of a screen (a dark sheet on a light page).
 */
export function ThemeProvider({ scheme, platform, selectionColor, brand, fonts, children }: ThemeProviderProps) {
  // A nested provider starts from its parent: a dark sheet on a light page keeps the page's platform, brand and faces
  const parent = useContext(ThemeSettingsContext)
  const system = useColorScheme()
  const wantedScheme = scheme ?? parent?.scheme ?? "system"
  const resolvedScheme: ColorScheme = wantedScheme === "system" ? (system === "dark" ? "dark" : "light") : wantedScheme
  const { width } = useWindowDimensions()
  const reducedMotion = useReducedMotion()
  // The phone layers of the CSS apply up to 767px: a tablet keeps the touch sizes. Only the bands of the CSS matter.
  const band = width >= 414 ? 414 : 393
  const highDensity = PixelRatio.get() >= 1.5
  const own = brandOverrides(brand)
  const overrides = parent?.overrides || own ? { ...parent?.overrides, ...own } : undefined
  const overridesKey = JSON.stringify(overrides ?? null)
  const resolver = useMemo(() => {
    const context: TokenContext = { width: band, highDensity, reducedMotion }
    return createTokenResolver(tokenLayers, context, JSON.parse(overridesKey) ?? undefined)
  }, [band, highDensity, reducedMotion, overridesKey])
  const brandKey = JSON.stringify(brand?.colors ?? null)
  useEffect(() => {
    warnUnresolvedColors(JSON.parse(brandKey) === null ? undefined : { colors: JSON.parse(brandKey) }, resolver)
  }, [brandKey, resolver])
  const faces = brand?.fonts ?? fonts ?? parent?.fonts
  const facesKey = JSON.stringify(faces ?? null)
  const resolvedPlatform = platform ?? parent?.platform ?? defaultPlatform()
  const selection = selectionColor ?? parent?.selectionColor ?? "primary"
  const theme = useMemo(
    () =>
      createTheme({
        resolver,
        scheme: resolvedScheme,
        platform: resolvedPlatform,
        fonts: JSON.parse(facesKey) ?? undefined,
        reducedMotion,
        selectionColor: selection,
      }),
    [resolver, resolvedScheme, resolvedPlatform, facesKey, reducedMotion, selection],
  )
  const settings = useMemo<ThemeSettings>(
    () => ({ scheme: wantedScheme, platform: resolvedPlatform, selectionColor: selection, overrides: JSON.parse(overridesKey) ?? undefined, fonts: JSON.parse(facesKey) ?? undefined }),
    [wantedScheme, resolvedPlatform, selection, overridesKey, facesKey],
  )
  return (
    <ThemeSettingsContext.Provider value={settings}>
      <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
    </ThemeSettingsContext.Provider>
  )
}

let fallbackTheme: Theme | undefined

/** The light theme of the device's platform, for a component outside any ThemeProvider. */
function defaultTheme(): Theme {
  fallbackTheme ??= createTheme({
    resolver: createTokenResolver(tokenLayers, { width: 393, highDensity: true, reducedMotion: false }),
    scheme: "light",
    platform: defaultPlatform(),
  })
  return fallbackTheme
}

/** The theme of the nearest ThemeProvider (the light default of the device's platform without one). */
export function useTheme(): Theme {
  return useContext(ThemeContext) ?? defaultTheme()
}
