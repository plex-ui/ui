import { Platform, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native"
import { useTheme } from "../theme/ThemeProvider"
import { blurModule, liquidGlassModule } from "./optional"

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
  /** Blur radius in px where the glass is drawn by a blur (the web, iOS before 26). @default 12 */
  blur?: number
  style?: StyleProp<ViewStyle>
}

/**
 * The glass of iOS 26: native Liquid Glass on iOS 26 and later (expo-glass-effect), a blur under the fill of the
 * Plex UI phone layer elsewhere (`--mobile-glass-*` tokens: fill, rim, edge and shadow). Material 3 has no glass:
 * on Android the components draw their tonal containers instead and do not use this.
 */
export function Glass({ radius = 0, elevation = "regular", tint, interactive, fillToken, blur = 12, style, children, ...rest }: GlassProps) {
  const theme = useTheme()
  const shape: ViewStyle = { borderRadius: radius, borderCurve: "continuous" }
  const shadowToken = elevation === "raised" ? "--mobile-glass-shadow-raised" : "--mobile-glass-shadow"
  const shadow = theme.token(shadowToken)
  const native = liquidGlassModule()
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
  const boxShadow = typeof shadow === "string" ? shadow : undefined
  if (Platform.OS === "web") {
    const filter = `blur(${blur}px) saturate(180%)`
    return (
      <View
        {...rest}
        style={[shape, { backgroundColor: fill, boxShadow }, { backdropFilter: filter, WebkitBackdropFilter: filter } as ViewStyle, style]}
      >
        {children}
      </View>
    )
  }
  const module = blurModule()
  return (
    <View {...rest} style={[shape, { boxShadow }, style]}>
      <View style={[StyleSheet.absoluteFill, shape, { overflow: "hidden" }]} pointerEvents="none">
        {module ? <module.BlurView intensity={60} tint={theme.scheme === "dark" ? "systemChromeMaterialDark" : "systemChromeMaterialLight"} style={StyleSheet.absoluteFill} /> : null}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} />
      </View>
      {children}
    </View>
  )
}
