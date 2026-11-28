import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react"
import { Animated, Easing, I18nManager, Platform, StyleSheet, View, type EasingFunction, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native"
import Svg, { Path } from "react-native-svg"
import { useRTL } from "../../internal/direction"
import { curves } from "../../internal/motion"
import { Text } from "../Text/Text"
import { materialType, typeStyle } from "../../theme/typography"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"

/** A band of the scale: its label under it, and its name read out (the label by default). */
export type ProgressScaleBand = string | { label: string; accessibilityLabel?: string }

/** How the marker comes to a value, and how the value's band lights after it. */
export type ProgressScaleMotion = {
  value?: { duration?: number; delay?: number; easing?: EasingFunction }
  light?: { duration?: number; delay?: number }
}

export type ProgressScaleProps = {
  /** The bands, side by side and equally wide, each with the label under it. */
  bands: ProgressScaleBand[]
  /** Where the value stands on the scale, between `0` and `max`: its band is the one it falls in. */
  value: number
  /** @default 100 */
  max?: number
  /**
   * How a value comes in. `true`: a new value moves the marker (iOS 0.35 s, Android 300 ms) and its band lights at
   * once. An object: the first value too comes in, the marker from the scale's start over `value` and its band
   * lighting over `light` after it. `false`: at once. @default true
   */
  animated?: boolean | ProgressScaleMotion
  /** Whether the labels show under the bands. @default true */
  showLabels?: boolean
  /** The value read out; "Both, 50%" (the band's label and the share) by default. */
  getValueLabel?: (value: number, max: number, band: string) => string
  /** The name read out, when no visible label names the scale. */
  "aria-label"?: string
  accessibilityLabel?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

const bandName = (band: ProgressScaleBand) => (typeof band === "string" ? band : (band.accessibilityLabel ?? band.label))
const bandLabel = (band: ProgressScaleBand) => (typeof band === "string" ? band : band.label)
const defaultValueLabel = (value: number, max: number, band: string) => `${band}, ${Math.round((value / max) * 100)}%`

/** The scale's look on the platform, each part a token the brand can set. */
function look(theme: Theme) {
  const android = theme.isAndroid
  const marker = theme.token("--scale-marker")
  const dark = theme.scheme === "dark"
  return {
    bandHeight: theme.length("--scale-band-height", android ? 4 : 6),
    bandGap: theme.length("--scale-band-gap", android ? 4 : 3),
    // iOS: the tertiary system fill (the quaternary one is lost on a white card); Material: the secondary container
    bandColor: theme.color("--scale-band-color", android ? theme.material.secondaryContainer : dark ? "rgba(118, 118, 128, 0.24)" : "rgba(118, 118, 128, 0.12)"),
    bandColorOn: theme.color("--scale-band-color-on", android ? theme.material.primary : theme.colors.accent),
    marker: marker === "drop" ? ("drop" as const) : marker === "handle" || (marker == null && android) ? ("handle" as const) : ("knob" as const),
    markerSize: theme.length("--scale-marker-size", android ? 16 : 14),
    markerFillet: theme.length("--scale-marker-fillet", 4),
    // iOS: a slider's thumb at rest, white; Material: the handle in primary
    markerColor: theme.color("--scale-marker-color", android ? theme.material.primary : "#ffffff"),
    labelGap: theme.length("--scale-label-gap", android ? 8 : 6),
    labelColor: theme.color("--scale-label-color", android ? theme.material.onSurfaceVariant : theme.colors.labelSecondary),
    labelColorOn: theme.color("--scale-label-color-on", android ? theme.material.onSurface : theme.colors.text),
    label: android ? materialType.bodySmall : typeStyle("ios", "footnote"),
    labelSize: theme.length("--scale-label-size", 0),
    labelLineHeight: theme.length("--scale-label-line-height", 0),
  }
}

/**
 * A value on a scale of a few labelled bands, read only, as iOS's linear gauge (Health's ranges) and Material's linear
 * indicator with a handle. iOS: capsules 6 tall and 3 apart, the value's band in the accent and the others in the
 * quaternary fill; at the value a white knob 14 across with a slider thumb's shadow; each band's label under it in
 * Footnote, the value's in the label color, semibold. Android: bands 4 tall and 4 apart, the value's in primary, the
 * others in the secondary container, a 4 × 16 handle in primary. Each part is a `--scale-*` token, and the marker can
 * be a drop (`--scale-marker: drop`): a round mark flowing into its band through arcs above and under it. Read as a
 * progress bar whose value is the band and the share ("Both, 50%"). With reduced motion a value lands at once.
 */
export function ProgressScale({
  bands,
  value,
  max = 100,
  animated = true,
  showLabels = true,
  getValueLabel = defaultValueLabel,
  "aria-label": ariaLabel,
  accessibilityLabel,
  testID,
  style,
}: ProgressScaleProps) {
  const theme = useTheme()
  const parts = look(theme)
  const { ref, rtl } = useRTL<ComponentRef<typeof View>>()
  const [width, setWidth] = useState(0)
  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width
    setWidth((old) => (old === next ? old : next))
  }
  const top = max > 0 && Number.isFinite(max) ? max : 100
  const count = Math.max(1, bands.length)
  const clamped = Math.max(0, Math.min(top, Number.isFinite(value) ? value : 0))
  const fraction = clamped / top
  const on = Math.min(count - 1, Math.floor(fraction * count))
  const name = accessibilityLabel ?? ariaLabel
  const text = bands.length ? getValueLabel(clamped, top, bandName(bands[on])) : undefined

  const motion = typeof animated === "object" ? animated : null
  const still = animated === false || theme.reducedMotion
  // The marker's place along the scale (0 to 1), and the value's band lit (0 off to 1 on)
  const [place] = useState(() => new Animated.Value(motion && !still ? 0 : fraction))
  const [light] = useState(() => new Animated.Value(motion && !still ? 0 : 1))
  // Whether the entrance has run to its end: an entrance stopped (a new value, or Strict Mode's replay) runs again
  const entered = useRef(false)
  const valueMotion = useMemo(
    () => ({
      duration: motion?.value?.duration ?? (theme.isAndroid ? 300 : 350),
      delay: motion?.value?.delay ?? 0,
      easing: motion?.value?.easing ?? (theme.isAndroid ? curves.decelerate : Easing.bezier(0.25, 0.1, 0.25, 1)),
    }),
    [motion?.value?.duration, motion?.value?.delay, motion?.value?.easing, theme.isAndroid],
  )
  const lightMotion = { duration: motion?.light?.duration ?? 0, delay: motion?.light?.delay ?? 0 }
  // A move cut off by something other than this effect (a view mounted under it replaying its lifecycle in Strict
  // Mode) runs again
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const entering = !entered.current && !!motion
    if (still) {
      place.stopAnimation()
      light.stopAnimation()
      place.setValue(fraction)
      light.setValue(1)
      return
    }
    // A band lights after the marker has come to it on the first value; a later value moves the marker alone
    light.setValue(entering ? 0 : 1)
    const run = Animated.sequence([
      Animated.timing(place, { toValue: fraction, duration: valueMotion.duration, delay: valueMotion.delay, easing: valueMotion.easing, useNativeDriver: false, isInteraction: false }),
      ...(entering
        ? [Animated.timing(light, { toValue: 1, duration: lightMotion.duration, delay: lightMotion.delay, easing: Easing.linear, useNativeDriver: false, isInteraction: false })]
        : []),
    ])
    let ours = false
    run.start(({ finished }) => {
      if (finished && entering) entered.current = true
      if (!finished && !ours) setRetry((n) => n + 1)
    })
    return () => {
      ours = true
      run.stop()
    }
    // The motion's settings are read when a value comes, not watched
  }, [fraction, still, retry]) // eslint-disable-line react-hooks/exhaustive-deps

  const half = parts.marker === "handle" ? 2 : parts.markerSize / 2
  // The marker stands on the value's band where the value falls in it (the gaps are not on the scale), its center
  // kept far enough in for it to stay whole; right to left the scale runs from the right
  const gap = parts.bandGap
  const bandWidth = count > 0 ? Math.max(0, (width - (count - 1) * gap) / count) : 0
  const inside = (x: number) => Math.max(half, Math.min(width - half, x))
  const inputRange: number[] = []
  const outputRange: number[] = []
  for (let i = 0; i < count; i++) {
    const start = i * (bandWidth + gap)
    inputRange.push(i / count, i === count - 1 ? 1 : (i + 1) / count - 1e-6)
    outputRange.push(inside(start), inside(start + bandWidth))
  }
  const physicalX = rtl ? outputRange.map((x) => width - x) : outputRange
  const offset = count > 0 && width > 0 ? place.interpolate({ inputRange, outputRange: physicalX, extrapolate: "clamp" }) : 0
  // A native layout that swaps left and right right to left takes `right` for the left edge
  const anchor = Platform.OS !== "web" && rtl && I18nManager.doLeftAndRightSwapInRTL ? styles.anchorSwapped : styles.anchor
  const markerBox = parts.marker === "drop" ? dropBox(parts.markerSize, parts.markerFillet, parts.bandHeight) : null
  const rowHeight = Math.max(parts.bandHeight, parts.marker === "handle" ? parts.markerSize : parts.markerSize, markerBox?.height ?? 0)
  const labelType = {
    fontSize: parts.labelSize || parts.label.fontSize,
    lineHeight: parts.labelLineHeight || parts.label.lineHeight,
  }

  return (
    <View
      ref={ref}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={name}
      accessibilityValue={{ min: 0, max: top, now: clamped, text }}
      {...(Platform.OS === "web" ? { "aria-valuemin": 0, "aria-valuemax": top, "aria-valuenow": clamped, "aria-valuetext": text } : null)}
      testID={testID}
      style={[styles.root, style]}
    >
      <View onLayout={onLayout} style={[styles.row, { height: rowHeight, gap: parts.bandGap }]}>
        {bands.map((band, index) => (
          <Band key={index} lit={index === on} light={light} height={parts.bandHeight} off={parts.bandColor} on={parts.bandColorOn} />
        ))}
        {width > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.marker, anchor, { height: rowHeight, transform: [{ translateX: offset }] }]}
          >
            {parts.marker === "drop" && markerBox ? (
              <Svg width={markerBox.width} height={markerBox.height}>
                <Path d={markerBox.path} fill={parts.markerColor} />
              </Svg>
            ) : parts.marker === "handle" ? (
              <View style={[styles.handle, { height: parts.markerSize, backgroundColor: parts.markerColor }]} />
            ) : (
              <View
                style={[
                  styles.knob,
                  {
                    width: parts.markerSize,
                    height: parts.markerSize,
                    borderRadius: half,
                    backgroundColor: parts.markerColor,
                    // A slider's thumb at rest: the system's shadow, lighter for the small knob
                    boxShadow: "0 0.5px 2px rgba(0, 0, 0, 0.12), 0 2px 5px rgba(0, 0, 0, 0.12)",
                  },
                ]}
              />
            )}
          </Animated.View>
        ) : null}
      </View>
      {showLabels ? (
        <View style={[styles.labels, { gap: parts.bandGap, marginTop: parts.labelGap }]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {bands.map((band, index) => (
            <Text
              key={index}
              numberOfLines={1}
              style={[
                styles.label,
                labelType,
                { color: index === on ? parts.labelColorOn : parts.labelColor },
                theme.font(index === on ? (theme.isAndroid ? "medium" : "semibold") : "regular"),
                { letterSpacing: theme.tracking(labelType.fontSize) },
              ]}
            >
              {bandLabel(band)}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  )
}

/** A band: a capsule, the value's lighting from the band's color to the lit one. */
function Band({ lit, light, height, off, on }: { lit: boolean; light: Animated.Value; height: number; off: string; on: string }) {
  const color = lit ? light.interpolate({ inputRange: [0, 1], outputRange: [off, on] }) : off
  return <Animated.View style={[styles.band, { height, borderRadius: height / 2, backgroundColor: color }]} />
}

/**
 * The drop: a circle `size` across on a band `band` tall, flowing into the band through arcs `fillet` round above and
 * under it. Each arc touches the band's edge and the circle; the shape is the circle, the arcs and the band between.
 */
export function dropBox(size: number, fillet: number, band: number) {
  const r = size / 2
  const f = Math.max(0, fillet)
  const h = Math.min(band, size) / 2
  // A fillet's center: f off the band's edge, r + f from the circle's center
  const dy = h + f
  const dx = Math.sqrt(Math.max(0, (r + f) ** 2 - dy ** 2))
  const width = 2 * dx
  const height = size
  const cx = dx
  const cy = r
  // Where a fillet touches the circle
  const tx = (dx * r) / (r + f)
  const ty = (dy * r) / (r + f)
  const n = (v: number) => Math.round(v * 1000) / 1000
  const path = [
    `M ${n(cx - dx)} ${n(cy - h)}`,
    // up the left fillet to the circle (the arc bends away from the circle)
    `A ${n(f)} ${n(f)} 0 0 0 ${n(cx - tx)} ${n(cy - ty)}`,
    // over the circle's top
    `A ${n(r)} ${n(r)} 0 0 1 ${n(cx + tx)} ${n(cy - ty)}`,
    `A ${n(f)} ${n(f)} 0 0 0 ${n(cx + dx)} ${n(cy - h)}`,
    `L ${n(cx + dx)} ${n(cy + h)}`,
    `A ${n(f)} ${n(f)} 0 0 0 ${n(cx + tx)} ${n(cy + ty)}`,
    `A ${n(r)} ${n(r)} 0 0 1 ${n(cx - tx)} ${n(cy + ty)}`,
    `A ${n(f)} ${n(f)} 0 0 0 ${n(cx - dx)} ${n(cy + h)}`,
    "Z",
  ].join(" ")
  return { width, height, path }
}

const styles = StyleSheet.create({
  root: { width: "100%" },
  row: { flexDirection: "row", alignItems: "center" },
  band: { flex: 1 },
  // A box of no width at the scale's left edge, its mark centered on it: the move is the mark's center
  marker: { position: "absolute", top: 0, width: 0, alignItems: "center", justifyContent: "center", overflow: "visible" },
  anchor: { left: 0 },
  anchorSwapped: { right: 0 },
  knob: {},
  handle: { width: 4, borderRadius: 2 },
  labels: { flexDirection: "row" },
  label: { flex: 1, textAlign: "center" },
})
