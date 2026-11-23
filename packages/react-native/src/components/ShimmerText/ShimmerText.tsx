import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { Animated, Easing, Platform, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native"
import { cssEase, nativeDriver } from "../../internal/transition"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { Text, type TextProps } from "../Text/Text"

type Element = "p" | "span" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "div"

export type ShimmerTextProps = Omit<TextProps, "children" | "style"> & {
  /** The element it stands for: `h1` to `h6` are read as a heading of that level. @default "div" */
  as?: Element
  children: ReactNode
  /** The style of the text. */
  style?: TextProps["style"]
  /** The style of the box around the text. */
  containerStyle?: StyleProp<ViewStyle>
}

export type ShimmerableTextProps = ShimmerTextProps & {
  /** Whether the shimmer animation is active. Turned off, it finishes its sweep and stops. @default false */
  shimmer?: boolean
}

/** The band is drawn in slices, each a copy of the text at its share of the highlight, as the web's gradient is. */
const SLICES = 16

/**
 * The sweep. iOS, as the web's: a band half the text's width, the text color to the highlight and back, goes from
 * just before the text to past it in 70% of 3s (ease) and rests for the rest; the first after 0.6s. Android, the Plex
 * Android look's flicker: a 160dp band crosses the text and twice its width in 1200ms, linear, and rests 240ms.
 */
function sweepOf(theme: Theme, width: number) {
  if (theme.isAndroid) {
    const band = 160
    return { band, from: -band, to: width + band, period: 1440, pass: 1200, delay: 0, easing: Easing.linear }
  }
  const band = width / 2
  return { band, from: -band, to: 1.25 * width, period: 3000, pass: 2100, delay: 600, easing: cssEase }
}

/**
 * Text with a shimmer for loading and in-progress states, as @plexui/ui's ShimmerText: a light band sweeps across it,
 * over and over. It takes the props of `Text` for its type and color. With reduced motion it is plain text.
 */
export function ShimmerText(props: ShimmerTextProps) {
  return <ShimmerableText {...props} shimmer />
}

/**
 * Text whose shimmer turns on and off, as @plexui/ui's ShimmerableText: with `shimmer` on it sweeps as ShimmerText;
 * turned off, it finishes the current sweep and then stops, with no abrupt cut.
 */
export function ShimmerableText({ as = "div", shimmer = false, children, style, containerStyle, ...text }: ShimmerableTextProps) {
  const theme = useTheme()
  const [width, setWidth] = useState(0)
  const [height, setHeight] = useState(0)
  const [running, setRunning] = useState(shimmer && !theme.reducedMotion)
  const wanted = useRef(shimmer)
  useLayoutEffect(() => {
    wanted.current = shimmer
  })
  const [clock] = useState(() => new Animated.Value(0))
  const sweep = sweepOf(theme, width)

  // On: run at once. Off: the running sweep ends its turn, then stops (with reduced motion at once)
  if (shimmer && !running && !theme.reducedMotion) setRunning(true)
  if (running && theme.reducedMotion) setRunning(false)

  useEffect(() => {
    if (!running || width <= 0) return
    let animation: Animated.CompositeAnimation | null = null
    let cancelled = false
    const turn = () => {
      clock.setValue(0)
      animation = Animated.timing(clock, { toValue: sweep.period, duration: sweep.period, easing: Easing.linear, useNativeDriver: nativeDriver, isInteraction: false })
      animation.start(({ finished }) => {
        if (!finished || cancelled) return
        if (wanted.current) turn()
        else setRunning(false)
      })
    }
    clock.setValue(0)
    const timer = setTimeout(turn, sweep.delay)
    return () => {
      cancelled = true
      clearTimeout(timer)
      animation?.stop()
    }
  }, [running, width, sweep.period, sweep.delay, clock])

  const onLayout = (event: LayoutChangeEvent) => {
    const { width: w, height: h } = event.nativeEvent.layout
    setWidth((old) => (old === w ? old : w))
    setHeight((old) => (old === h ? old : h))
  }

  const level = /^h([1-6])$/.exec(as)?.[1]
  const heading = level ? { accessibilityRole: "header" as const, ...(Platform.OS === "web" ? { "aria-level": Number(level) } : null) } : null
  const highlight = theme.value("light-dark(var(--gray-200), var(--gray-900))")
  const highlightColor = typeof highlight === "string" ? highlight : theme.color(theme.scheme === "dark" ? "--gray-900" : "--gray-200")
  const slice = sweep.band / SLICES
  const x = clock.interpolate({ inputRange: [0, sweep.pass, sweep.period], outputRange: [sweep.from, sweep.to, sweep.to], easing: sweep.easing })
  // react-native-web reports the layout in whole pixels: a copy that narrow would wrap a line 193.1 wide, so it takes one more
  const copyWidth = Platform.OS === "web" ? width + 1 : width

  return (
    <View onLayout={onLayout} style={containerStyle}>
      <Text {...heading} {...text} style={style}>
        {children}
      </Text>
      {running && width > 0 ? (
        <Animated.View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
          style={[styles.band, { width: sweep.band, height, transform: [{ translateX: x }] }]}
        >
          {Array.from({ length: SLICES }, (_, index) => {
            // The gradient's share of the highlight at the slice's middle: none at the edges, all of it at the center
            const share = 1 - Math.abs((2 * (index + 0.5)) / SLICES - 1)
            return (
              <View key={index} style={[styles.slice, { left: index * slice, width: slice + 0.5, height, opacity: share }]}>
                <Animated.View style={[styles.copy, { left: -index * slice, width: copyWidth, transform: [{ translateX: Animated.multiply(x, -1) }] }]}>
                  <Text {...text} numberOfLines={text.numberOfLines} style={[style, { color: highlightColor }]}>
                    {children}
                  </Text>
                </Animated.View>
              </View>
            )
          })}
        </Animated.View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  // The band and its slices are physical (left), as the web's background position: it sweeps left to right in either direction
  band: { position: "absolute", top: 0, left: 0 },
  slice: { position: "absolute", top: 0, overflow: "hidden" },
  copy: { position: "absolute", top: 0 },
})
