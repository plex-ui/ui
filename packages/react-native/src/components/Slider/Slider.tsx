import { useRef, useState, type ReactNode } from "react"
import { Platform, StyleSheet, View, type AccessibilityActionEvent, type GestureResponderEvent, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native"
import Reload from "../../icons/plex/Reload"
import { textOf } from "../../internal/children"
import { withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { materialType } from "../../theme/typography"
import { IconButton } from "../IconButton/IconButton"
import { Text } from "../Text/Text"

export type SliderMark = {
  value: number
  label: string
}

type SliderBaseProps = {
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
  /** Labels under the track, each under the thumb's place at its value. Horizontal only. */
  marks?: SliderMark[]
  /** @default "horizontal" */
  orientation?: "horizontal" | "vertical"
  disabled?: boolean
  /** Symbols at either end of the track (`speaker` and `speaker.wave.3`). Horizontal only. */
  startAdornment?: ReactNode
  endAdornment?: ReactNode
  trackColor?: string
  rangeColor?: string
  /** The name for assistive technologies when there is no text `label`. */
  "aria-label"?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

type SingleSliderProps = SliderBaseProps & {
  /** When false or left out, the slider has one thumb. */
  range?: false
  value: number
  onChange: (value: number) => void
  /** Called once the finger lets go, with the last value. */
  onChangeEnd?: (value: number) => void
  /** A value offered back by a reset button beside the value, shown while the value is another. */
  resetValue?: number
  /** @default "Reset to default" */
  resetTooltip?: string
}

type RangeSliderProps = SliderBaseProps & {
  /** A thumb for each value. */
  range: true
  value: number[]
  onChange: (value: number[]) => void
  onChangeEnd?: (value: number[]) => void
  /** The fewest steps between two thumbs. @default 0 */
  minStepsBetweenThumbs?: number
}

export type SliderProps = SingleSliderProps | RangeSliderProps

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
/** The least room between two marks; closer marks all hide, as on the web. */
const MARK_SPACING = 16
/** The names Radix gives the thumbs of a range, which the web slider keeps. */
const thumbName = (index: number, count: number) => (count === 2 ? (index === 0 ? "Minimum" : "Maximum") : count > 2 ? `Value ${index + 1} of ${count}` : "")

/** A box from `from` to `to` along the track (from its start, or its bottom when vertical), `cross` across it. */
const span = (vertical: boolean, from: number, to: number, cross: number): ViewStyle =>
  vertical ? { position: "absolute", bottom: from, height: Math.max(0, to - from), width: cross } : { position: "absolute", left: from, width: Math.max(0, to - from), height: cross }

/** Corner radii at the start and the end of a part of the track. */
const corners = (vertical: boolean, start: number, end: number): ViewStyle =>
  vertical
    ? { borderBottomLeftRadius: start, borderBottomRightRadius: start, borderTopLeftRadius: end, borderTopRightRadius: end }
    : { borderTopLeftRadius: start, borderBottomLeftRadius: start, borderTopRightRadius: end, borderBottomRightRadius: end }

/**
 * A value in a range, as @plexui/ui's Slider (one thumb or a `range` of them, `marks`, `orientation`, `resetValue`).
 * iOS 26 (`--slider-*` of the phone layer): a 6pt track, the range in `--slider-range-color`, a 38x24 white capsule
 * thumb with `--slider-thumb-shadow`, a 52pt control; the label and the value 17/22 over it, the reset the kit's
 * small round gray button. Android: Material 3's slider (Compose material3): a 16dp track, the active part in
 * `primary` and the rest in `secondaryContainer`, a 4x44dp handle 6dp from either part, a 4dp stop at each free end;
 * a range is Material's RangeSlider, a vertical slider its VerticalSlider.
 */
export function Slider(props: SliderProps) {
  const {
    min = 0,
    max = 100,
    step = 1,
    label,
    unit,
    prefixUnit,
    hideValue = false,
    marks = [],
    orientation = "horizontal",
    disabled = false,
    startAdornment,
    endAdornment,
    trackColor,
    rangeColor,
    "aria-label": ariaLabel,
    testID,
    style,
  } = props
  const theme = useTheme()
  const [length, setLength] = useState(0)
  // The thumb a finger holds
  const [active, setActive] = useState<number | null>(null)
  // A range's thumbs, so a press on the web focuses the thumb it moves and the arrows go on moving it
  const thumbs = useRef<Array<{ focus?: () => void } | null>>([])
  const android = theme.isAndroid
  const vertical = orientation === "vertical"
  const range = props.range === true
  const values = props.range === true ? props.value : [props.value]
  const resetValue = props.range === true ? undefined : props.resetValue
  const gap = props.range === true ? (props.minStepsBetweenThumbs ?? 0) * step : 0
  // The thumb's length along the track: its center runs from half of it to the end less half of it, as UISlider and
  // Material keep it on the track
  const thumb = android ? 4 : theme.length("--slider-thumb-width", 38)
  const control = android ? 44 : theme.length("--slider-control-height", 52)
  const ratio = (value: number) => (max > min ? (clamp(value, min, max) - min) / (max - min) : 0)
  const center = (value: number) => thumb / 2 + ratio(value) * Math.max(0, length - thumb)
  const precision = String(step).split(".")[1]?.length ?? 0
  const format = (value: number) => `${prefixUnit ?? ""}${value.toFixed(precision)}${unit ?? ""}`
  const snap = (raw: number) => {
    const stepped = Math.round((raw - min) / step) * step + min
    return clamp(Number(stepped.toFixed(10)), min, max)
  }
  // A thumb stays between its neighbors, `minStepsBetweenThumbs` apart
  const bounded = (index: number, value: number) => clamp(value, index > 0 ? values[index - 1] + gap : min, index < values.length - 1 ? values[index + 1] - gap : max)
  const emit = (next: number[]) => (props.range === true ? props.onChange(next) : props.onChange(next[0]))
  const emitEnd = (next: number[]) => (props.range === true ? props.onChangeEnd?.(next) : props.onChangeEnd?.(next[0]))
  const set = (index: number, raw: number) => {
    const value = bounded(index, snap(raw))
    if (value === values[index]) return values
    const next = values.slice()
    next[index] = value
    emit(next)
    return next
  }
  const along = (event: GestureResponderEvent) => (vertical ? length - event.nativeEvent.locationY : event.nativeEvent.locationX)
  const valueAt = (position: number) => min + clamp((position - thumb / 2) / Math.max(1, length - thumb), 0, 1) * (max - min)
  // The thumb a press moves: the nearest, the first on a tie, but of thumbs on one value the one on the press's side
  const nearest = (value: number) =>
    values.reduce((best, current, index) => {
      const distance = Math.abs(current - value)
      const bestDistance = Math.abs(values[best] - value)
      return distance < bestDistance || (distance === bestDistance && current === values[best] && value > current) ? index : best
    }, 0)
  const move = (event: GestureResponderEvent, index: number | null) => {
    // A slider disabled during a drag stops changing
    if (disabled) return values
    const raw = valueAt(along(event))
    return set(index ?? nearest(raw), raw)
  }
  const nudge = (index: number, by: number) => {
    if (disabled) return
    const next = set(index, values[index] + by)
    if (next !== values) emitEnd(next)
  }
  const big = Math.max(step, (max - min) / 10)
  const keysFor = (index: number) =>
    Platform.OS === "web" && !disabled
      ? {
          tabIndex: 0 as const,
          onKeyDown: (raw: unknown) => {
            const event = raw as { key: string; preventDefault: () => void }
            const value = values[index]
            const by: Record<string, number> = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: big, PageDown: -big, Home: min - value, End: max - value }
            if (!(event.key in by)) return
            event.preventDefault()
            nudge(index, by[event.key])
          },
        }
      : {}
  const name = ariaLabel ?? (textOf(label) || undefined)
  // Each thumb is adjustable for a screen reader: swipe up or down for a tenth of the range
  const adjustable = (index: number) => {
    const text = format(values[index])
    return {
      ...keysFor(index),
      accessible: true,
      accessibilityRole: "adjustable" as const,
      accessibilityLabel: range ? `${name ?? ""} ${thumbName(index, values.length)}`.trim() || undefined : name,
      accessibilityState: { disabled },
      accessibilityValue: { min, max, now: values[index], text },
      accessibilityActions: [{ name: "increment" }, { name: "decrement" }],
      onAccessibilityAction: (event: AccessibilityActionEvent) => nudge(index, event.nativeEvent.actionName === "increment" ? big : -big),
      "aria-valuemin": min,
      "aria-valuemax": max,
      "aria-valuenow": values[index],
      "aria-valuetext": text,
      // A slider is horizontal unless it says otherwise; React Native has no orientation of its own to tell
      ...(Platform.OS === "web" ? { "aria-orientation": orientation } : {}),
    }
  }
  const labelType = android ? materialType.bodyLarge : { fontSize: theme.length("--slider-label-font-size", 17), lineHeight: theme.length("--slider-label-line-height", 22) }
  const valueColor = disabled ? "disabled" : android ? "secondary" : theme.color("--slider-value-color", theme.colors.labelSecondary)
  // The reset shows while the value is another, and while a finger holds the thumb; hidden, it keeps its place
  const resetHidden = resetValue === undefined || disabled || (values[0] === resetValue && active == null)
  const reset = () => {
    if (props.range === true || resetValue === undefined || disabled || props.value === resetValue) return
    props.onChange(resetValue)
    props.onChangeEnd?.(resetValue)
  }
  const shows = (node: ReactNode) => !vertical && node != null && typeof node !== "boolean" && node !== ""
  const track = (
    <View
      {...(range ? {} : adjustable(0))}
      onLayout={(event: LayoutChangeEvent) => setLength(vertical ? event.nativeEvent.layout.height : event.nativeEvent.layout.width)}
      // The track follows the finger from where it lands; a scroll view does not take the drag back
      onStartShouldSetResponder={() => !disabled}
      onMoveShouldSetResponder={() => !disabled}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(event) => {
        const index = nearest(valueAt(along(event)))
        setActive(index)
        move(event, index)
      }}
      onResponderMove={(event) => move(event, active)}
      onResponderRelease={(event) => {
        setActive(null)
        if (!disabled) emitEnd(move(event, active))
        // On the web the thumb that moved takes the focus, so the arrows go on moving it: on release, as a press's
        // own focus change (to the nearest focusable ancestor) comes after the press is handled
        if (range && Platform.OS === "web" && active != null) thumbs.current[active]?.focus?.()
      }}
      onResponderTerminate={() => setActive(null)}
      style={vertical ? { width: control, flex: 1 } : { height: control }}
    >
      {android ? (
        <AndroidTrack theme={theme} centers={values.map(center)} range={range} vertical={vertical} length={length} active={active} disabled={disabled} rangeColor={rangeColor} trackColor={trackColor} />
      ) : (
        <IOSTrack theme={theme} centers={values.map(center)} range={range} vertical={vertical} length={length} disabled={disabled} rangeColor={rangeColor} trackColor={trackColor} />
      )}
      {/* A range's thumbs are elements of their own for a screen reader and the keyboard; a press goes to the track */}
      {range
        ? values.map((value, index) => (
            <View
              key={index}
              ref={(instance: unknown) => {
                thumbs.current[index] = instance as { focus?: () => void } | null
              }}
              pointerEvents="none"
              {...adjustable(index)}
              style={span(vertical, center(value) - control / 2, center(value) + control / 2, control)}
            />
          ))
        : null}
    </View>
  )
  return (
    <View testID={testID} style={[vertical ? [styles.vertical, { height: theme.length("--slider-vertical-height", 200) }] : styles.root, style]}>
      {label != null ? (
        <View style={[styles.labelRow, { minHeight: android ? 32 : theme.length("--slider-label-height", 44) }, vertical ? styles.verticalLabel : null]}>
          <Text color={disabled ? "disabled" : "primary"} style={[vertical ? null : styles.grow, { fontSize: labelType.fontSize, lineHeight: labelType.lineHeight }]}>
            {label}
          </Text>
          {resetValue !== undefined ? (
            <View
              pointerEvents={resetHidden ? "none" : "auto"}
              accessibilityElementsHidden={resetHidden}
              importantForAccessibility={resetHidden ? "no-hide-descendants" : "auto"}
              aria-hidden={resetHidden}
              style={{ opacity: resetHidden ? 0 : 1 }}
            >
              <IconButton
                icon={<Reload />}
                size="2xs"
                variant="soft"
                color="secondary"
                pill
                disabled={resetHidden}
                accessibilityLabel={props.range === true ? "" : (props.resetTooltip ?? "Reset to default")}
                onPress={reset}
              />
            </View>
          ) : null}
          {!hideValue ? (
            <Text tabularNums color={valueColor} style={{ fontSize: labelType.fontSize, lineHeight: labelType.lineHeight }}>
              {values.map(format).join(" – ")}
            </Text>
          ) : null}
        </View>
      ) : null}
      {vertical ? (
        track
      ) : (
        <View style={styles.controlRow}>
          {shows(startAdornment) ? <View style={[styles.adornment, { height: control }]}>{startAdornment}</View> : null}
          <View style={styles.grow}>
            {track}
            {marks.length > 0 ? <Marks marks={marks} min={min} max={max} center={center} length={length} theme={theme} /> : null}
          </View>
          {shows(endAdornment) ? <View style={[styles.adornment, { height: control }]}>{endAdornment}</View> : null}
        </View>
      )}
    </View>
  )
}

type MarksProps = { marks: SliderMark[]; min: number; max: number; center: (value: number) => number; length: number; theme: Theme }

/**
 * The marks under the track, each centered under the thumb's place at its value and kept inside the track. Marks
 * closer than 16 to each other all hide, as the web's (which first tries to wrap them; a phone row has no room to).
 */
function Marks({ marks, min, max, center, length, theme }: MarksProps) {
  const [widths, setWidths] = useState<Record<number, number>>({})
  const sorted = [...marks].sort((a, b) => a.value - b.value)
  sorted.forEach((mark, index) => {
    if (mark.value < min || mark.value > max) throw new Error(`Slider mark value ${mark.value} is out of bounds [${min}, ${max}]`)
    if (index > 0 && sorted[index - 1].value === mark.value) throw new Error("Slider marks must have unique values")
  })
  const lefts = sorted.map((mark) => (widths[mark.value] == null ? null : clamp(center(mark.value) - widths[mark.value] / 2, 0, Math.max(0, length - widths[mark.value]))))
  const measured = length > 0 && lefts.every((left) => left != null)
  const collide = measured && lefts.some((left, index) => index < lefts.length - 1 && (left as number) + widths[sorted[index].value] + MARK_SPACING > (lefts[index + 1] as number))
  const shown = measured && !collide
  const type = theme.isAndroid ? materialType.bodySmall : { fontSize: 12, lineHeight: 16 }
  return (
    <View accessibilityElementsHidden={!shown} importantForAccessibility={shown ? "auto" : "no-hide-descendants"} aria-hidden={!shown} style={{ marginTop: 4, height: collide ? 0 : type.lineHeight }}>
      {sorted.map((mark, index) => (
        <Text
          key={mark.value}
          numberOfLines={1}
          color={theme.isAndroid ? "secondary" : "primary"}
          onLayout={(event: LayoutChangeEvent) => {
            const width = event.nativeEvent.layout.width
            setWidths((current) => (current[mark.value] === width ? current : { ...current, [mark.value]: width }))
          }}
          style={{ position: "absolute", left: lefts[index] ?? 0, opacity: shown ? 1 : 0, fontSize: type.fontSize, lineHeight: type.lineHeight }}
        >
          {mark.label}
        </Text>
      ))}
    </View>
  )
}

type TrackProps = { theme: Theme; centers: number[]; range: boolean; vertical: boolean; length: number; disabled: boolean; rangeColor?: string; trackColor?: string }

function IOSTrack({ theme, centers, range, vertical, disabled, rangeColor, trackColor }: TrackProps) {
  const size = theme.length("--slider-track-size", 6)
  const thumbAlong = theme.length("--slider-thumb-width", 38)
  const thumbAcross = theme.length("--slider-thumb-height", 24)
  // The fill runs from the start (or the first thumb of a range) to the last thumb's center
  const from = range ? centers[0] : 0
  const to = centers[centers.length - 1]
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center, { opacity: disabled ? 0.5 : 1 }]}>
      <View
        style={[
          vertical ? { width: size, height: "100%" } : { height: size, width: "100%" },
          { borderRadius: theme.length("--slider-track-radius", 3), backgroundColor: trackColor ?? theme.color("--slider-track-color"), overflow: "hidden" },
        ]}
      >
        <View style={[span(vertical, from, to, size), { backgroundColor: rangeColor ?? theme.color("--slider-range-color") }]} />
      </View>
      {centers.map((at, index) => (
        <View
          key={index}
          style={[
            span(vertical, at - thumbAlong / 2, at + thumbAlong / 2, thumbAcross),
            {
              borderRadius: thumbAcross / 2,
              backgroundColor: theme.color("--slider-thumb-background", "#ffffff"),
              // --slider-thumb-shadow, in the color syntax React Native reads
              boxShadow: "0 0.5px 4px rgba(0, 0, 0, 0.12), 0 6px 13px rgba(0, 0, 0, 0.12)",
            },
          ]}
        />
      ))}
    </View>
  )
}

function AndroidTrack({ theme, centers, range, vertical, length, active, disabled, rangeColor, trackColor }: TrackProps & { active: number | null }) {
  const m = theme.material
  const track = 16
  // A handle narrows to 2 while it is held, and stands 6 from either part of the track; the parts meet a handle with
  // 2 corners and end the track with round ones
  const gap = 6
  const inner = 2
  const outer = track / 2
  const on = disabled ? withAlpha(m.onSurface, 0.38) : (rangeColor ?? m.primary)
  const off = disabled ? withAlpha(m.onSurface, 0.12) : (trackColor ?? m.secondaryContainer)
  const handles = centers.map((at, index) => ({ at, width: active === index ? 2 : 4 }))
  const first = handles[0]
  const last = handles[handles.length - 1]
  // Inactive from the start to a range's first handle, active between each handle and the next (from the start for
  // one thumb), inactive from the last handle to the end
  const parts = [
    ...(range ? [{ from: 0, to: first.at - first.width / 2 - gap, color: off, start: outer, end: inner, stop: "start" }] : [{ from: 0, to: first.at - first.width / 2 - gap, color: on, start: outer, end: inner, stop: null }]),
    ...handles.slice(1).map((handle, index) => ({ from: handles[index].at + handles[index].width / 2 + gap, to: handle.at - handle.width / 2 - gap, color: on, start: inner, end: inner, stop: null })),
    { from: last.at + last.width / 2 + gap, to: length, color: off, start: inner, end: outer, stop: "end" },
  ]
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
      {parts.map((part, index) =>
        part.to - part.from > 0 ? (
          <View key={index} style={[span(vertical, part.from, part.to, track), corners(vertical, part.start, part.end), { backgroundColor: part.color }]} />
        ) : null,
      )}
      {/* The stop indicators at the free ends of the track, where an inactive part has room for them */}
      {parts.map((part, index) =>
        part.stop && part.to - part.from > 12 ? (
          <View key={`stop-${index}`} style={[span(vertical, part.stop === "start" ? 6 : length - 10, part.stop === "start" ? 10 : length - 6, 4), { borderRadius: 2, backgroundColor: on }]} />
        ) : null,
      )}
      {handles.map((handle, index) => (
        <View key={`handle-${index}`} style={[span(vertical, handle.at - handle.width / 2, handle.at + handle.width / 2, 44), { borderRadius: handle.width / 2, backgroundColor: on }]} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { alignSelf: "stretch" },
  // A vertical slider stands as high as `--slider-vertical-height`, its label over it, centered
  vertical: { alignSelf: "flex-start", alignItems: "center" },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  verticalLabel: { marginBottom: 8 },
  grow: { flex: 1, minWidth: 0 },
  controlRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  adornment: { justifyContent: "center" },
  center: { justifyContent: "center", alignItems: "center" },
})
