import { useEffect, useState } from "react"
import { View, type StyleProp, type ViewStyle } from "react-native"
import Svg, { Circle } from "react-native-svg"
import { curves } from "../../internal/motion"
import { cssEase, useTweenedNumber } from "../../internal/transition"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"

export type CircularProgressProps = {
  /** Maximum duration to use for simulated upload progress in ms. @default 15000 */
  maxDuration?: number
  /** Sets the progress to full and resolves the simulated timer. @default false */
  done?: boolean
  /** A fixed progress, 0 to 100, instead of the simulated one. */
  progress?: number
  /** Size of the indicator, in pixels. @default 28 */
  size?: number
  /** Stroke width of the ring, in pixels of its 20px drawing, between 1 and 4. @default 2 */
  strokeWidth?: number
  /** Color of the active progress track (stroke): a color or a token, such as `"var(--gray-1000)"`. */
  trackActiveColor?: string
  /** Color of the base track (background stroke): a color or a token, such as `"var(--alpha-15)"`. */
  trackColor?: string
  /** The name read out, as a progress bar. */
  "aria-label"?: string
  accessibilityLabel?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

/**
 * Deterministically returns a progress value between 0 and 100 that decays as it approaches 100, based on a maximum
 * duration and the elapsed time, as @plexui/ui's simulated progress.
 */
export function getSimulatedProgress(maxTime: number, elapsedTime: number) {
  const P_max = 99.9 // Maximum percentage to approach (less than 100%)
  const P1 = 35 // Percentage at which the rate slows down
  const initialRate = (3 * 100) / maxTime // Initial rate (% per ms)
  const t1 = P1 / initialRate // Time when progress reaches P1
  let percentage
  if (elapsedTime <= t1) {
    // Phase 1: a linear increase at the start, to show consistency in progress
    percentage = initialRate * elapsedTime
  } else {
    // Phase 2: the progress slows down, approaching P_max
    const k = 4
    const remainingTime = maxTime - t1
    const timeSinceT1 = elapsedTime - t1
    percentage = P1 + (P_max - P1) * (1 - Math.exp(-k * (timeSinceT1 / remainingTime)))
  }
  return Math.min(percentage, P_max)
}

/** A progress that rises every 100ms from the mount, slowing as it nears 100, and is 100 once `completed`. */
function useSimulatedProgress(maxDuration: number, completed: boolean) {
  const [startAt] = useState(() => Date.now())
  const [progress, setProgress] = useState(() => getSimulatedProgress(maxDuration, Date.now() - startAt))
  useEffect(() => {
    if (completed) return
    const id = setInterval(() => {
      const elapsed = Date.now() - startAt
      setProgress(elapsed >= maxDuration ? 100 : getSimulatedProgress(maxDuration, elapsed))
    }, 100)
    return () => clearInterval(id)
  }, [completed, maxDuration, startAt])
  return completed ? 100 : progress
}

/** A color prop: a token (`var(--…)`) resolved for the scheme, or a color as it is. */
const resolve = (theme: Theme, value: string | undefined, fallback: string) => {
  if (!value) return fallback
  if (!value.includes("var(") && !value.includes("light-dark(")) return value
  const resolved = theme.value(value)
  return typeof resolved === "string" ? resolved : fallback
}

/** The drawing: a ring of radius 8 in a 20px box, its progress a dash of 50 that starts at 12 o'clock. */
const DASH = 50

/**
 * A progress ring, as @plexui/ui's CircularProgress: a light green track and a green arc for its share, 28px by
 * default. Without `progress` it simulates one over `maxDuration`, and `done` fills it. Neither platform has a ring
 * of its own for this, so both draw the Plex ring; a new value moves the arc in 300ms (ease) on iOS, as the web's
 * transition, and in Android's determinate radial progress time (200ms, decelerating); at once with reduced motion.
 */
export function CircularProgress({
  maxDuration = 15000,
  done = false,
  progress: progressProp,
  size = 28,
  strokeWidth,
  trackActiveColor,
  trackColor,
  "aria-label": ariaLabel,
  accessibilityLabel,
  testID,
  style,
}: CircularProgressProps) {
  const theme = useTheme()
  const simulated = useSimulatedProgress(maxDuration, progressProp !== undefined || done)
  const progress = Math.max(0, Math.min(100, progressProp ?? simulated))
  const shown = useTweenedNumber(progress, {
    duration: theme.isAndroid ? 200 : 300,
    easing: theme.isAndroid ? curves.decelerate : cssEase,
    reducedMotion: theme.reducedMotion,
  })
  const stroke = strokeWidth ? Math.min(4, strokeWidth) : 2
  // The web's `light-dark(#deede9, var(--green-a50))`: a light green, the green at 15% at night
  const track = resolve(theme, trackColor, theme.scheme === "dark" ? theme.color("--green-a50") : "#DEEDE9")
  const active = resolve(theme, trackActiveColor, theme.color("--green-500"))
  const name = accessibilityLabel ?? ariaLabel
  return (
    <View
      accessible={name != null}
      accessibilityRole={name != null ? "progressbar" : undefined}
      accessibilityLabel={name}
      accessibilityValue={name != null ? { min: 0, max: 100, now: Math.round(progress) } : undefined}
      importantForAccessibility={name != null ? undefined : "no-hide-descendants"}
      accessibilityElementsHidden={name == null}
      testID={testID}
      style={[{ width: size, height: size }, style]}
    >
      <Svg width={size} height={size} viewBox="0 0 20 20">
        <Circle cx={10} cy={10} r={8} fill="none" stroke={track} strokeWidth={stroke} />
        <Circle
          cx={10}
          cy={10}
          r={8}
          fill="none"
          stroke={active}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={[DASH, DASH]}
          strokeDashoffset={DASH - DASH * (shown / 100)}
          // The dash starts at 12 o'clock, as the web's ring turned back a quarter
          transform="rotate(-90 10 10)"
        />
      </Svg>
    </View>
  )
}
