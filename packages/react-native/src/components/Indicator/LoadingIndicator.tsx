import { useEffect, useState } from "react"
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import Svg, { Circle } from "react-native-svg"
import { nativeDriver } from "../../internal/transition"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { textColor, type TextColor } from "../Text/Text"

export type LoadingIndicatorProps = {
  /** Size of the indicator, in pixels. @default 20 */
  size?: number
  /**
   * The spokes' width on iOS (by default the iOS 27 kit's proportion of the size: 2/14 up to 16, 4/30 to 27, 5/35
   * from 28), the arc's stroke on Android (by default an eighth of the size).
   */
  strokeWidth?: number
  /** The color, a text color or any color string; the web takes the text color (`currentcolor`). @default "primary" (iOS), the accent (Android) */
  color?: TextColor | (string & {})
  /** The time of one turn in ms, as the web's `--indicator-rotate-duration`; Android's cycle keeps its proportion. @default 800 */
  duration?: number
  /** The name read out, as a busy progress indicator; without one the spinner is decorative, as on the web. */
  "aria-label"?: string
  accessibilityLabel?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

/** The opacities of the eight spokes, from the top clockwise: the leading spoke, then the faintest, brightening. */
const SPOKES = [1, 0.15, 0.27, 0.39, 0.51, 0.63, 0.75, 0.87]

/** The kit's spoke for a size: Small (14) up to 16, Regular (30) to 27, Large (35) from 28, as width and height. */
function spoke(size: number) {
  if (size <= 16) return { width: (2 / 14) * size, height: (4 / 14) * size }
  if (size >= 28) return { width: (5 / 35) * size, height: (13 / 35) * size }
  return { width: (4 / 30) * size, height: (10 / 30) * size }
}

/** CSS `steps(8, end)`: the spinner turns a spoke at a time. */
const eightSteps = (t: number) => Math.min(1, Math.floor(t * 8) / 8)

const defaultColor = (theme: Theme, color: LoadingIndicatorProps["color"]) =>
  color ? textColor(theme, color) : theme.isAndroid ? theme.material.primary : textColor(theme, "primary")

/**
 * A spinner for a loading state, as @plexui/ui's LoadingIndicator. iOS: the iOS 27 spinner (UIActivityIndicatorView)
 * of eight rounded spokes, as the touch stylesheet draws it: 20pt, the spokes brightening to the leading one, a turn in
 * 800ms in eight steps. Android: Material's circular progress, the arc of CircularProgressDrawable (a 5.4s cycle of four
 * 250° surges) in the accent. With reduced motion it stands still.
 */
export function LoadingIndicator({ size = 20, strokeWidth, color, duration = 800, "aria-label": ariaLabel, accessibilityLabel, testID, style }: LoadingIndicatorProps) {
  const theme = useTheme()
  const ink = defaultColor(theme, color)
  const name = accessibilityLabel ?? ariaLabel
  return (
    <View
      accessible={name != null}
      accessibilityRole={name != null ? "progressbar" : undefined}
      accessibilityLabel={name}
      accessibilityState={name != null ? { busy: true } : undefined}
      importantForAccessibility={name != null ? undefined : "no-hide-descendants"}
      accessibilityElementsHidden={name == null}
      testID={testID}
      style={[{ width: size, height: size }, style]}
    >
      {theme.isAndroid ? (
        <Arc size={size} stroke={strokeWidth ?? size / 8} color={ink} cycle={(SPIN.cycle * duration) / 800} still={theme.reducedMotion} />
      ) : (
        <Spokes size={size} strokeWidth={strokeWidth} color={ink} duration={duration} still={theme.reducedMotion} />
      )}
    </View>
  )
}

function Spokes({ size, strokeWidth, color, duration, still }: { size: number; strokeWidth?: number; color: string; duration: number; still: boolean }) {
  const [turn] = useState(() => new Animated.Value(0))
  useEffect(() => {
    turn.setValue(0)
    if (still || duration <= 0) return
    const loop = Animated.loop(Animated.timing(turn, { toValue: 1, duration, easing: eightSteps, useNativeDriver: nativeDriver, isInteraction: false }))
    loop.start()
    return () => loop.stop()
  }, [turn, duration, still])
  const { width: kitWidth, height } = spoke(size)
  const width = strokeWidth ?? kitWidth
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }]}>
      {SPOKES.map((opacity, index) => (
        <View key={index} style={[StyleSheet.absoluteFill, { opacity, transform: [{ rotate: `${index * 45}deg` }] }]}>
          <View style={{ position: "absolute", top: 0, left: (size - width) / 2, width, height, borderRadius: width / 2, backgroundColor: color }} />
        </View>
      ))}
    </Animated.View>
  )
}

/** Material's standard curve, on which the arc surges. */
const standard = Easing.bezier(0.4, 0, 0.2, 1)
/**
 * Android's spinner over one 5400ms cycle (CircularProgressDrawable): the arc's head turns 1520° and makes four surges
 * of 250°, 667ms each, 1350ms apart; its tail turns 20° behind the head's steady turn and makes the same surges 667ms
 * later.
 */
export const SPIN = { cycle: 5400, turn: 1520, lag: 20, surge: 250, surgeTime: 667, surgeEvery: 1350, surges: 4 }

/** The spinner at a share of its cycle: how far its tail has turned and how long its arc is, in degrees. */
export function spinnerAt(share: number) {
  const t = share * SPIN.cycle
  const surges = (delay: number) => {
    let total = 0
    for (let index = 0; index < SPIN.surges; index++) {
      const from = delay + index * SPIN.surgeEvery
      total += standard(Math.min(1, Math.max(0, (t - from) / SPIN.surgeTime))) * SPIN.surge
    }
    return total
  }
  const head = (t / SPIN.cycle) * SPIN.turn + surges(0)
  // The tail stands still until the head is 20° on
  const lagTime = (SPIN.lag * SPIN.cycle) / SPIN.turn
  const tail = Math.max(0, (t - lagTime) / (SPIN.cycle - lagTime)) * (SPIN.turn - SPIN.lag) + surges(SPIN.surgeTime)
  return { tail, arc: head - tail }
}

/** The still frame: the end of the first surge, a 270° arc. */
const STILL = SPIN.surgeTime / SPIN.cycle

/**
 * The arc is redrawn from a clock on each frame: an animated SVG prop does not reach the element on the web. The
 * stroke runs on a circle that fills the box, as Android lays its drawable out (8.75 of 20 with a 2.5 stroke).
 */
function Arc({ size, stroke, color, cycle, still }: { size: number; stroke: number; color: string; cycle: number; still: boolean }) {
  const [time, setShare] = useState(STILL)
  const share = still || cycle <= 0 ? STILL : time
  useEffect(() => {
    if (still || cycle <= 0) return
    const time = new Animated.Value(0)
    const id = time.addListener(({ value }) => setShare(value))
    const loop = Animated.loop(Animated.timing(time, { toValue: 1, duration: cycle, easing: Easing.linear, useNativeDriver: false, isInteraction: false }))
    loop.start()
    return () => {
      loop.stop()
      time.removeListener(id)
    }
  }, [cycle, still])
  const { tail, arc } = spinnerAt(share)
  const radius = Math.max(0, (size - stroke) / 2)
  const length = 2 * Math.PI * radius
  return (
    // The circle's stroke starts at 3 o'clock and runs clockwise, as Android's arcs
    <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${tail}deg` }] }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          // One dash as long as the arc, the rest of the circle a gap
          strokeDasharray={[length, length]}
          strokeDashoffset={length * (1 - arc / 360)}
        />
      </Svg>
    </View>
  )
}
