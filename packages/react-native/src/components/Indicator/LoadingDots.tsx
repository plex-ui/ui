import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { curves } from "../../internal/motion"
import { cssEase, useLoopClock } from "../../internal/transition"
import { useTheme } from "../../theme/ThemeProvider"
import { textColor, type TextColor } from "../Text/Text"

export type LoadingDotsProps = {
  /** The color of the dots, a text color or any color string; the web takes the text color. @default "primary" */
  color?: TextColor | (string & {})
  /** The name read out, as a busy progress indicator; without one the dots are decorative, as on the web. */
  "aria-label"?: string
  accessibilityLabel?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

const DOT = 8
const GAP = 4

/** iOS, as the web's dots: each pulses .15 → .4 → .15 in 1s (ease), 0.2s after the one before it. */
const IOS = { period: 1000, delays: [0, 200, 400] }
/** Android, the Plex Android look's typing dots: each grows over 320ms and shrinks over 320ms (decelerating) every 800ms, 150ms after the one before it; 1.33 to 2.33 of radius. */
const ANDROID = { period: 800, delays: [0, 150, 300], rest: 1.33 / 2.33 }

/**
 * Three pulsing dots for typing or a short wait, as @plexui/ui's LoadingDots: 8px dots 4px apart, as tall as a line
 * of text (24). iOS pulses their opacity as the web does; Android grows and shrinks them on the Plex Android look's
 * typing timing, in the same tones. With reduced motion they stand still.
 */
export function LoadingDots({ color, "aria-label": ariaLabel, accessibilityLabel, testID, style }: LoadingDotsProps) {
  const theme = useTheme()
  const ink = textColor(theme, color ?? "primary")
  const name = accessibilityLabel ?? ariaLabel
  const timing = theme.isAndroid ? ANDROID : IOS
  return (
    <View
      accessible={name != null}
      accessibilityRole={name != null ? "progressbar" : undefined}
      accessibilityLabel={name}
      accessibilityState={name != null ? { busy: true } : undefined}
      importantForAccessibility={name != null ? undefined : "no-hide-descendants"}
      accessibilityElementsHidden={name == null}
      testID={testID}
      style={[styles.root, { height: theme.length("--font-text-md-line-height", 24) }, style]}
    >
      {timing.delays.map((delay, index) => (
        <Dot key={index} delay={delay} color={ink} android={theme.isAndroid} still={theme.reducedMotion} />
      ))}
    </View>
  )
}

function Dot({ delay, color, android, still }: { delay: number; color: string; android: boolean; still: boolean }) {
  const { period } = android ? ANDROID : IOS
  const clock = useLoopClock(period, !still, true, delay)
  if (android) {
    // Grows for 320ms, shrinks for 320ms, rests until 800ms; its tone follows its size
    const grow = clock.interpolate({ inputRange: [0, 320, 640, period], outputRange: [0, 1, 0, 0], easing: curves.decelerate })
    return (
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: color,
            opacity: grow.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.4] }),
            transform: [{ scale: grow.interpolate({ inputRange: [0, 1], outputRange: [ANDROID.rest, 1] }) }],
          },
        ]}
      />
    )
  }
  const opacity = clock.interpolate({ inputRange: [0, 0.2 * period, period], outputRange: [0.15, 0.4, 0.15], easing: cssEase })
  return <Animated.View style={[styles.dot, { backgroundColor: color, opacity }]} />
}

const styles = StyleSheet.create({
  root: { flexDirection: "row", alignItems: "center", justifyContent: "flex-start", gap: GAP },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
})
