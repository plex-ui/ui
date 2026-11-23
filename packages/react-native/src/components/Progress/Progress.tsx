import { useEffect, useState } from "react"
import { Animated, Easing, Platform, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native"
import { isRTL } from "../../internal/direction"
import { curves } from "../../internal/motion"
import { cssEase, useLoopClock, useTransitionValue } from "../../internal/transition"
import { withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"

export type ProgressSize = "sm" | "md" | "lg"

export type ProgressColor = "primary" | "secondary" | "success" | "warning" | "caution" | "danger" | "info" | "discovery"

/** A part of a segmented bar: its share of `max`, its color, and the name it is read with. */
export type ProgressSegment = {
  value: number
  /** @default "primary" */
  color?: ProgressColor
  /** Read out with its share, such as "Paid 60%" */
  label?: string
}

export type ProgressProps = {
  /** Current progress value, between `0` and `max`. Omit (or pass `null`) for an indeterminate state. */
  value?: number | null
  /** @default 100 */
  max?: number
  /**
   * Parts of one bar, side by side in their colors, such as paid, pending and due. The value is their sum; they take
   * `value`'s place. A part's share is clamped so the bar never passes `max`.
   */
  segments?: ProgressSegment[]
  /** The bar's thickness: `sm` 4 (iOS's progress view), `md` 6, `lg` 8 (a bar in a stats card). @default "sm" */
  size?: ProgressSize
  /** The color of the filled part. A segmented bar's parts take their own colors. @default "primary" */
  color?: ProgressColor
  /** The value read out; the rounded percentage by default, such as "67%". */
  getValueLabel?: (value: number, max: number) => string
  /** The name read out, when no visible label names the bar. */
  "aria-label"?: string
  /** The `nativeID` of the visible label that names the bar (Android and the web). */
  "aria-labelledby"?: string
  accessibilityLabel?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

/** The parts of a segmented bar, each clamped so their sum stays within `max`, and their sum. */
export const progressSegments = (segments: ProgressSegment[], max: number) => {
  let total = 0
  const parts = segments.map((segment) => {
    const value = Math.max(0, Math.min(max - total, segment.value || 0))
    total += value
    return { ...segment, value }
  })
  return { parts, total }
}

const segmentsLabel = (parts: ProgressSegment[], max: number) =>
  parts.map((part) => `${part.label ? `${part.label} ` : ""}${Math.round((part.value / max) * 100)}%`).join(", ")

const defaultValueLabel = (value: number, max: number) => `${Math.round((value / max) * 100)}%`

/** The fill of a color: the Plex ink for primary (the accent on Android, as its progress bars), else the solid one. */
function fillColor(theme: Theme, color: ProgressColor) {
  if (color === "primary") return theme.isAndroid ? theme.material.primary : theme.color("--progress-indicator-color", theme.colors.text)
  return theme.color(`--color-background-${color}-solid`)
}

/** The track: `--progress-track-color` on iOS; on Android the slider's track, the ink at 8% (16% at night). */
const trackColor = (theme: Theme) =>
  theme.isAndroid ? withAlpha(theme.material.onSurface, theme.scheme === "dark" ? 0.16 : 0.08) : theme.color("--progress-track-color")

const height = (theme: Theme, size: ProgressSize) =>
  size === "md" ? theme.length("--progress-height-md", 6) : size === "lg" ? theme.length("--progress-height-lg", 8) : theme.length("--progress-height", 4)

/** How a new value moves the fill: the CSS transition on iOS; Android's line progress, 300ms decelerating. */
function valueMotion(theme: Theme) {
  return theme.isAndroid
    ? { duration: 300, easing: curves.decelerate }
    : { duration: theme.duration("--progress-transition-duration", 120), easing: cssEase }
}

/**
 * A horizontal bar of a task's progress, or a sweep while its length is unknown, as @plexui/ui's Progress. iOS:
 * the phone layer's tokens (`--progress-height` 4, 6, 8; `--progress-track-color`; the ink fill); a new value moves
 * the fill in `--progress-transition-duration` (120ms, ease); the indeterminate sweep is 40% of the track, there and
 * back in `--progress-indeterminate-duration` (1.5s, ease-in-out). Android: the Plex Android look's line progress,
 * the accent on the ink at 8%, a new value in 300ms decelerating, and Material's indeterminate pair of lines (1750ms).
 * A segmented bar puts its parts side by side with `--progress-segment-gap` (2) of track between them. With reduced
 * motion a value lands at once and the sweep stands still in the middle.
 */
export function Progress({
  value = null,
  max = 100,
  segments,
  size = "sm",
  color = "primary",
  getValueLabel = defaultValueLabel,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  accessibilityLabel,
  testID,
  style,
}: ProgressProps) {
  const theme = useTheme()
  const [width, setWidth] = useState(0)
  const [rtl, setRTL] = useState(false)
  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width
    setWidth((old) => (old === next ? old : next))
    const direction = isRTL(event.currentTarget)
    setRTL((old) => (old === direction ? old : direction))
  }
  const rootMax = typeof max === "number" && max > 0 && !Number.isNaN(max) ? max : 100
  const thickness = height(theme, size)
  const name = accessibilityLabel ?? ariaLabel

  let content
  let now: number | undefined
  let text: string | undefined
  if (segments) {
    const { parts, total } = progressSegments(segments, rootMax)
    now = total
    text = segmentsLabel(parts, rootMax)
    content = (
      <View style={[styles.segments, { gap: theme.length("--progress-segment-gap", 2) }]}>
        {parts.map((part, index) => (part.value > 0 ? <Segment key={index} share={part.value / rootMax} color={fillColor(theme, part.color ?? "primary")} theme={theme} /> : null))}
      </View>
    )
  } else {
    const resolved = value == null ? null : Math.max(0, Math.min(rootMax, value))
    now = resolved ?? undefined
    text = resolved == null ? undefined : getValueLabel(resolved, rootMax)
    const fill = fillColor(theme, color)
    content =
      resolved == null ? (
        theme.isAndroid ? (
          <AndroidSweep width={width} color={fill} theme={theme} />
        ) : (
          <Sweep width={width} rtl={rtl} color={fill} theme={theme} />
        )
      ) : (
        <Fill fraction={resolved / rootMax} width={width} rtl={rtl} color={fill} theme={theme} />
      )
  }

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={name}
      accessibilityValue={now == null ? undefined : { min: 0, max: rootMax, now, text }}
      accessibilityState={now == null ? { busy: true } : undefined}
      aria-labelledby={ariaLabelledBy}
      {...(Platform.OS === "web" ? { "aria-valuemin": 0, "aria-valuemax": rootMax, "aria-valuenow": now, "aria-valuetext": text } : null)}
      testID={testID}
      onLayout={onLayout}
      style={[styles.root, { height: thickness, borderRadius: thickness / 2, backgroundColor: trackColor(theme) }, style]}
    >
      {content}
    </View>
  )
}

/** The filled part: the whole track's width, moved back by what is left (rounded at its leading end). */
function Fill({ fraction, width, rtl, color, theme }: { fraction: number; width: number; rtl: boolean; color: string; theme: Theme }) {
  const motion = valueMotion(theme)
  const shown = useTransitionValue(fraction, { ...motion, native: true, reducedMotion: theme.reducedMotion })
  const [span] = useState(() => new Animated.Value(width))
  useEffect(() => span.setValue(width), [span, width])
  const translateX = Animated.multiply(shown.interpolate({ inputRange: [0, 1], outputRange: rtl ? [1, 0] : [-1, 0] }), span)
  return (
    <Animated.View
      pointerEvents="none"
      // Until the track is measured the fill waits, so a first frame does not show it full
      style={[StyleSheet.absoluteFill, styles.rounded, { backgroundColor: color, opacity: width > 0 ? 1 : 0, transform: [{ translateX }] }]}
    />
  )
}

/** iOS's sweep: 40% of the track goes from just before its start to past its end and back, ease-in-out each way. */
function Sweep({ width, rtl, color, theme }: { width: number; rtl: boolean; color: string; theme: Theme }) {
  const period = theme.duration("--progress-indeterminate-duration", 1500)
  const moving = !theme.reducedMotion && width > 0
  const clock = useLoopClock(period, moving, true)
  const [span] = useState(() => new Animated.Value(width))
  useEffect(() => span.setValue(width), [span, width])
  const half = period / 2
  // translateX of the 40% bar in its own widths: -100% → 150% → -100% (keyframes 0, 50%, 100%)
  const phase = clock.interpolate({
    inputRange: [0, half, period],
    outputRange: [-1, 1.5, -1],
    easing: curves.easeInOut,
  })
  const share = 0.4
  const translateX = moving ? Animated.multiply(Animated.multiply(phase, rtl ? -share : share), span) : (rtl ? -0.3 : 0.3) * width
  // With reduced motion the bar stands still in the middle
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.sweep, styles.rounded, { width: `${share * 100}%`, backgroundColor: color, opacity: width > 0 ? 1 : 0, transform: [{ translateX }] }]}
    />
  )
}

/** Material's indeterminate line progress: two lines run along the track in 1750ms (Compose's keyframes). */
const LINES = [
  { head: [0, 1000], tail: [250, 1000] },
  { head: [650, 850], tail: [900, 850] },
] as const
const LINE_PERIOD = 1750
/** Material's emphasized accelerate curve, on which each end of a line runs. */
const emphasizedAccelerate = Easing.bezier(0.3, 0, 0.8, 0.15)

function AndroidSweep({ width, color, theme }: { width: number; color: string; theme: Theme }) {
  const moving = !theme.reducedMotion && width > 0
  // The lines' ends move the layout (left, width), which the native driver cannot run
  const clock = useLoopClock(LINE_PERIOD, moving, false)
  if (!moving) {
    // With reduced motion a line stands still in the middle
    return <View pointerEvents="none" style={[styles.sweep, styles.rounded, { start: "30%", width: "40%", backgroundColor: color, opacity: width > 0 ? 1 : 0 }]} />
  }
  const end = ([delay, duration]: readonly [number, number]) =>
    clock.interpolate({ inputRange: [delay, delay + duration], outputRange: [0, width], easing: emphasizedAccelerate, extrapolate: "clamp" })
  return (
    <>
      {LINES.map((line, index) => {
        const head = end(line.head)
        const tail = end(line.tail)
        return <Animated.View key={index} pointerEvents="none" style={[styles.sweep, styles.rounded, { start: tail, width: Animated.subtract(head, tail), backgroundColor: color }]} />
      })}
    </>
  )
}

/** A part of a segmented bar: its share of the track, which a change moves as the CSS transition of its width. */
function Segment({ share, color, theme }: { share: number; color: string; theme: Theme }) {
  const shown = useTransitionValue(share, { ...valueMotion(theme), reducedMotion: theme.reducedMotion })
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.segment, { width: shown.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }), backgroundColor: color }]}
    />
  )
}

const styles = StyleSheet.create({
  root: { width: "100%", overflow: "hidden" },
  rounded: { borderRadius: 9999 },
  sweep: { position: "absolute", top: 0, bottom: 0, start: 0 },
  segments: { flex: 1, flexDirection: "row" },
  // A full bar's parts give the gaps back in proportion, so the last one is not cut off at the end
  segment: { flexShrink: 1, minWidth: 0, height: "100%" },
})
