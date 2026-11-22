import { useEffect, useState } from "react"
import { Animated, Easing, Platform, type DimensionValue, type StyleProp, type ViewStyle } from "react-native"
import { useTheme } from "../../theme/ThemeProvider"

export type SkeletonProps = {
  width?: DimensionValue
  height?: DimensionValue
  /** A circle (an avatar's place). */
  circle?: boolean
  testID?: string
  style?: StyleProp<ViewStyle>
}

/**
 * The place of content still loading: a block of `--skeleton-background` with `--skeleton-radius` that pulses
 * between full and half opacity every 1.5s, and stands still with reduced motion, as @plexui/ui's Skeleton. Hidden
 * from screen readers; say what loads on the container (`accessibilityState={{ busy: true }}`).
 */
export function Skeleton({ width = "100%", height = 16, circle = false, testID, style }: SkeletonProps) {
  const theme = useTheme()
  const [pulse] = useState(() => new Animated.Value(1))
  useEffect(() => {
    if (theme.reducedMotion) {
      pulse.setValue(1)
      return
    }
    const half = (toValue: number) => Animated.timing(pulse, { toValue, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== "web" })
    const loop = Animated.loop(Animated.sequence([half(0.5), half(1)]))
    loop.start()
    return () => loop.stop()
  }, [pulse, theme.reducedMotion])
  const size = typeof height === "number" ? height : 16
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
      style={[
        {
          width: circle && width === "100%" ? height : width,
          height,
          borderRadius: circle ? size / 2 : theme.length("--skeleton-radius", 8),
          backgroundColor: theme.color("--skeleton-background"),
          opacity: pulse,
        },
        style,
      ]}
    />
  )
}
