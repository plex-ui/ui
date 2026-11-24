import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { Animated, Platform, StyleSheet, View, type AccessibilityActionEvent, type StyleProp, type ViewStyle } from "react-native"
import { Pressable } from "../../internal/Pressable"
import Minus from "../../icons/plex/Minus"
import Plus from "../../icons/plex/Plus"
import RemoveTrash from "../../icons/plex/RemoveTrash"
import { cssEase, useColorTransition } from "../../internal/transition"
import { mix, withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { Text } from "../Text/Text"

export type StepperProps = {
  /** The controlled value. Use with `onChange`. */
  value?: number
  /** The value when it is initially rendered. Use when you do not need to control the value. @default min */
  defaultValue?: number
  /** Called with the next value after a step. */
  onChange?: (value: number) => void
  /** The lowest value. @default 0 */
  min?: number
  /** The highest value. @default 100 */
  max?: number
  /** The amount each step adds or removes. @default 1 */
  step?: number
  /** A step past `max` continues from `min`, and one below `min` from `max`. @default false */
  wrap?: boolean
  /** Holding a segment keeps stepping, as a native stepper does. @default true */
  autoRepeat?: boolean
  /** When `true`, prevents the user from interacting with the stepper. */
  disabled?: boolean
  /** Fully rounded ends. @default true */
  pill?: boolean
  /**
   * Shows the value between the minus and the plus on one fill, as a cart's quantity: round segments and no
   * separator. Without it the stepper shows no value, as the native one. @default false
   */
  showValue?: boolean
  /** Accessible name of the decrement segment. @default "Decrease" */
  decrementLabel?: string
  /** Accessible name of the increment segment. @default "Increase" */
  incrementLabel?: string
  /**
   * Called when the decrement segment is pressed at `min`. With it, the segment shows a trash can there and removes
   * the item, as a cart's stepper does at a quantity of one (without `wrap`).
   */
  onRemove?: () => void
  /** Accessible name of the decrement segment when it removes. @default "Remove" */
  removeLabel?: string
  /** Accessible name of the value the stepper changes, when no visible label names it. */
  "aria-label"?: string
  /** The `nativeID` of the visible label of the value the stepper changes (Android and the web). */
  "aria-labelledby"?: string
  accessibilityLabel?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

/** Delay before a held segment starts repeating, and the time between repeats, in ms. */
const REPEAT_DELAY = 400
const REPEAT_INTERVAL = 100

const decimals = (n: number) => {
  const [, fraction = ""] = String(n).split(".")
  return fraction.length
}

/** The value one step away, clamped to the range or wrapped, without floating point drift. */
export const stepValue = (current: number, direction: 1 | -1, { min, max, step, wrap }: { min: number; max: number; step: number; wrap: boolean }) => {
  const precision = Math.max(decimals(step), decimals(min), decimals(current))
  const next = Number((current + direction * step).toFixed(precision))
  if (next > max) return wrap ? min : max
  if (next < min) return wrap ? max : min
  return next
}

type Segment = "decrement" | "increment"

/** The first number of a `scale` token ("1.1667 1"): how much wider the minus is drawn than the plus. */
const scaleX = (value: unknown) => {
  const first = typeof value === "number" ? value : parseFloat(String(value ?? ""))
  return Number.isFinite(first) && first > 0 ? first : 1
}

/**
 * The look of the stepper. iOS: the phone layer's tokens, the native 93 x 32 capsule of two 46.5pt segments, each
 * with its own fill (the ink at 6%), a 1 x 24 separator in the tertiary label, 22pt symbols; a pressed segment
 * darkens (15%) at once and fades back in 150ms. Android has no stepper of its own: the same capsule in Material's
 * roles, `surfaceContainerHighest` with the pressed state layer (`onSurface` at 10%), `onSurface` symbols at 38% when
 * they cannot act, and a 48dp target.
 */
function lookOf(theme: Theme, showValue: boolean) {
  const m = theme.material
  const android = theme.isAndroid
  const height = showValue ? theme.length("--stepper-value-height", 36) : theme.length("--stepper-height", 32)
  const fill = android ? m.surfaceContainerHighest : theme.color(showValue ? "--stepper-value-background" : "--stepper-segment-background")
  return {
    height,
    radius: showValue ? theme.length("--stepper-value-radius", 18) : theme.length("--stepper-radius", 16),
    segmentWidth: showValue ? height : theme.length("--stepper-segment-width", 46.5),
    icon: showValue ? theme.length("--stepper-value-icon-size", 20) : theme.length("--stepper-icon-size", 22),
    minusScale: scaleX(theme.token("--stepper-decrement-icon-scale")),
    target: android ? 48 : theme.length("--stepper-target-size", 44),
    // With the value one fill lies under the whole capsule; without it each segment has its own
    background: showValue ? fill : "transparent",
    segment: showValue ? "transparent" : fill,
    pressed: android
      ? showValue
        ? withAlpha(m.onSurface, 0.1)
        : mix(m.onSurface, fill, 0.1)
      : theme.color(showValue ? "--stepper-value-segment-background-active" : "--stepper-segment-background-active"),
    // The kit's symbols are in the label ink, the color the phone layer gives --color-text (the tokens' own is the desktop gray)
    iconColor: android ? m.onSurface : theme.colors.text,
    iconDisabled: android ? withAlpha(m.onSurface, 0.38) : theme.color("--stepper-icon-disabled-color", theme.colors.labelTertiary),
    separator: android ? m.outlineVariant : theme.color("--stepper-separator-color", theme.colors.labelTertiary),
    separatorInset: theme.length("--stepper-separator-inset", 4),
    value: {
      color: android ? m.onSurface : theme.colors.text,
      disabled: android ? withAlpha(m.onSurface, 0.38) : theme.color("--stepper-value-disabled-color", theme.colors.labelTertiary),
      minWidth: theme.length("--stepper-value-min-width", 24),
      fontSize: theme.length("--stepper-value-font-size", 15),
      lineHeight: theme.length("--stepper-value-line-height", 20),
    },
  }
}

/**
 * Two segments that decrease and increase a number, as the iOS 26 stepper (UIStepper) does, and @plexui/ui's
 * Stepper. It shows no value of its own (`showValue` puts it between the segments, as a cart's quantity): name it
 * with `aria-label`. A press steps at once; held, it repeats after 400ms every 100ms. For a screen reader it is one
 * adjustable element: swipe up or down to step (Android: the increment and decrement actions). On the web it is a
 * spin button: Up and Down step, Page Up and Page Down step ten times, Home and End go to the range ends.
 */
export function Stepper({
  value: valueProp,
  defaultValue,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  wrap = false,
  autoRepeat = true,
  disabled = false,
  pill = true,
  showValue = false,
  decrementLabel = "Decrease",
  incrementLabel = "Increase",
  onRemove,
  removeLabel = "Remove",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  accessibilityLabel,
  testID,
  style,
}: StepperProps) {
  const theme = useTheme()
  const look = lookOf(theme, showValue)
  const [internalValue, setInternalValue] = useState(() => defaultValue ?? min)
  const value = valueProp ?? internalValue
  // Timers and handlers read the latest props through refs; an uncontrolled step advances the value at once
  const valueRef = useRef(value)
  const latest = useRef({ onChange, onRemove, min, max, step, wrap, disabled, controlled: valueProp !== undefined })
  useLayoutEffect(() => {
    valueRef.current = value
    latest.current = { onChange, onRemove, min, max, step, wrap, disabled, controlled: valueProp !== undefined }
  })
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [pressed, setPressed] = useState<Segment | null>(null)

  const commit = useCallback((next: number) => {
    if (next === valueRef.current) return false
    // A controlled value changes only when the owner passes it back
    if (!latest.current.controlled) {
      valueRef.current = next
      setInternalValue(next)
    }
    latest.current.onChange?.(next)
    return true
  }, [])

  const stepBy = useCallback(
    (direction: 1 | -1, times = 1) => {
      let next = valueRef.current
      for (let i = 0; i < times; i++) next = stepValue(next, direction, latest.current)
      return commit(next)
    },
    [commit],
  )

  const stopRepeat = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = undefined
    setPressed(null)
  }, [])

  useEffect(() => stopRepeat, [stopRepeat])

  const atMin = !wrap && value <= min
  const atMax = !wrap && value >= max
  // At the minimum the decrement segment removes the item, when the owner can remove it
  const removes = atMin && onRemove !== undefined

  const startPress = (segment: Segment) => {
    if (disabled) return
    if (segment === "decrement" && removes) {
      setPressed(segment)
      latest.current.onRemove?.()
      return
    }
    if (segment === "decrement" ? atMin : atMax) return
    setPressed(segment)
    const direction = segment === "decrement" ? -1 : 1
    stepBy(direction)
    if (!autoRepeat) return
    const repeat = () => {
      if (latest.current.disabled || !stepBy(direction)) return stopRepeat()
      timer.current = setTimeout(repeat, REPEAT_INTERVAL)
    }
    timer.current = setTimeout(repeat, REPEAT_DELAY)
  }

  const keys =
    Platform.OS === "web"
      ? {
          tabIndex: (disabled ? -1 : 0) as 0 | -1,
          onKeyDown: (raw: unknown) => {
            const event = raw as { key: string; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; preventDefault: () => void }
            if (disabled || event.altKey || event.ctrlKey || event.metaKey) return
            const actions: Record<string, () => void> = {
              ArrowUp: () => stepBy(1),
              ArrowDown: () => stepBy(-1),
              PageUp: () => stepBy(1, 10),
              PageDown: () => stepBy(-1, 10),
              Home: () => commit(min),
              End: () => commit(max),
              // At the minimum Delete or Backspace removes, as the trash can does; the arrows never do
              ...(removes && { Delete: () => latest.current.onRemove?.(), Backspace: () => latest.current.onRemove?.() }),
            }
            const action = actions[event.key]
            if (!action) return
            event.preventDefault()
            action()
          },
          role: "spinbutton" as const,
          "aria-keyshortcuts": removes ? "Delete" : undefined,
        }
      : {}

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (disabled) return
    const name = event.nativeEvent.actionName
    if (name === "increment") stepBy(1)
    else if (name === "decrement") stepBy(-1)
    else if (name === "remove") latest.current.onRemove?.()
  }

  const segment = (kind: Segment) => {
    const remove = kind === "decrement" && removes
    const atEnd = !remove && (kind === "decrement" ? atMin : atMax)
    return (
      <StepperSegment
        key={kind}
        kind={kind}
        remove={remove}
        inactive={atEnd || disabled}
        disabled={disabled}
        pressed={pressed === kind && !disabled}
        label={remove ? removeLabel : kind === "decrement" ? decrementLabel : incrementLabel}
        look={look}
        showValue={showValue}
        pill={pill}
        reducedMotion={theme.reducedMotion}
        onPressIn={() => startPress(kind)}
        onPressOut={stopRepeat}
      />
    )
  }

  const radius = pill ? look.height / 2 : look.radius
  return (
    <View
      {...keys}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel ?? ariaLabel}
      aria-labelledby={ariaLabelledBy}
      accessibilityValue={{ min, max, now: value }}
      accessibilityState={{ disabled }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }, ...(removes ? [{ name: "remove", label: removeLabel }] : [])]}
      onAccessibilityAction={onAccessibilityAction}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-disabled={disabled || undefined}
      testID={testID}
      style={[styles.root, { height: look.height, borderRadius: radius, backgroundColor: look.background }, style]}
    >
      {segment("decrement")}
      {/* Drawn over the decrement and under the increment, in the order of the web stepper */}
      {showValue ? null : (
        <View
          pointerEvents="none"
          style={[
            styles.separator,
            {
              top: look.separatorInset,
              height: look.height - 2 * look.separatorInset,
              start: look.segmentWidth - 0.5,
              backgroundColor: look.separator,
            },
          ]}
        />
      )}
      {showValue ? (
        // The adjustable element already reads its value, so the shown one is not read again
        <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={[styles.value, { minWidth: look.value.minWidth }]}>
          <Text
            weight="medium"
            tabularNums
            numberOfLines={1}
            color={disabled ? look.value.disabled : look.value.color}
            style={{ fontSize: look.value.fontSize, lineHeight: look.value.lineHeight }}
          >
            {value}
          </Text>
        </View>
      ) : null}
      {segment("increment")}
    </View>
  )
}

type SegmentProps = {
  kind: Segment
  remove: boolean
  inactive: boolean
  disabled: boolean
  pressed: boolean
  label: string
  look: ReturnType<typeof lookOf>
  showValue: boolean
  pill: boolean
  reducedMotion: boolean
  onPressIn: () => void
  onPressOut: () => void
}

/** A segment: its fill (the pressed one at once, back in 150ms), its symbol and a target of 44pt (48dp) in height. */
function StepperSegment({ kind, remove, inactive, disabled, pressed, label, look, showValue, pill, reducedMotion, onPressIn, onPressOut }: SegmentProps) {
  const fill = useColorTransition(pressed ? look.pressed : look.segment, { duration: pressed ? 0 : 150, easing: cssEase, reducedMotion })
  const Icon = remove ? RemoveTrash : kind === "decrement" ? Minus : Plus
  const radius = pill ? look.height / 2 : look.radius
  const corners: ViewStyle = showValue
    ? { borderRadius: radius }
    : kind === "decrement"
      ? { borderTopStartRadius: radius, borderBottomStartRadius: radius }
      : { borderTopEndRadius: radius, borderBottomEndRadius: radius }
  const slop = Math.max(0, (look.target - look.height) / 2)
  return (
    <Pressable
      accessible={false}
      focusable={false}
      disabled={disabled}
      aria-label={label}
      hitSlop={{ top: slop, bottom: slop }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={styles.segmentTarget}
    >
      <Animated.View style={[styles.segment, corners, { width: look.segmentWidth, height: look.height, backgroundColor: fill }]}>
        <Icon
          size={look.icon}
          color={inactive ? look.iconDisabled : look.iconColor}
          style={kind === "decrement" && !remove && look.minusScale !== 1 ? { transform: [{ scaleX: look.minusScale }] } : undefined}
        />
      </Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  root: { flexDirection: "row", alignItems: "stretch", alignSelf: "flex-start", flexShrink: 0 },
  separator: { position: "absolute", width: 1, borderRadius: 1 },
  segmentTarget: { flexShrink: 0 },
  segment: { alignItems: "center", justifyContent: "center" },
  value: { alignItems: "center", justifyContent: "center", flexShrink: 0 },
})
