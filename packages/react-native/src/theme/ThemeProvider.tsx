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
   * @default "primary" on iOS, "accent" on Android (as the web's Android look)
   */
  selectionColor?: SelectionColor
  /**
   * The product's brand: colors, faces and radii over the Plex UI defaults. A nested ThemeProvider keeps its
   * parent's brand and lays its own over it.
   */
  brand?: BrandTheme
  /**
   * Faces of the kit (a nested ThemeProvider takes its parent's). Without them the platform's own face is used; see
   * `interFonts` and `robotoFonts`. Faces per drawn platform, `{ ios, android }`, take the one of `platform`: the
   * Material 3 look in a browser on a Mac would otherwise draw in SF, the browser's system face, not Roboto.
   */
  fonts?: FontFamilies | PlatformFonts
  /**
   * The width the phone layer is laid out for, in place of the window's: a phone drawn in a frame inside a wider window
   * (a gallery, a review page) sets the frame's width, 402 for an iPhone 17 Pro.
   */
  viewportWidth?: number
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

/**
 * The family names `@expo-google-fonts/roboto` registers, for `fonts`: the face of Material 3. An Android device has
 * Roboto as its system face already; the web needs it loaded, for the Android look in a browser.
 *
 * ```tsx
 * const [loaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_600SemiBold, Roboto_700Bold })
 * <ThemeProvider platform={platform} fonts={{ android: robotoFonts }}>
 * ```
 */
export const robotoFonts: FontFamilies = {
  sans: { regular: "Roboto_400Regular", medium: "Roboto_500Medium", semibold: "Roboto_600SemiBold", bold: "Roboto_700Bold" },
}

/** Faces for each drawn platform: iOS (the system face when left out) and Android. */
export type PlatformFonts = { ios?: FontFamilies; android?: FontFamilies }

const isPlatformFonts = (fonts: FontFamilies | PlatformFonts): fonts is PlatformFonts => "ios" in fonts || "android" in fonts

const ThemeContext = createContext<Theme | null>(null)

/** What a ThemeProvider was given, for a ThemeProvider nested in it to start from. */
type ThemeSettings = {
  scheme: ColorScheme | "system"
  platform: PlatformStyle
  selectionColor: SelectionColor | undefined
  overrides: Record<string, string> | undefined
  fonts: FontFamilies | undefined
  viewportWidth: number | undefined
}
const ThemeSettingsContext = createContext<ThemeSettings | null>(null)

// On the web (react-native-web) a family the app sets (Inter's variable font in the docs) takes the Plex UI tokens' SF
// strokes, Medium 510 and Semibold 590 (touch.css); a device's system font takes the named weights
const WEIGHTS: Record<FontWeightName, TextStyle["fontWeight"]> =
  Platform.OS === "web"
    ? { regular: "400", medium: "510" as TextStyle["fontWeight"], semibold: "590" as TextStyle["fontWeight"], bold: "700" }
    : { regular: "400", medium: "500", semibold: "600", bold: "700" }
// The web's system font (react-native-web's own stack, no family set): Chromium draws 501–549 of it as a synthesized bold,
// heavier than 590, so Medium is 500 there; 590 is SF's own Semibold, as an iPhone draws it
const SYSTEM_WEIGHTS: Record<FontWeightName, TextStyle["fontWeight"]> =
  Platform.OS === "web" ? { ...WEIGHTS, medium: "500" } : WEIGHTS

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
  return family ? { fontFamily: family, fontWeight: WEIGHTS[weight] } : { fontWeight: SYSTEM_WEIGHTS[weight] }
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
    textSuccess: color("--color-text-success"),
    accent: color("--color-accent"),
    success: color("--color-background-success-solid"),
    onSuccess: color("--color-text-success-solid"),
    danger: color("--color-background-danger-solid"),
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
export function ThemeProvider({ scheme, platform, selectionColor, brand, fonts: fontsProp, viewportWidth, children }: ThemeProviderProps) {
  // A nested provider starts from its parent: a dark sheet on a light page keeps the page's platform, brand and faces
  const parent = useContext(ThemeSettingsContext)
  const system = useColorScheme()
  const wantedScheme = scheme ?? parent?.scheme ?? "system"
  const resolvedScheme: ColorScheme = wantedScheme === "system" ? (system === "dark" ? "dark" : "light") : wantedScheme
  const window = useWindowDimensions()
  const width = viewportWidth ?? parent?.viewportWidth ?? window.width
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
  const resolvedPlatform = platform ?? parent?.platform ?? defaultPlatform()
  const fonts = fontsProp && isPlatformFonts(fontsProp) ? (fontsProp[resolvedPlatform] ?? null) : fontsProp
  // `null`: faces per platform that leave this platform out draw the system face, not the parent's
  const faces = brand?.fonts ?? (fonts === null ? undefined : (fonts ?? parent?.fonts))
  const facesKey = JSON.stringify(faces ?? null)
  // The color a provider was given (or its parent's); unset, iOS takes the ink and Android its accent
  const chosenSelection = selectionColor ?? parent?.selectionColor
  const selection: SelectionColor = chosenSelection ?? (resolvedPlatform === "android" ? "accent" : "primary")
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
    () => ({
      scheme: wantedScheme,
      platform: resolvedPlatform,
      selectionColor: chosenSelection,
      overrides: JSON.parse(overridesKey) ?? undefined,
      fonts: JSON.parse(facesKey) ?? undefined,
      viewportWidth: viewportWidth ?? parent?.viewportWidth,
    }),
    [wantedScheme, resolvedPlatform, chosenSelection, overridesKey, facesKey, viewportWidth, parent?.viewportWidth],
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
