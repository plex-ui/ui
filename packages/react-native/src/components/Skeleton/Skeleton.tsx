import { useEffect, useRef, useState, type ComponentRef } from "react"
import { Animated, Easing, Platform, StyleSheet, useWindowDimensions, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native"
import { barSurface, withAlpha } from "../../theme/material"
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
 * between full and half opacity every 1.5s, and stands still with reduced motion, as @plexui/ui's Skeleton. Android
 * draws a shimmer: 4dp corners, the list selector's 6% (5% at night), and one light band that
 * moves down the screen across every block at once. Hidden from screen readers; say what loads on the container
 * (`accessibilityState={{ busy: true }}`).
 */
export function Skeleton(props: SkeletonProps) {
  const theme = useTheme()
  return theme.isAndroid ? <AndroidSkeleton {...props} /> : <IOSSkeleton {...props} />
}

function IOSSkeleton({ width = "100%", height = 16, circle = false, testID, style }: SkeletonProps) {
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

/**
 * Android's shimmer over a list: one gradient down the whole view, not one per block. The band is
 * 600dp tall, full strength in its middle fifth, and moves down at the view's height per 400ms, from 1200 above the
 * top to twice the height, then starts again (about 1.4s on a phone).
 */
const BAND = 600

/**
 * The one clock of every Android Skeleton: 0 to 1 over one pass of the band. Each block places the band by its own top
 * in the window, so the blocks on a screen light as parts of one gradient, as Android's do, though each is its own
 * view. It runs while a block shows it.
 */
const shimmer: { sweep?: Animated.Value; loop?: Animated.CompositeAnimation; duration: number; users: number } = { duration: 0, users: 0 }

function useShimmer(active: boolean, duration: number): Animated.Value {
  const [sweep] = useState(() => (shimmer.sweep ??= new Animated.Value(0)))
  useEffect(() => {
    if (!active) return
    shimmer.users += 1
    if (!shimmer.loop || shimmer.duration !== duration) {
      shimmer.loop?.stop()
      sweep.setValue(0)
      shimmer.duration = duration
      shimmer.loop = Animated.loop(Animated.timing(sweep, { toValue: 1, duration, easing: Easing.linear, isInteraction: false, useNativeDriver: Platform.OS !== "web" }))
      shimmer.loop.start()
    }
    return () => {
      shimmer.users -= 1
      if (shimmer.users > 0) return
      shimmer.loop?.stop()
      shimmer.loop = undefined
    }
  }, [active, duration, sweep])
  return sweep
}

function AndroidSkeleton({ width = "100%", height = 16, circle = false, testID, style }: SkeletonProps) {
  const theme = useTheme()
  const m = theme.material
  const screen = useWindowDimensions().height
  const ref = useRef<ComponentRef<typeof View>>(null)
  // The block's top in the window, where the shared band is placed from
  const [top, setTop] = useState<number | null>(null)
  const moving = !theme.reducedMotion && top != null && screen > 0
  const sweep = useShimmer(moving, Math.round((400 * (2 * screen + 2 * BAND)) / Math.max(1, screen)))
  const size = typeof height === "number" ? height : 16
  // The block is the list selector (6% ink, 5% white at night); the band's middle the popup's color (white, a lighter
  // gray at night), its edges clear
  const light = barSurface(m, theme.scheme)
  return (
    <View
      ref={ref}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      testID={testID}
      onLayout={() => ref.current?.measureInWindow((_x, y) => setTop((old) => (old === y ? old : y)))}
      style={[
        {
          width: circle && width === "100%" ? height : width,
          height,
          borderRadius: circle ? size / 2 : 4,
          backgroundColor: withAlpha(m.onSurface, theme.scheme === "dark" ? 0.05 : 0.06),
          overflow: "hidden",
        },
        style,
      ]}
    >
      {moving ? (
        <Animated.View
          style={[
            styles.band,
            {
              backgroundImage: `linear-gradient(180deg, ${withAlpha(light, 0)} 0%, ${light} 40%, ${light} 60%, ${withAlpha(light, 0)} 100%)`,
              transform: [{ translateY: sweep.interpolate({ inputRange: [0, 1], outputRange: [-2 * BAND - top, 2 * screen - top] }) }],
            },
          ]}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  band: { position: "absolute", top: 0, start: 0, end: 0, height: BAND },
})
