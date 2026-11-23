import { Animated, Platform, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native"
import { useTheme } from "../theme/ThemeProvider"
import { blurModule, liquidGlassModule } from "./optional"
import { useReduceTransparency } from "./reduceTransparency"

export type GlassProps = ViewProps & {
  /** Corner radius of the glass. */
  radius?: number
  /** `"raised"` casts the deeper shadow of glass that stands over content (a menu, a toast). @default "regular" */
  elevation?: "regular" | "raised"
  /** Tints the glass, as the prominent bar button. */
  tint?: string
  /** Native glass reacts to touches (iOS 26 interactive glass). */
  interactive?: boolean
  /** A fill token for the glass instead of `--mobile-glass-background` (menus, alerts and toasts set their own). */
  fillToken?: string
  /**
   * A backdrop-filter token for the blur instead of the surface's own: the menu's, the toast's and the alert's fill
   * tokens bring theirs (`--menu-mobile-backdrop-filter` and so on), other glass `--mobile-glass-backdrop-filter`.
   */
  filterToken?: string
  /**
   * A box-shadow token instead of the surface's own: `--menu-shadow`, `--toast-mobile-shadow` and
   * `--dialog-alert-shadow` with their fill tokens, otherwise the glass shadow of `elevation`.
   */
  shadowToken?: string
  /** A blur radius in px in place of the filter token's, where the glass is drawn by a blur (the web, iOS before 26). */
  blur?: number
  style?: StyleProp<ViewStyle>
}

/** The filter and the shadow of the glass surfaces of the phone layer, by their fill (mobile-materials.css, touch.css). */
const SURFACES: Record<string, { filter: string; shadow: string }> = {
  "--menu-mobile-background": { filter: "--menu-mobile-backdrop-filter", shadow: "--menu-shadow" },
  "--toast-mobile-background": { filter: "--toast-mobile-backdrop-filter", shadow: "--toast-mobile-shadow" },
  "--dialog-alert-background": { filter: "--dialog-alert-backdrop-filter", shadow: "--dialog-alert-shadow" },
}

/**
 * expo-blur's intensity for a CSS blur radius: 5 per px, so the 12px of the bar glass keeps the 60 it was tuned at,
 * the menus' and toasts' 18px take 90 and the alert's 10px 50.
 */
const intensityOf = (radius: number) => Math.max(0, Math.min(100, Math.round(radius * 5)))

/**
 * The glass of iOS 26: native Liquid Glass on iOS 26 and later (expo-glass-effect), a blur under the fill of the
 * Plex UI phone layer elsewhere (`--mobile-glass-*` tokens and each surface's own filter and shadow). Where nothing
 * blurs (no expo-blur, Android) and with Reduce Transparency, the fill stands on an opaque elevated surface: a tint
 * over live content cannot be read (dark glass is white at 12%), and HIG materials turn opaque then. Material 3 has
 * no glass: on Android the components draw their tonal containers instead and do not use this.
 */
export function Glass({
  radius = 0,
  elevation = "regular",
  tint,
  interactive,
  fillToken,
  filterToken,
  shadowToken,
  blur,
  style,
  children,
  ...rest
}: GlassProps) {
  const theme = useTheme()
  const reduceTransparency = useReduceTransparency()
  const shape: ViewStyle = { borderRadius: radius, borderCurve: "continuous" }
  const surface = fillToken ? SURFACES[fillToken] : undefined
  const shadow = theme.token(shadowToken ?? surface?.shadow ?? (elevation === "raised" ? "--mobile-glass-shadow-raised" : "--mobile-glass-shadow"))
  const boxShadow = typeof shadow === "string" ? shadow : undefined
  const native = liquidGlassModule()
  // iOS 26's own glass turns frostier by itself with Reduce Transparency
  if (native) {
    const { GlassView } = native
    return (
      <GlassView
        {...rest}
        glassEffectStyle="regular"
        colorScheme={theme.scheme}
        tintColor={tint}
        isInteractive={interactive}
        style={[shape, style]}
      >
        {children}
      </GlassView>
    )
  }
  const fill = tint ?? theme.color(fillToken ?? "--mobile-glass-background")
  const filterValue = theme.token(filterToken ?? surface?.filter ?? "--mobile-glass-backdrop-filter")
  const filter = blur != null ? `blur(${blur}px)` : typeof filterValue === "string" ? filterValue : "blur(12px)"
  const web = Platform.OS === "web"
  const module = web || Platform.OS !== "ios" ? null : blurModule()
  const opaque = reduceTransparency || (!web && module == null)
  if (web && !opaque) {
    // An Animated.View, so a panel can move its own glass (a transform above the blur would stop it)
    return (
      <Animated.View
        {...rest}
        style={[shape, { backgroundColor: fill, boxShadow }, { backdropFilter: filter, WebkitBackdropFilter: filter } as ViewStyle, style]}
      >
        {children}
      </Animated.View>
    )
  }
  const radiusPx = Number(/blur\(\s*([\d.]+)px\s*\)/.exec(filter)?.[1] ?? 12)
  return (
    <View {...rest} style={[shape, { boxShadow }, style]}>
      <View style={[StyleSheet.absoluteFill, shape, { overflow: "hidden" }]} pointerEvents="none">
        {opaque ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.color("--mobile-surface-elevated-plain-primary", theme.colors.surfaceElevated) }]} />
        ) : module ? (
          <module.BlurView
            intensity={intensityOf(radiusPx)}
            tint={theme.scheme === "dark" ? "systemChromeMaterialDark" : "systemChromeMaterialLight"}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} />
      </View>
      {children}
    </View>
  )
}
