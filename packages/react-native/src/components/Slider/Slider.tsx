import { useState, type ReactNode } from "react"
import { Platform, StyleSheet, View, type AccessibilityActionEvent, type GestureResponderEvent, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native"
import { textOf } from "../../internal/children"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { withAlpha } from "../../theme/material"
import { materialType } from "../../theme/typography"
import { Text } from "../Text/Text"

export type SliderProps = {
  value: number
  onChange: (value: number) => void
  /** Called once the finger lets go, with the last value. */
  onChangeEnd?: (value: number) => void
  /** @default 0 */
  min?: number
  /** @default 100 */
  max?: number
  /** @default 1 */
  step?: number
  /** The label over the slider, with the value at its end. */
  label?: ReactNode
  /** A unit after the value (`%`), or before it with `prefixUnit` (`$`). */
  unit?: string
  prefixUnit?: string
  /** Hides the value beside the label. @default false */
  hideValue?: boolean
  disabled?: boolean
  /** Symbols at either end of the track (`speaker` and `speaker.wave.3`). */
  startAdornment?: ReactNode
  endAdornment?: ReactNode
  trackColor?: string
  rangeColor?: string
  "aria-label"?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/**
 * A value in a range, as @plexui/ui's Slider. iOS 26 (`--slider-*` of the phone layer): a 6pt track, the range in
 * `--slider-range-color`, a 38x24 white capsule thumb with `--slider-thumb-shadow`, a 52pt control; the label and
 * the value 17/22 over it. Android: Material 3's slider (Compose material3): a 16dp track, the active part in
 * `primary` and the rest in `secondaryContainer`, a 4x44dp handle 6dp from either part, a 4dp stop at the end.
 */
export function Slider({
  value,
  onChange,
  onChangeEnd,
  min = 0,
  max = 100,
  step = 1,
  label,
  unit,
  prefixUnit,
  hideValue = false,
  disabled = false,
  startAdornment,
  endAdornment,
  trackColor,
  rangeColor,
  "aria-label": ariaLabel,
  testID,
  style,
}: SliderProps) {
  const theme = useTheme()
  const [width, setWidth] = useState(0)
  const [active, setActive] = useState(false)
  const android = theme.isAndroid
  const thumb = android ? 4 : theme.length("--slider-thumb-width", 38)
  const ratio = max > min ? (clamp(value, min, max) - min) / (max - min) : 0
  const snap = (raw: number) => {
    const stepped = Math.round((raw - min) / step) * step + min
    return clamp(Number(stepped.toFixed(10)), min, max)
  }
  // The thumb's center runs from half its width to the end less half its width, as UISlider and Material keep it on the track
  const valueAt = (x: number) => snap(min + clamp((x - thumb / 2) / Math.max(1, width - thumb), 0, 1) * (max - min))
  const move = (event: GestureResponderEvent) => {
    // A slider disabled during a drag stops changing
    if (disabled) return value
    const next = valueAt(event.nativeEvent.locationX)
    if (next !== value) onChange(next)
    return next
  }
  const nudge = (by: number) => {
    if (disabled) return
    const next = snap(clamp(value + by, min, max))
    if (next !== value) {
      onChange(next)
      onChangeEnd?.(next)
    }
  }
  const text = `${prefixUnit ?? ""}${value}${unit ?? ""}`
  const big = Math.max(step, (max - min) / 10)
  const keys =
    Platform.OS === "web" && !disabled
      ? {
          tabIndex: 0 as const,
          onKeyDown: (raw: unknown) => {
            const event = raw as { key: string; preventDefault: () => void }
            const by: Record<string, number> = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: big, PageDown: -big, Home: min - value, End: max - value }
            if (!(event.key in by)) return
            event.preventDefault()
            nudge(by[event.key])
          },
        }
      : {}
  const labelType = android ? materialType.bodyLarge : { fontSize: theme.length("--slider-label-font-size", 17), lineHeight: theme.length("--slider-label-line-height", 22) }
  return (
    <View testID={testID} style={[styles.root, style]}>
      {label != null ? (
        <View style={[styles.labelRow, { minHeight: android ? 32 : theme.length("--slider-label-height", 44) }]}>
          <Text color={disabled ? "disabled" : "primary"} style={[styles.grow, { fontSize: labelType.fontSize, lineHeight: labelType.lineHeight }]}>
            {label}
          </Text>
          {!hideValue ? (
            <Text tabularNums color={disabled ? "disabled" : android ? "secondary" : theme.color("--slider-value-color", theme.colors.labelSecondary)} style={{ fontSize: labelType.fontSize, lineHeight: labelType.lineHeight }}>
              {text}
            </Text>
          ) : null}
        </View>
      ) : null}
      <View style={[styles.controlRow, { minHeight: android ? 44 : theme.length("--slider-control-height", 52) }]}>
        {startAdornment}
        <View
          {...keys}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={ariaLabel ?? (textOf(label) || undefined)}
          accessibilityState={{ disabled }}
          accessibilityValue={{ min, max, now: value, text }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(event: AccessibilityActionEvent) => nudge(event.nativeEvent.actionName === "increment" ? big : -big)}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={text}
          onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
          // The track follows the finger from where it lands; a scroll view does not take the drag back
          onStartShouldSetResponder={() => !disabled}
          onMoveShouldSetResponder={() => !disabled}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(event) => {
            setActive(true)
            move(event)
          }}
          onResponderMove={move}
          onResponderRelease={(event) => {
            setActive(false)
            if (!disabled) onChangeEnd?.(move(event))
          }}
          onResponderTerminate={() => setActive(false)}
          style={[styles.track, { height: android ? 44 : theme.length("--slider-control-height", 52) }]}
        >
          {android ? (
            <AndroidTrack theme={theme} ratio={ratio} width={width} active={active} disabled={disabled} rangeColor={rangeColor} trackColor={trackColor} />
          ) : (
            <IOSTrack theme={theme} ratio={ratio} width={width} disabled={disabled} rangeColor={rangeColor} trackColor={trackColor} />
          )}
        </View>
        {endAdornment}
      </View>
    </View>
  )
}

type TrackProps = { theme: Theme; ratio: number; width: number; disabled: boolean; rangeColor?: string; trackColor?: string }

function IOSTrack({ theme, ratio, width, disabled, rangeColor, trackColor }: TrackProps) {
  const height = theme.length("--slider-track-size", 6)
  const thumbWidth = theme.length("--slider-thumb-width", 38)
  const thumbHeight = theme.length("--slider-thumb-height", 24)
  const center = thumbWidth / 2 + ratio * Math.max(0, width - thumbWidth)
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center, { opacity: disabled ? 0.5 : 1 }]}>
      <View style={{ height, borderRadius: theme.length("--slider-track-radius", 3), backgroundColor: trackColor ?? theme.color("--slider-track-color"), overflow: "hidden" }}>
        <View style={{ width: center, height, backgroundColor: rangeColor ?? theme.color("--slider-range-color") }} />
      </View>
      <View
        style={{
          position: "absolute",
          left: center - thumbWidth / 2,
          width: thumbWidth,
          height: thumbHeight,
          borderRadius: thumbHeight / 2,
          backgroundColor: theme.color("--slider-thumb-background", "#ffffff"),
          // --slider-thumb-shadow, in the color syntax React Native reads
          boxShadow: "0 0.5px 4px rgba(0, 0, 0, 0.12), 0 6px 13px rgba(0, 0, 0, 0.12)",
        }}
      />
    </View>
  )
}

function AndroidTrack({ theme, ratio, width, active, disabled, rangeColor, trackColor }: TrackProps & { active: boolean }) {
  const m = theme.material
  const track = 16
  // The handle narrows to 2 while it is held, and stands 6 from either part of the track
  const handle = active ? 2 : 4
  const gap = 6
  const center = 2 + ratio * Math.max(0, width - 4)
  const on = disabled ? withAlpha(m.onSurface, 0.38) : (rangeColor ?? m.primary)
  const off = disabled ? withAlpha(m.onSurface, 0.12) : (trackColor ?? m.secondaryContainer)
  const leftWidth = Math.max(0, center - handle / 2 - gap)
  const rightStart = center + handle / 2 + gap
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
      {leftWidth > 0 ? <View style={{ position: "absolute", left: 0, width: leftWidth, height: track, backgroundColor: on, borderTopLeftRadius: track / 2, borderBottomLeftRadius: track / 2, borderTopRightRadius: 2, borderBottomRightRadius: 2 }} /> : null}
      {width - rightStart > 0 ? (
        <View
          style={{
            position: "absolute",
            left: rightStart,
            right: 0,
            height: track,
            backgroundColor: off,
            borderTopRightRadius: track / 2,
            borderBottomRightRadius: track / 2,
            borderTopLeftRadius: 2,
            borderBottomLeftRadius: 2,
            alignItems: "flex-end",
            justifyContent: "center",
            paddingRight: 6,
          }}
        >
          {/* The stop indicator at the end of the track */}
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: on }} />
        </View>
      ) : null}
      <View style={{ position: "absolute", left: center - handle / 2, width: handle, height: 44, borderRadius: handle / 2, backgroundColor: on }} />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { alignSelf: "stretch" },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  grow: { flex: 1, minWidth: 0 },
  controlRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  track: { flex: 1, minWidth: 0 },
  center: { justifyContent: "center" },
})
