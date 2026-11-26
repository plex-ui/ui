import { useContext, useEffect, useState, type ReactNode } from "react"
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { Pressable } from "../../internal/Pressable"
import Svg, { Path } from "react-native-svg"
import CheckMd from "../../icons/plex/CheckMd"
import Minus from "../../icons/plex/Minus"
import { spaceToggles, useDescription } from "../../internal/a11y"
import { ControlLabel, controlLabelLine } from "../../internal/ControlLabel"
import { RowActionContext, RowEndContext, RowHoldContext, RowStartContext, holdProps, rowHint, rowHold } from "../../internal/row"
import { androidGray, withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import { ANDROID_ROW_END, iosCheckmarkColor, selectionColor } from "../Switch/Switch"

export type CheckboxProps = {
  checked?: boolean | "indeterminate"
  defaultChecked?: boolean | "indeterminate"
  onCheckedChange?: (nextState: boolean) => void
  label?: ReactNode
  description?: ReactNode
  /** Where the box stands against the label. @default "left" */
  orientation?: "left" | "right"
  /** `ghost`: the checkmark alone, as an iOS list row draws it. @default "solid" */
  variant?: "solid" | "ghost"
  /** Kept for the API of @plexui/ui: the phone box is a circle on both platforms. */
  pill?: boolean
  invalid?: boolean
  disabled?: boolean
  accessibilityLabel?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

/** Android's round check: a 20dp circle (the reference's 19.8), in a 48dp target that reaches 14dp past it. */
const ANDROID_BOX = 20
const ANDROID_REACH = (48 - ANDROID_BOX) / 2
/** A checkbox with a label: the text starts 11dp after the circle (the web's -3 margin and 14 of the target). */
const ANDROID_LABEL_GAP = 11
/** A checkbox at a List row's end stands 21dp in from the row's edge. */
const ANDROID_ROW_INSET = 21
/** The ring of an empty circle, 1.5dp. */
const ANDROID_RING = 1.5
/** Android's check eases both ways on cubic-bezier(0.37, 0, 0.63, 1) (the web's `--android-checkbox-ease`). */
const androidCheckEase = Easing.bezier(0.37, 0, 0.63, 1)

/**
 * A checkbox: on iOS the 22pt circle of the phone layer (`--checkbox-*`: a 1.5pt ring, filled in the primary with a
 * check), on Android the reference's round check (a 20dp circle, a 1.5dp ring in a light gray, filled in the
 * selection color with a white round-capped check) in a 48dp target. As the first control of a List row (`RowStart`)
 * it leads the row, 22 in.
 */
export function Checkbox({
  checked: checkedProp,
  defaultChecked = false,
  onCheckedChange,
  label,
  description,
  orientation = "left",
  variant = "solid",
  invalid = false,
  disabled = false,
  accessibilityLabel,
  testID,
  style,
}: CheckboxProps) {
  const theme = useTheme()
  // At a List row's end with no text of its own: the row is its label. Leading the row (Android's multi-select row),
  // the row sets its place
  const atRowStart = useContext(RowStartContext) && label == null && description == null
  const inRow = useContext(RowEndContext) != null && label == null && description == null && !atRowStart
  const hold = useContext(RowHoldContext)
  // A row's touch and hold, held here, where the row's touches and its screen reader focus are
  const rowAction = useContext(RowActionContext)
  const [own, setOwn] = useState(defaultChecked)
  const state = checkedProp ?? own
  const on = state !== false
  // Android's round check, as the web's: the ring and the fill turn in 150ms, then the mark is drawn from its start
  // in 150ms; unchecking fades the mark out in 150ms as the fill goes. Android only: iOS shows a list row's
  // checkmark, which does not animate
  const [fillIn] = useState(() => new Animated.Value(on ? 1 : 0))
  const [draw] = useState(() => new Animated.Value(on ? 1 : 0))
  const [markIn] = useState(() => new Animated.Value(on ? 1 : 0))
  const animate = theme.isAndroid && !disabled
  useEffect(() => {
    const values = [fillIn, draw, markIn]
    // A disabled box snaps: no motion between enabled and disabled
    if (theme.reducedMotion || !animate) {
      values.forEach((value) => {
        value.stopAnimation()
        value.setValue(on ? 1 : 0)
      })
      return
    }
    const timing = (value: Animated.Value, toValue: number, delay = 0) =>
      Animated.timing(value, { toValue, duration: 150, delay, easing: androidCheckEase, useNativeDriver: false })
    const animation = on
      ? Animated.parallel([timing(fillIn, 1), Animated.sequence([Animated.timing(markIn, { toValue: 1, duration: 0, useNativeDriver: false }), timing(draw, 1, 150)])])
      : Animated.parallel([timing(fillIn, 0), Animated.sequence([timing(markIn, 0), Animated.timing(draw, { toValue: 0, duration: 0, useNativeDriver: false })])])
    animation.start()
    return () => animation.stop()
  }, [on, animate, theme.reducedMotion, fillIn, draw, markIn])
  const toggle = () => {
    if (disabled) return
    // An indeterminate box checks on a press, as Radix does on the web
    const next = state !== true
    if (checkedProp === undefined) setOwn(next)
    onCheckedChange?.(next)
  }
  const Glyph = state === "indeterminate" ? Minus : CheckMd
  let box: ReactNode
  const hasText = label != null || description != null
  if (theme.isAndroid) {
    // The ring a light gray (#B0B9C2, --gray-500 at night), the fill the selection color, the error when invalid
    // (in a List row the error is the row's line: the circle keeps its colors). The mark is the fill's own text
    // color: white on the accent and on the ink of a light theme, dark on the near-white primary at night
    const m = theme.material
    const red = invalid && !inRow && !atRowStart
    const ring = red ? m.error : androidGray(theme, "checkboxRing")
    const fill = red ? m.error : selectionColor(theme)
    const markColor = red ? m.onError : theme.color(`--color-text-${theme.selectionColor}-solid`, "#FFFFFF")
    // The 48dp target reaches past the circle without taking room: on the outer side the circle keeps the row's edge,
    // on the label's side the text starts 11dp after it. At a List row's end the circle stands 21dp in; leading a
    // row the row places it
    const reach: ViewStyle = atRowStart
      ? { margin: -ANDROID_REACH }
      : inRow
        ? { marginStart: -ANDROID_REACH, marginEnd: -(ANDROID_REACH - (ANDROID_ROW_INSET - ANDROID_ROW_END)) }
        : orientation === "right"
          ? { marginEnd: -ANDROID_REACH, marginStart: hasText ? -(ANDROID_REACH - ANDROID_LABEL_GAP) : 0 }
          : { marginStart: -ANDROID_REACH, marginEnd: hasText ? -(ANDROID_REACH - ANDROID_LABEL_GAP) : 0 }
    // No press of its own: a row shows the press. Disabled, the circle keeps its colors at half (as a checkbox row's)
    box = (
      <View style={[styles.androidTarget, reach]}>
        <View style={disabled ? styles.half : null}>
          <AndroidCheck fillIn={fillIn} draw={draw} markIn={markIn} ring={ring} fill={fill} markColor={markColor} indeterminate={state === "indeterminate"} />
        </View>
      </View>
    )
  } else {
    const size = theme.length("--checkbox-indicator-size", 22)
    // An invalid box keeps its red when checked, as on the web (`--checkbox-paint-background`)
    const fill = disabled ? theme.colors.textDisabled : invalid ? theme.color("--input-border-color-invalid") : selectionColor(theme)
    const ring = invalid ? theme.color("--input-border-color-invalid") : theme.color("--alpha-16")
    box =
      variant === "ghost" ? (
        <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
          {on ? <Glyph size={theme.length("--checkbox-ghost-icon-size", 26)} color={disabled ? theme.colors.textDisabled : iosCheckmarkColor(theme)} /> : null}
        </View>
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: on ? 0 : theme.length("--checkbox-border-width", 1.5),
            borderColor: ring,
            backgroundColor: on ? fill : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* The fill's own text color: white on the accent, dark on the near-white primary at night */}
          {on ? <Glyph size={16} color={disabled ? theme.color("--color-text-primary-solid") : invalid ? theme.color("--color-text-danger-solid", "#FFFFFF") : theme.color(`--color-text-${theme.selectionColor}-solid`, "#FFFFFF")} /> : null}
        </View>
      )
  }
  // iOS: the 22pt circle stands in its 44pt target, as the web's phone checkbox (a 44pt button with the circle in its
  // middle), so the label starts 6 past the target (`--checkbox-label-gap`), or ends 12 before it on the right. At a
  // row's end the target reaches past the circle on both sides, so the circle keeps the row's edge, as the web's
  if (!theme.isAndroid) {
    const target = theme.length("--checkbox-target-size", 44)
    const reach = inRow ? -(target - theme.length("--checkbox-indicator-size", 22)) / 2 : 0
    box = <View style={{ width: target, height: target, marginHorizontal: reach, alignItems: "center", justifyContent: "center" }}>{box}</View>
  }
  const targetSize = theme.isAndroid ? 48 : theme.length("--checkbox-target-size", 44)
  const described = useDescription(description)
  const text = <ControlLabel label={label} description={description} disabled={disabled} descriptionId={described.id} />
  return (
    <Pressable
      {...described.props}
      {...spaceToggles(toggle)}
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel ?? (typeof label === "string" ? label : undefined)}
      accessibilityState={{ checked: state === "indeterminate" ? "mixed" : state, disabled }}
      aria-checked={state === "indeterminate" ? "mixed" : state}
      aria-invalid={invalid || undefined}
      disabled={disabled}
      {...rowHold(hold)}
      {...holdProps({}, inRow || atRowStart ? rowAction : null)}
      {...rowHint(rowAction, described)}
      onPress={toggle}
      testID={testID}
      style={[
        styles.row,
        hasText ? styles.top : null,
        // Android's gap is in the target's margins
        { gap: theme.isAndroid ? 0 : orientation === "right" ? 12 : theme.length("--checkbox-label-gap", 6), minHeight: theme.isAndroid ? 48 : theme.length("--checkbox-target-size", 44) },
        orientation === "right" ? styles.reverse : null,
        style,
      ]}
    >
      {box}
      {/* The mark centers on the label's first line, as the web's indicator: the text starts half the target less a
          line down, so a description or a wrapped label runs on under the mark */}
      {hasText ? <View style={[styles.grow, { paddingTop: (targetSize - controlLabelLine(theme)) / 2 }, orientation === "right" ? styles.fill : null]}>{text}</View> : null}
    </Pressable>
  )
}

/** The reference's check in its 20dp circle, and the dash of a mixed one: 2dp strokes with round ends. */
const CHECK_PATH = "M5.2 11l3 3 6.6-6.6"
const DASH_PATH = "M6 10h8"

/**
 * Android's round check: a 20dp circle whose 1.5dp ring turns from the gray to the fill as the fill comes in
 * (`fillIn`), and the mark, shown by `markIn` and drawn from its start as a clip opens over it (`draw`).
 */
function AndroidCheck({
  fillIn,
  draw,
  markIn,
  ring,
  fill,
  markColor,
  indeterminate,
}: {
  fillIn: Animated.Value
  draw: Animated.Value
  markIn: Animated.Value
  ring: string
  fill: string
  markColor: string
  indeterminate: boolean
}) {
  const borderColor = fillIn.interpolate({ inputRange: [0, 1], outputRange: [ring, fill] })
  const backgroundColor = fillIn.interpolate({ inputRange: [0, 1], outputRange: [withAlpha(fill, 0), fill] })
  return (
    <Animated.View style={[styles.androidCircle, { borderColor, backgroundColor }]}>
      <Animated.View pointerEvents="none" style={[styles.androidClip, { opacity: markIn, width: draw.interpolate({ inputRange: [0, 1], outputRange: [0, ANDROID_BOX] }) }]}>
        <Svg width={ANDROID_BOX} height={ANDROID_BOX} viewBox="0 0 20 20">
          <Path d={indeterminate ? DASH_PATH : CHECK_PATH} fill="none" stroke={markColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", alignSelf: "stretch" },
  top: { alignItems: "flex-start" },
  reverse: { flexDirection: "row-reverse" },
  grow: { flexShrink: 1, minWidth: 0 },
  // A label before the mark fills the row, so the mark ends it, as the control of a settings row
  fill: { flexGrow: 1 },
  androidTarget: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  half: { opacity: 0.5 },
  androidCircle: { width: ANDROID_BOX, height: ANDROID_BOX, borderRadius: ANDROID_BOX / 2, borderWidth: ANDROID_RING },
  // The mark spans the circle's box, over its ring
  androidClip: { position: "absolute", top: -ANDROID_RING, left: -ANDROID_RING, height: ANDROID_BOX, overflow: "hidden" },
})
