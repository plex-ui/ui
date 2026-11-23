import { useContext, useEffect, useState, type ReactNode } from "react"
import { Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import CheckMd from "../../icons/plex/CheckMd"
import Minus from "../../icons/plex/Minus"
import { spaceToggles, useDescription } from "../../internal/a11y"
import { ControlLabel, controlLabelLine } from "../../internal/ControlLabel"
import { RowEndContext, RowHoldContext, rowHold } from "../../internal/row"
import { withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import { ANDROID_ROW_END, androidEaseInOut, iosCheckmarkColor, selectionColor } from "../Switch/Switch"

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
  /** Kept for the API of @plexui/ui: the phone box is a circle on iOS and a square on Android. */
  pill?: boolean
  invalid?: boolean
  disabled?: boolean
  accessibilityLabel?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

/** Android's square checkbox: an 18dp box with 4dp corners, in a 48dp target that reaches 15dp past it. */
const ANDROID_BOX = 18
const ANDROID_REACH = (48 - ANDROID_BOX) / 2
/** A checkbox row: the text starts 11dp after the box. */
const ANDROID_LABEL_GAP = 11
/** A checkbox row's box stands 21dp in from the row's edge. */
const ANDROID_ROW_INSET = 21

/**
 * A checkbox: on iOS the 22pt circle of the phone layer (`--checkbox-*`: a 1.5pt ring, filled in the primary with a
 * check), on Android a square checkbox (an 18dp box, 4dp corners, a gray 1.33dp outline, filled in the selection
 * color with a round-capped check) in a 48dp target.
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
  // At a List row's end with no text of its own: the row is its label
  const inRow = useContext(RowEndContext) != null && label == null && description == null
  const hold = useContext(RowHoldContext)
  const [own, setOwn] = useState(defaultChecked)
  const state = checkedProp ?? own
  const on = state !== false
  // The square checkbox runs 0 to 1 in 300ms on Android's default ease-in-out: the first half fills the box, the
  // second draws the mark; unchecking runs it back. Android only: iOS shows a list row's checkmark, which does not animate
  const [progress] = useState(() => new Animated.Value(on ? 1 : 0))
  const animate = theme.isAndroid && !disabled
  useEffect(() => {
    // A disabled box snaps: no motion between enabled and disabled
    if (theme.reducedMotion || !animate) {
      progress.stopAnimation()
      progress.setValue(on ? 1 : 0)
      return
    }
    const animation = Animated.timing(progress, { toValue: on ? 1 : 0, duration: 300, easing: androidEaseInOut, useNativeDriver: false })
    animation.start()
    return () => animation.stop()
  }, [on, animate, theme.reducedMotion, progress])
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
    // The outline a gray (--gray-450 on white, --gray-500 at night), the fill the selection color, the error when
    // invalid. The mark is the fill's own text color: white on the accent and on the ink of a light theme, dark on
    // the near-white primary at night
    const m = theme.material
    const ring = invalid ? m.error : theme.color(theme.scheme === "dark" ? "--gray-500" : "--gray-450")
    const fill = invalid ? m.error : selectionColor(theme)
    const markColor = invalid ? m.onError : theme.color(`--color-text-${theme.selectionColor}-solid`, "#FFFFFF")
    // The 48dp target reaches past the box without taking room: on the outer side the box keeps the row's edge, on
    // the label's side the text starts 11dp after it. At a List row's end the box stands Android's 21dp in
    const reach: ViewStyle = inRow
      ? { marginStart: -ANDROID_REACH, marginEnd: -(ANDROID_REACH - (ANDROID_ROW_INSET - ANDROID_ROW_END)) }
      : orientation === "right"
        ? { marginEnd: -ANDROID_REACH, marginStart: hasText ? -(ANDROID_REACH - ANDROID_LABEL_GAP) : 0 }
        : { marginStart: -ANDROID_REACH, marginEnd: hasText ? -(ANDROID_REACH - ANDROID_LABEL_GAP) : 0 }
    // No press of its own: a row shows the press. Disabled, the box keeps its colors at half (as a checkbox row's)
    box = (
      <View style={[styles.androidTarget, reach]}>
        <View style={disabled ? styles.half : null}>
          <AndroidBox progress={progress} ring={ring} fill={fill} markColor={markColor} indeterminate={state === "indeterminate"} />
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

/** The check's corner in Android's 18dp box, and its two arms: 3dp and 7dp along each axis, 2dp strokes. */
const CORNER = { x: 7, y: 13 }
const SHORT_ARM = { length: 3 * Math.SQRT2, angle: -135 }
const LONG_ARM = { length: 7 * Math.SQRT2, angle: -45 }

/**
 * One arm of the check: a 2dp bar with round ends from the corner, growing from 0 to `length` as `grow` runs 0 to 1.
 * The bar turns about its middle, so its start is kept on the corner.
 */
function CheckArm({ grow, length, angle, color }: { grow: Animated.AnimatedInterpolation<number>; length: number; angle: number; color: string }) {
  const cos = Math.cos((angle * Math.PI) / 180)
  const sin = Math.sin((angle * Math.PI) / 180)
  const along = (by: number) => grow.interpolate({ inputRange: [0, 1], outputRange: [0, by * length] })
  return (
    <Animated.View
      style={[
        styles.arm,
        {
          backgroundColor: color,
          width: Animated.add(along(1), 2),
          // The bar's middle is half its length along the arm from the corner; its box is then half its width back
          left: Animated.add(along((cos - 1) / 2), CORNER.x - 1),
          top: Animated.add(along(sin / 2), CORNER.y - 1),
          transform: [{ rotate: `${angle}deg` }],
        },
      ]}
    />
  )
}

/**
 * Android's square checkbox, drawn from its numbers. Over the first half of `progress` the box shrinks 1dp on each
 * side while its 1.33dp outline (inner corners 3dp) closes inward and turns from the outline's color to the fill's;
 * over the second half the box grows back and the mark grows from its corner. A View's inner corners are its outer
 * 4dp less the outline, 2.67dp.
 */
function AndroidBox({ progress, ring, fill, markColor, indeterminate }: { progress: Animated.Value; ring: string; fill: string; markColor: string; indeterminate: boolean }) {
  const size = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [ANDROID_BOX, ANDROID_BOX - 2, ANDROID_BOX] })
  // The hole the box cuts stays where it is in the 18dp box while the box shrinks around it: it closes 14dp per unit
  // of progress until it is 1.33dp wide, then stays as the box finishes shrinking; filled past the middle
  const borderWidth = progress.interpolate({ inputRange: [0, 0.4375, 0.5, 1], outputRange: [1.33, 7.455, 7.33, 7.33] })
  const color = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [ring, fill, fill] })
  const solid = progress.interpolate({ inputRange: [0, 0.5, 0.5001, 1], outputRange: [withAlpha(fill, 0), withAlpha(fill, 0), fill, fill] })
  const grow = progress.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1], extrapolate: "clamp" })
  const shown = progress.interpolate({ inputRange: [0.5, 0.5001], outputRange: [0, 1], extrapolate: "clamp" })
  return (
    <View style={styles.androidFrame}>
      <Animated.View style={[styles.androidBox, { width: size, height: size, borderWidth, borderColor: color, backgroundColor: solid }]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: shown }]}>
        {indeterminate ? (
          // The box has no indeterminate look: a 2dp dash with round ends across the middle, growing from its center
          <Animated.View
            style={[styles.arm, { backgroundColor: markColor, top: ANDROID_BOX / 2 - 1, width: grow.interpolate({ inputRange: [0, 1], outputRange: [2, 10] }), left: grow.interpolate({ inputRange: [0, 1], outputRange: [8, 4] }) }]}
          />
        ) : (
          <>
            <CheckArm grow={grow} color={markColor} {...SHORT_ARM} />
            <CheckArm grow={grow} color={markColor} {...LONG_ARM} />
          </>
        )}
      </Animated.View>
    </View>
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
  androidFrame: { width: ANDROID_BOX, height: ANDROID_BOX, alignItems: "center", justifyContent: "center" },
  androidBox: { borderRadius: 4 },
  arm: { position: "absolute", height: 2, borderRadius: 1 },
})
