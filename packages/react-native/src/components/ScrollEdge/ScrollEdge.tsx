import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { SoftBottomVeil, SoftTopEdge } from "../../internal/BarBackdrop"
import { useTheme } from "../../theme/ThemeProvider"

export type ScrollEdgeProps = {
  /** The screen edge it stands at: under the status bar (`top`) or at the bottom of the screen. @default "top" */
  edge?: "top" | "bottom"
  /** Content is under the edge. The top edge shows only then; the bottom one stays, as iOS draws it. */
  scrolled?: boolean
  /** The color of the screen it fades into (a grouped screen's canvas). @default the theme's background */
  canvasColor?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

/**
 * The soft scroll edge of a screen with no bar at that edge: content that scrolls up under the clock and the status
 * icons, or down to the screen's bottom, is muted there. On iOS it is iOS 27.2's soft edge of a bottom bar (as
 * TabBar's `fade`), turned over at the top: from the safe area's edge 34pt further in, a 10pt blur under a veil of
 * the screen's color that grows to 46% at the screen's edge. On Android the top edge is the soft edge of its top bar
 * over the status bar alone, the bottom one draws nothing. Lay it over the screen, after the scroll view.
 */
export function ScrollEdge({ edge = "top", scrolled = false, canvasColor, testID, style }: ScrollEdgeProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const canvas = canvasColor ?? theme.colors.background
  const top = edge === "top"
  if (top && !scrolled) return null
  if (theme.isAndroid) {
    if (!top) return null
    return (
      <View pointerEvents="none" testID={testID} style={[{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top }, style]}>
        <SoftTopEdge fill={canvas} blur={Platform.OS === "web" ? 6 : 0} />
      </View>
    )
  }
  // The safe area at that edge, or the height the style gives the top edge (a bar's row of buttons under the status
  // bar): the content is blurred in full down to it, and the veil and the blur ease out over the 34 past it
  const height = StyleSheet.flatten(style)?.height
  const reach = top && typeof height === "number" ? height + FULL_BLUR_SHORTFALL : insets.top
  return (
    <View
      pointerEvents="none"
      testID={testID}
      style={[{ position: "absolute", left: 0, right: 0 }, top ? { top: 0, height: insets.top } : { bottom: 0, height: insets.bottom }, style]}
    >
      {top ? <SoftBottomVeil fill={canvas} bottom={reach} /> : <SoftBottomVeil fill={canvas} top={0} />}
    </View>
  )
}

/** The veil's blur is full 6 short of the edge it is turned over at (12 to 40 into its 34): a given height adds them. */
const FULL_BLUR_SHORTFALL = 6
