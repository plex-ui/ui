import type { ReactNode } from "react"
import { Animated, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { SoftBottomVeil, SoftTopEdge, SoftTopVeil, TOP_EDGE_TAIL, TOP_EDGE_WHOLE } from "../../internal/BarBackdrop"
import { normalizeCssColor } from "../../theme/cssColor"
import { withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"

export type ScrollEdgeProps = {
  /** The screen edge it stands at: under the status bar (`top`) or at the bottom of the screen. @default "top" */
  edge?: "top" | "bottom"
  /** Content is under the edge. The top edge shows only then; the bottom one stays, as iOS draws it. */
  scrolled?: boolean
  /** The color of the screen it fades into (a grouped screen's canvas). @default the theme's background */
  canvasColor?: string
  /**
   * Top edge under a floating row (filters, tabs): where the fade ends, from the screen's top. Only what went under the
   * row is muted, the content below it stays sharp: pass the row's bottom. The edge is then iOS's soft edge 34pt short
   * of it. On Android, too, the edge then is the row's (iOS 27.2's), not the status bar's alone. A height in `style`
   * instead: the content is blurred in full down to that height, and eases out over the 48 below it.
   */
  fadeEnd?: number
  /**
   * `soft`: iOS 27.2's soft edge, a blur under a veil of the screen's color. `fade`: the screen's color alone, with no
   * blur, as TabBar's `fade` turned over: 85% in full down to the middle of the row's 44pt controls (26 above its
   * bottom), then easing out to nothing 32 below it, about half at the row's bottom; the same on iOS and Android.
   * Under a row of filters over photos, where a blur would turn them to a smudge. @default "soft"
   */
  background?: "soft" | "fade"
  /**
   * The edge's strength, 0 to 1, tied to the scroll: iOS shows it over the first 32 or so of a scroll. Pass the scroll's
   * offset interpolated, `scrollY.interpolate({ inputRange: [0, 32], outputRange: [0, 1], extrapolate: "clamp" })`;
   * the top edge then stands whatever `scrolled` says.
   */
  progress?: Animated.Value | Animated.AnimatedInterpolation<number>
  testID?: string
  style?: StyleProp<ViewStyle>
}

/**
 * The soft scroll edge of a screen with no bar at that edge: content that scrolls up under the clock and the status
 * icons, or down to the screen's bottom, is muted there. On iOS the top edge is iOS 27.2's own (a scroll view's soft
 * top edge, measured): from the screen's edge to 34pt past the status bar, the content lightly softened under a haze
 * of it blurred wide (σ 30, about half of what shows at the edge) and a veil of the screen's color, 49% in light and
 * 59% in dark at the edge, all easing out over the same span; native draws the veil alone. The bottom edge
 * is the soft edge of a bottom bar: a 10pt blur under a veil that grows to 46% at the screen's edge. On Android the top
 * edge is the soft edge of its top bar over the status bar alone, the bottom one draws nothing. Lay it over the
 * screen, after the scroll view.
 */
export function ScrollEdge({ edge = "top", scrolled: scrolledProp = false, canvasColor, fadeEnd, background = "soft", progress, testID, style }: ScrollEdgeProps): ReactNode {
  const theme = useTheme()
  // With a progress the edge's strength follows the scroll; it is set on each layer, as an ancestor's opacity would
  // cut a blur off the content it blurs
  const scrolled = progress != null || scrolledProp
  const insets = useSafeAreaInsets()
  // A named or hsl() color given as rgb, so the fade's stops can take their alpha
  const canvas = normalizeCssColor(canvasColor ?? theme.colors.background)
  const top = edge === "top"
  if (top && !scrolled) return null
  const height = StyleSheet.flatten(style)?.height
  if (background === "fade") {
    // The row's bottom (from the screen's edge): a fade's end, a height given, or the safe area alone
    const rowEnd = fadeEnd ?? (typeof height === "number" ? height : top ? insets.top : insets.bottom)
    const full = Math.max(0, rowEnd - FADE_ABOVE_ROW_END)
    const span = rowEnd + FADE_BELOW_ROW_END - full
    const stops = [`${withAlpha(canvas, FADE_ALPHA)} ${full}px`]
    for (let step = 1; step <= FADE_STEPS; step++) {
      const t = step / FADE_STEPS
      // smoothstep: no step where the full color ends, no line where it fades out
      const eased = t * t * (3 - 2 * t)
      stops.push(`${withAlpha(canvas, +(FADE_ALPHA * (1 - eased)).toFixed(4))} ${+(full + span * t).toFixed(2)}px`)
    }
    const gradient = `linear-gradient(${top ? "to bottom" : "to top"}, ${stops.join(", ")})`
    return (
      <Animated.View
        pointerEvents="none"
        testID={testID}
        style={[
          { position: "absolute", left: 0, right: 0, height: rowEnd + FADE_BELOW_ROW_END, backgroundImage: gradient } as ViewStyle,
          top ? { top: 0 } : { bottom: 0 },
          style,
          { height: rowEnd + FADE_BELOW_ROW_END },
          progress != null ? { opacity: progress } : null,
        ]}
      />
    )
  }
  // A row under the status bar (a height or a fade's end given): Android takes iOS's edge for it, as a row over
  // content reads on neither platform under the status bar's edge alone
  const row = top && (fadeEnd != null || typeof height === "number")
  if (theme.isAndroid && !row) {
    if (!top) return null
    return (
      <View pointerEvents="none" testID={testID} style={[{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top }, style]}>
        <SoftTopEdge fill={canvas} blur={Platform.OS === "web" ? 6 : 0} opacity={progress} />
      </View>
    )
  }
  // The top edge's line: the status bar's bottom, or under a row, 14 below the height the style gives it (the content
  // is blurred in full down to that height) or 34 above a fade's end (the content under it shows clear)
  const line = fadeEnd != null ? fadeEnd - TOP_EDGE_TAIL : typeof height === "number" ? height + TOP_EDGE_WHOLE : insets.top
  return (
    <View
      pointerEvents="none"
      testID={testID}
      style={[{ position: "absolute", left: 0, right: 0 }, top ? { top: 0, height: fadeEnd ?? insets.top } : { bottom: 0, height: insets.bottom }, style]}
    >
      {top ? <SoftTopVeil fill={canvas} edge={line} opacity={progress} /> : <SoftBottomVeil fill={canvas} top={0} opacity={progress} />}
    </View>
  )
}

/** `fade`: the color's strength, TabBar's fade at full */
const FADE_ALPHA = 0.85
/** `fade`: the full color ends at the middle of the row's 44pt controls, 26 above its bottom (22 and a little more) */
const FADE_ABOVE_ROW_END = 26
/** `fade`: the color is gone 32 past the row's bottom */
const FADE_BELOW_ROW_END = 32
/** `fade`: the steps of its curve */
const FADE_STEPS = 12
