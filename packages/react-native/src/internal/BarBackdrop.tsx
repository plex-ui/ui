import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { useTheme } from "../theme/ThemeProvider"
import { blurModule } from "./optional"

/**
 * The background of a bar over scrolled content: a fill (a veil of the canvas, or an opaque one) with the content
 * blurred under it where the platform can (a backdrop filter on the web, expo-blur on iOS), and a hairline toward
 * the content.
 */
export function BarBackdrop({
  fill,
  blur = 0,
  line,
  edge,
  style,
}: {
  fill: string
  blur?: number
  line?: string
  edge: "top" | "bottom"
  style?: StyleProp<ViewStyle>
}) {
  const theme = useTheme()
  const hairline: ViewStyle | null = line
    ? edge === "bottom"
      ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: line }
      : { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: line }
    : null
  if (Platform.OS === "web") {
    const filter = blur ? `blur(${blur}px) saturate(180%)` : undefined
    return (
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: fill }, hairline, filter ? ({ backdropFilter: filter, WebkitBackdropFilter: filter } as ViewStyle) : null, style]}
      />
    )
  }
  const module = blur && theme.isIOS ? blurModule() : null
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, hairline, style]}>
      {module ? <module.BlurView intensity={40} tint={theme.scheme === "dark" ? "dark" : "light"} style={StyleSheet.absoluteFill} /> : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: fill }]} />
    </View>
  )
}
