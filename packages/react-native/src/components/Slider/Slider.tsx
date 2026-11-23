import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { Animated, Easing, Platform, StyleSheet, View, type AccessibilityActionEvent, type GestureResponderEvent, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native"
import Reload from "../../icons/plex/Reload"
import { textOf } from "../../internal/children"
import { isRTL } from "../../internal/direction"
import { withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { materialType } from "../../theme/typography"
import { IconButton } from "../IconButton/IconButton"
import { androidSwitchOff } from "../Switch/Switch"
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
  /**
   * Android: a stepped picker in place of the plain track: a 6dp dot at each step, the chosen one 12dp, 2dp bars
   * between them, where the steps stand at least 13dp apart. Android's slider snaps to its steps with a plain track,
   * as by default. iOS draws none, as UISlider. @default false
   */
  ticks?: boolean
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
/**
 * Android's stepped picker needs a 6dp dot, 2dp of air on either side of its bars and 3dp more beside the 12dp chosen
 * dot: steps closer than 13dp draw the plain track.
 */
const MIN_TICK_SPACING = 13
/** Android's slider: a 3dp track, a 12dp thumb (16 while held) whose center runs 16 in from either end. */
const ANDROID_TRACK = 3
/**
 * The slider: a thumb glides to its new place in 60ms (an ease-out, cubic-bezier(0, 0, 0.58, 1)) on a stepped track
 * or when the value is set from outside; under a finger on a fine track it follows at once.
 */
const SEEK_GLIDE = { duration: 60, easing: Easing.bezier(0, 0, 0.58, 1) }
/** The stepped picker: the choice moves to the next step in 120ms (cubic-bezier(0.25, 0.1, 0.25, 1)). */
const CHOOSE_GLIDE = { duration: 120, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }
/** The names Radix gives the thumbs of a range, which the web slider keeps. */
const thumbName = (index: number, count: number) => (count === 2 ? (index === 0 ? "Minimum" : "Maximum") : count > 2 ? `Value ${index + 1} of ${count}` : "")

/**
 * A box from `from` to `to` along the track (from its start, or its bottom when vertical), `cross` across it. The
 * start is logical, so a right-to-left layout runs the track from the right, as UISlider and Compose's Slider do
 * (whatever `swapLeftAndRightInRTL` says), and a press is mapped back from that side.
 */
const span = (vertical: boolean, from: number, to: number, cross: number): ViewStyle =>
  vertical ? { position: "absolute", bottom: from, height: Math.max(0, to - from), width: cross } : { position: "absolute", start: from, width: Math.max(0, to - from), height: cross }

/**
 * A value in a range, as @plexui/ui's Slider (one thumb or a `range` of them, `marks`, `orientation`, `resetValue`).
 * iOS 26 (`--slider-*` of the phone layer): a 6pt track, the range in `--slider-range-color`, a 38x24 white capsule
 * thumb with `--slider-thumb-shadow`, a 52pt control; the label and the value 17/22 over it, the reset the kit's
 * small round gray button. Android: a 3dp track, the active part in the accent, a 12dp round thumb that grows to 16
 * while held, with a 32dp halo; with `ticks` a stepped picker, the marks over it. A range and a vertical slider draw
 * the same parts.
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
  // Whether the press in hand runs on a right-to-left track, read as it lands
  const flipped = useRef(false)
  const android = theme.isAndroid
  const vertical = orientation === "vertical"
  const range = props.range === true
  const values = props.range === true ? props.value : [props.value]
  const resetValue = props.range === true ? undefined : props.resetValue
  const gap = props.range === true ? (props.minStepsBetweenThumbs ?? 0) * step : 0
  // The thumb's length along the track: its center runs from half of it to the end less half of it, as UISlider and
  // Android keep it on the track (Android's 32dp selector)
  const thumb = android ? 32 : theme.length("--slider-thumb-width", 38)
  // Android's track answers in the 48dp minimum touch size
  const control = android ? 48 : theme.length("--slider-control-height", 52)
  const ratio = (value: number) => (max > min ? (clamp(value, min, max) - min) / (max - min) : 0)
  const travel = Math.max(0, length - thumb)
  // Android's dots: one at each step, where the thumb stands on it
  const stepCount = step > 0 ? (max - min) / step : 0
  const steps = Math.round(stepCount)
  const corner = 0
  const discrete = android && props.ticks === true && steps >= 1 && Math.abs(stepCount - steps) < 1e-6 && travel / steps >= MIN_TICK_SPACING
  const offsetAt = (fraction: number) => (discrete && fraction > 0 && fraction < 1 ? corner + fraction * (travel - 2 * corner) : fraction * travel)
  const center = (value: number) => thumb / 2 + offsetAt(ratio(value))
  const ticks = discrete ? Array.from({ length: steps + 1 }, (_, index) => thumb / 2 + corner + (index / steps) * (travel - 2 * corner)) : []
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
  // locationX is physical: a right-to-left track counts from the right
  const along = (event: GestureResponderEvent) =>
    vertical ? length - event.nativeEvent.locationY : flipped.current ? length - event.nativeEvent.locationX : event.nativeEvent.locationX
  // A discrete track maps a press through the ticks' layout, so a press on a tick lands on its step
  const valueAt = (position: number) =>
    min +
    clamp(discrete ? (position - thumb / 2 - corner) / Math.max(1, travel - 2 * corner) : (position - thumb / 2) / Math.max(1, travel), 0, 1) * (max - min)
  // The thumb a press moves: the nearest, the first on a tie, but of thumbs on one value the one on the press's side
  const nearest = (value: number) =>
    values.reduce((best, current, index) => {
      const distance = Math.abs(current - value)
      const bestDistance = Math.abs(values[best] - value)
      return distance < bestDistance || (distance === bestDistance && current === values[best] && value > current) ? index : best
    }, 0)
  // The values a finger set last: on Android's plain track the thumb stands on them at once
  const [fingerSet, setFingerSet] = useState<string | null>(null)
  const move = (event: GestureResponderEvent, index: number | null) => {
    // A slider disabled during a drag stops changing
    if (disabled) return values
    const raw = valueAt(along(event))
    const next = set(index ?? nearest(raw), raw)
    if (next !== values) setFingerSet(next.join(" "))
    return next
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
            const event = raw as { key: string; preventDefault: () => void; currentTarget?: unknown }
            const value = values[index]
            // A right-to-left track grows to the left, so the left arrow raises it (Radix's slider); a vertical one keeps its keys
            const forward = !vertical && isRTL(event.currentTarget) ? -step : step
            const by: Record<string, number> = { ArrowRight: forward, ArrowUp: step, ArrowLeft: -forward, ArrowDown: -step, PageUp: big, PageDown: -big, Home: min - value, End: max - value }
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
        flipped.current = !vertical && isRTL(event.currentTarget)
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
      // A tap on a touch screen ends with emulated mouse events, whose mousedown would take the focus the release just
      // gave a thumb; the track keeps its press to itself (a range's thumbs take the focus on release instead)
      {...(range && !disabled && Platform.OS === "web" ? { onMouseDown: (event: { preventDefault: () => void }) => event.preventDefault() } : {})}
      style={vertical ? { width: control, flex: 1 } : { height: control }}
    >
      {android ? (
        <AndroidTrack
          theme={theme}
          centers={values.map(center)}
          ticks={ticks}
          range={range}
          vertical={vertical}
          length={length}
          active={active}
          disabled={disabled}
          rangeColor={rangeColor}
          trackColor={trackColor}
          edge={thumb / 2}
        />
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
  // Android's marks over the track push it down by what they stand above it
  const lift = android && marks.length > 0 ? ANDROID_MARK.lineHeight - MARKS_OVERLAP : 0
  const body = (
    // No token defines --slider-vertical-height: Slider.module.css falls back to 200px, as here
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
          {shows(startAdornment) ? <View style={[styles.adornment, { height: control, marginTop: lift }]}>{startAdornment}</View> : null}
          <View style={styles.grow}>
            {/* Android writes the labels of its stepped picker over the dots; iOS writes them under the track */}
            {android && marks.length > 0 ? <Marks marks={marks} min={min} max={max} center={center} length={length} edge={thumb / 2} stepLength={(travel * step) / Math.max(1e-9, max - min)} theme={theme} /> : null}
            {track}
            {!android && marks.length > 0 ? <Marks marks={marks} min={min} max={max} center={center} length={length} edge={thumb / 2} stepLength={0} theme={theme} /> : null}
          </View>
          {shows(endAdornment) ? <View style={[styles.adornment, { height: control, marginTop: lift }]}>{endAdornment}</View> : null}
        </View>
      )}
    </View>
  )
  // Android's plain track: the thumb follows the finger 1:1 and a tap puts it there at once. Steps far enough apart to
  // see (as far as the stepped picker's dots need) make it glide 60ms to each step, as Android's seek bar with
  // separators; a value set from outside glides on any track
  const stepped = (travel * step) / Math.max(1e-9, max - min) >= MIN_TICK_SPACING
  const follow = !discrete && !stepped && fingerSet === values.join(" ")
  // Android's thumbs glide to their places, and the marks take the accent as a thumb nears them: the scope holds a
  // glide for each thumb (a new count of thumbs starts a new scope)
  return android ? (
    <GlideScope key={values.length} centers={values.map(center)} length={length} still={theme.reducedMotion || follow} glide={discrete ? CHOOSE_GLIDE : SEEK_GLIDE}>
      {body}
    </GlideScope>
  ) : (
    body
  )
}

type Glide = { duration: number; easing: (value: number) => number }
/** The thumbs' centers along the track as they glide, from the start (Android). */
const GlideContext = createContext<Animated.Value[]>([])

function GlideScope({ centers, length, still, glide, children }: { centers: number[]; length: number; still: boolean; glide: Glide; children: ReactNode }) {
  const [glides] = useState(() => centers.map((at) => new Animated.Value(at)))
  // A new length places the thumbs at once: only a new value glides
  const laidOut = useRef(length)
  const targets = centers.join(" ")
  useEffect(() => {
    const to = targets.split(" ").map(Number)
    const jump = still || laidOut.current !== length
    laidOut.current = length
    if (jump) {
      glides.forEach((value, index) => {
        value.stopAnimation()
        value.setValue(to[index])
      })
      return
    }
    const animation = Animated.parallel(glides.map((value, index) => Animated.timing(value, { toValue: to[index], ...glide, useNativeDriver: false })))
    animation.start()
    return () => animation.stop()
  }, [targets, length, still, glide, glides])
  return <GlideContext.Provider value={glides}>{children}</GlideContext.Provider>
}

type MarksProps = { marks: SliderMark[]; min: number; max: number; center: (value: number) => number; length: number; edge: number; stepLength: number; theme: Theme }

/**
 * The marks of the scale, each centered on the thumb's place at its value and kept inside the track. Marks closer than
 * 16 to each other all hide, as the web's (which first tries to wrap them; a phone row has no room to). iOS writes
 * them under the track; Android over it, as its stepped picker: 13dp in the secondary gray,
 * the one a thumb stands on in the accent, the end ones lined up with the outer edges of the end dots.
 */
function Marks({ marks, min, max, center, length, edge, stepLength, theme }: MarksProps) {
  const [widths, setWidths] = useState<Record<number, number>>({})
  const glides = useContext(GlideContext)
  const android = theme.isAndroid
  const sorted = [...marks].sort((a, b) => a.value - b.value)
  sorted.forEach((mark, index) => {
    if (mark.value < min || mark.value > max) throw new Error(`Slider mark value ${mark.value} is out of bounds [${min}, ${max}]`)
    if (index > 0 && sorted[index - 1].value === mark.value) throw new Error("Slider marks must have unique values")
  })
  // Android's end labels start and end with the 6dp end dots (3dp out from their centers)
  const [low, high] = android ? [edge - 3, length - edge + 3] : [0, length]
  const lefts = sorted.map((mark) => (widths[mark.value] == null ? null : clamp(center(mark.value) - widths[mark.value] / 2, low, Math.max(low, high - widths[mark.value]))))
  const measured = length > 0 && lefts.every((left) => left != null)
  const collide = measured && lefts.some((left, index) => index < lefts.length - 1 && (left as number) + widths[sorted[index].value] + MARK_SPACING > (lefts[index + 1] as number))
  const shown = measured && !collide
  const type = android ? ANDROID_MARK : { fontSize: 12, lineHeight: 16 }
  const accent = theme.material.primary
  return (
    <View
      pointerEvents={android ? "none" : undefined}
      accessibilityElementsHidden={!shown}
      importantForAccessibility={shown ? "auto" : "no-hide-descendants"}
      aria-hidden={!shown}
      // The stepped picker: the labels' baseline 20dp over the dots' centers, in the 48dp track's upper half; the row
      // keeps its room when they hide, so the adornments stay level with the track
      style={android ? styles.androidMarks : { marginTop: 4, height: collide ? 0 : type.lineHeight }}
    >
      {sorted.map((mark, index) => {
        const place = { position: "absolute" as const, start: lefts[index] ?? 0, opacity: shown ? 1 : 0 }
        const label = (color: string, key?: number) => (
          <Text
            key={key}
            numberOfLines={1}
            color={color}
            onLayout={(event: LayoutChangeEvent) => {
              const width = event.nativeEvent.layout.width
              setWidths((current) => (current[mark.value] === width ? current : { ...current, [mark.value]: width }))
            }}
            style={[android ? null : place, { fontSize: type.fontSize, lineHeight: type.lineHeight }]}
          >
            {mark.label}
          </Text>
        )
        if (!android) return label("primary", mark.value)
        // The accent copy fades in as a thumb comes within a step of the mark, as Android blends the label's color
        const at = center(mark.value)
        const reach = Math.max(1, stepLength)
        const near = glides.length > 0 ? clampUnit(glides.map((glide) => glide.interpolate({ inputRange: [at - reach, at, at + reach], outputRange: [0, 1, 0], extrapolate: "clamp" }))) : 0
        return (
          <View key={mark.value} style={place}>
            {label("secondary")}
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: near }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
              <Text numberOfLines={1} color={accent} style={{ fontSize: type.fontSize, lineHeight: type.lineHeight }}>
                {mark.label}
              </Text>
            </Animated.View>
          </View>
        )
      })}
    </View>
  )
}

/** The stepped picker's labels: 13dp, reaching 8dp into the track's 48dp. */
const ANDROID_MARK = { fontSize: 13, lineHeight: 16 }
const MARKS_OVERLAP = 8

type Amount = number | Animated.Value | Animated.AnimatedInterpolation<number> | ReturnType<typeof Animated.add> | ReturnType<typeof Animated.subtract> | ReturnType<typeof Animated.multiply>

/** Every node that moves can be mapped through a range; their own types do not say so with one signature. */
const mapped = (amount: Exclude<Amount, number>) => amount as Animated.Value

/** The sum of several amounts, held to 0..1. */
const clampUnit = (amounts: Amount[]) => {
  const sum = amounts.slice(1).reduce<Amount>((total, amount) => Animated.add(total, amount), amounts[0] ?? 0)
  return typeof sum === "number" ? clamp(sum, 0, 1) : mapped(sum).interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: "clamp" })
}

/** `span` for amounts that move: from `start` along the track, `size` long, `cross` across it. */
const moving = (vertical: boolean, start: Amount, size: Amount, cross: number) =>
  (vertical ? { position: "absolute", bottom: start, height: size, width: cross } : { position: "absolute", start, width: size, height: cross }) as Animated.WithAnimatedValue<ViewStyle>

type TrackProps = { theme: Theme; centers: number[]; range: boolean; vertical: boolean; length: number; disabled: boolean; rangeColor?: string; trackColor?: string }

function IOSTrack({ theme, centers, range, vertical, disabled, rangeColor, trackColor }: TrackProps) {
  const size = theme.length("--slider-track-size", 6)
  const thumbAlong = theme.length("--slider-thumb-width", 38)
  const thumbAcross = theme.length("--slider-thumb-height", 24)
  // The fill runs from the start (or the first thumb of a range) to the last thumb's center
  const from = range ? centers[0] : 0
  const to = centers[centers.length - 1]
  const shadow = theme.token("--slider-thumb-shadow")
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
              // The resolver writes the shadow's colors as rgba(), which React Native reads; the kit's value without it
              boxShadow: typeof shadow === "string" ? shadow : "0 0.5px 4px rgba(0, 0, 0, 0.12), 0 6px 13px rgba(0, 0, 0, 0.12)",
            },
          ]}
        />
      ))}
    </View>
  )
}

function AndroidTrack({ theme, centers, ticks, range, vertical, length, active, disabled, rangeColor, trackColor, edge }: TrackProps & { active: number | null; ticks: number[]; edge: number }) {
  const m = theme.material
  // Android: the track in the progress background (the text at 8%, 16% at night), the part to the thumb and the
  // thumb in the progress color (the accent here). The stepped picker draws its dots and bars in the switch's gray past
  // the choice. A disabled slider dims to half
  const on = rangeColor ?? m.primary
  const glides = useContext(GlideContext)
  const still = theme.reducedMotion
  if (ticks.length > 1) {
    return (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center, disabled ? styles.dim : null]}>
        <AndroidSteps ticks={ticks} glides={glides} range={range} vertical={vertical} on={on} off={trackColor ?? androidSwitchOff(theme)} />
        {glides.map((glide, index) => (
          <AndroidThumb key={index} center={glide} held={active === index} stepped on={on} vertical={vertical} still={still} />
        ))}
      </View>
    )
  }
  const off = trackColor ?? withAlpha(m.onSurface, theme.scheme === "dark" ? 0.16 : 0.08)
  const line = ANDROID_TRACK
  // The fill follows the thumbs as they glide
  const first = glides[0] ?? centers[0]
  const last = glides[glides.length - 1] ?? centers[centers.length - 1]
  const from: Amount = range ? first : edge
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center, disabled ? styles.dim : null]}>
      <View style={[span(vertical, edge, length - edge, line), { borderRadius: line / 2, backgroundColor: off }]} />
      <Animated.View style={[moving(vertical, from, Animated.subtract(last, from), line), { borderRadius: line / 2, backgroundColor: on }]} />
      {glides.map((glide, index) => (
        <AndroidThumb key={index} center={glide} held={active === index} stepped={false} on={on} vertical={vertical} still={still} />
      ))}
    </View>
  )
}

/**
 * A thumb on Android. The slider's grows from 12dp to 16 while held, 1dp of radius per 60ms, with a 32dp halo of
 * its color at 16%; the stepped picker's stays 12dp, its 24dp halo at 31% opening in 150ms while held.
 */
function AndroidThumb({ center, held, stepped, on, vertical, still }: { center: Animated.Value; held: boolean; stepped: boolean; on: string; vertical: boolean; still: boolean }) {
  const [radius] = useState(() => new Animated.Value(6))
  const [halo] = useState(() => new Animated.Value(0))
  useEffect(() => {
    const to = held && !stepped ? 8 : 6
    if (still) {
      radius.stopAnimation()
      radius.setValue(to)
      return
    }
    radius.stopAnimation((from) => Animated.timing(radius, { toValue: to, duration: Math.abs(to - from) * 60, easing: Easing.linear, useNativeDriver: false }).start())
  }, [held, stepped, still, radius])
  useEffect(() => {
    if (!stepped || still) {
      halo.stopAnimation()
      halo.setValue(held ? 1 : 0)
      return
    }
    Animated.timing(halo, { toValue: held ? 1 : 0, duration: 150, easing: CHOOSE_GLIDE.easing, useNativeDriver: false }).start()
  }, [held, stepped, still, halo])
  const haloSize = stepped ? 24 : 32
  return (
    <>
      {stepped || held ? (
        <Animated.View
          style={[
            moving(vertical, Animated.add(center, -haloSize / 2), haloSize, haloSize),
            { borderRadius: haloSize / 2, backgroundColor: withAlpha(on, stepped ? 80 / 255 : 0.16), transform: [{ scale: stepped ? halo : 1 }] },
          ]}
        />
      ) : null}
      {/* A 16dp circle scaled to the radius */}
      <Animated.View style={[moving(vertical, Animated.add(center, -8), 16, 16), { borderRadius: 8, backgroundColor: on, transform: [{ scale: Animated.multiply(radius, 1 / 8) }] }]} />
    </>
  )
}

/**
 * Android's stepped picker, its numbers on our track: a 6dp dot at each step, growing to 12dp as a
 * thumb comes onto it; 2dp bars between the dots, 2dp clear of them, that give 3dp more room to a chosen dot. The dots
 * and bars up to the thumb (between the thumbs of a range) take the fill's color, the rest the gray.
 */
function AndroidSteps({ ticks, glides, range, vertical, on, off }: { ticks: number[]; glides: Animated.Value[]; range: boolean; vertical: boolean; on: string; off: string }) {
  const pitch = ticks[1] - ticks[0]
  const bump = (at: number) => clampUnit(glides.map((glide) => glide.interpolate({ inputRange: [at - pitch, at, at + pitch], outputRange: [0, 1, 0], extrapolate: "clamp" })))
  const first = glides[0]
  const last = glides[glides.length - 1]
  // 1 while the last thumb is on or past the step, 0 a step before it; for a range, also not before the first thumb
  const upTo = (at: number) => last.interpolate({ inputRange: [at - pitch, at], outputRange: [0, 1], extrapolate: "clamp" })
  const from = (at: number) => first.interpolate({ inputRange: [at, at + pitch], outputRange: [1, 0], extrapolate: "clamp" })
  const tint = (amount: Amount) => (typeof amount === "number" ? (amount >= 0.5 ? on : off) : mapped(amount).interpolate({ inputRange: [0, 1], outputRange: [off, on] }))
  return (
    <>
      {ticks.map((at, index) => {
        const color = tint(range ? Animated.multiply(upTo(at), from(at)) : upTo(at))
        const grown = bump(at)
        const scale = typeof grown === "number" ? 1 + grown : Animated.add(grown, 1)
        const dot = <Animated.View key={`dot-${index}`} style={[moving(vertical, at - 3, 6, 6), { borderRadius: 3, backgroundColor: color, transform: [{ scale }] }]} />
        if (index === 0) return dot
        // The bar from the last dot to this one: 3dp of dot and 2dp of air off each end, 3dp more beside a chosen dot
        const before = ticks[index - 1]
        const near = bump(before)
        const far = grown
        const start = Animated.add(Animated.multiply(near, 3), before + 5)
        const size = mapped(Animated.subtract(at - before - 10, Animated.multiply(Animated.add(near, far), 3))).interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolateLeft: "clamp" })
        const barColor = tint(range ? Animated.multiply(upTo(at), from(before)) : upTo(at))
        return [<Animated.View key={`bar-${index}`} style={[moving(vertical, start, size, 2), { borderRadius: 1, backgroundColor: barColor }]} />, dot]
      })}
    </>
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
  dim: { opacity: 0.5 },
  androidMarks: { height: ANDROID_MARK.lineHeight, marginBottom: -MARKS_OVERLAP },
})
