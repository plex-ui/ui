import { useContext, useEffect, useState, type ReactNode } from "react"
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { Pressable } from "../../internal/Pressable"
import { spaceToggles, useDescription } from "../../internal/a11y"
import { ControlLabel } from "../../internal/ControlLabel"
import { RowEndContext, RowHoldContext, rowHold } from "../../internal/row"
import { androidGray } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { SelectionColor, Theme } from "../../theme/types"

export type SwitchProps = {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (nextState: boolean) => void
  /**
   * The color of the on track: the Plex primary (the ink, or a brand's) or the accent. @default the ThemeProvider's
   * `selectionColor`, `"primary"` unless set
   */
  color?: SelectionColor
  label?: ReactNode
  description?: ReactNode
  /** Where the label stands. A phone settings row puts it at the start. @default "end" */
  labelPosition?: "start" | "end"
  disabled?: boolean
  accessibilityLabel?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

/**
 * The on color of a switch, a checkbox and a radio: the Plex primary solid, or the accent. A control's own `color`
 * wins; without one it takes the ThemeProvider's `selectionColor` (the primary unless set).
 */
export function selectionColor(theme: Theme, color?: SelectionColor) {
  const tone = color ?? theme.selectionColor
  return theme.color(tone === "accent" ? "--color-background-accent-solid" : "--color-background-primary-solid")
}

/**
 * The checkmark of an iOS list row (a chosen radio, a ghost checkbox): the text color, as the web's
 * (`--radio-group-checkmark-color`), or the accent, the iOS tint, when the ThemeProvider's `selectionColor` is the accent.
 */
export function iosCheckmarkColor(theme: Theme) {
  return theme.selectionColor === "accent" ? selectionColor(theme) : theme.color("--radio-group-checkmark-color", theme.colors.text)
}

/**
 * The gray of an Android off switch and of the dots past the choice of a stepped slider: #A7ADB2 on white, --gray-500
 * (#5D5D5D) at night, as the web's `--android-switch-off`.
 */
export function androidSwitchOff(theme: Theme) {
  return androidGray(theme, "switchOff")
}

/** Android's default ease-in-out (AccelerateDecelerateInterpolator), which an ObjectAnimator runs by default. */
export const androidEaseInOut = Easing.inOut(Easing.sin)

/** A List row on Android ends 21dp in from the card's edge (`--list-row-inset`): a control at its end moves in from there. */
export const ANDROID_ROW_END = 21
/** A switch row: the switch's 37dp view stands 22dp in from the row's end. */
const ANDROID_SWITCH_END = 22

/** The switch's place along its track, 0 off to 1 on: Android's 200ms ease-in-out, iOS's 200ms ease-out. */
function useSwitchProgress(theme: Theme, checked: boolean) {
  const [progress] = useState(() => new Animated.Value(checked ? 1 : 0))
  const android = theme.isAndroid
  useEffect(() => {
    const easing = android ? androidEaseInOut : Easing.out(Easing.cubic)
    Animated.timing(progress, { toValue: checked ? 1 : 0, duration: theme.reducedMotion ? 0 : 200, easing, useNativeDriver: false }).start()
  }, [checked, progress, android, theme.reducedMotion])
  return progress
}

/**
 * A switch: the iOS 26 switch of the phone layer (a 63x28 track, a 37x24 capsule thumb, `--switch-*`), or Android's
 * (a 31x14dp track and a 20.6dp thumb over it, a 2dp ring of the track's color around a knob of the card's color, the
 * track's color changing as the thumb moves; a 50dp switch row, the label 11dp from the switch). Props follow
 * @plexui/ui.
 */
export function Switch({
  checked: checkedProp,
  defaultChecked = false,
  onCheckedChange,
  color,
  label,
  description,
  labelPosition = "end",
  disabled = false,
  accessibilityLabel,
  testID,
  style,
}: SwitchProps) {
  const theme = useTheme()
  const [own, setOwn] = useState(defaultChecked)
  const checked = checkedProp ?? own
  const progress = useSwitchProgress(theme, checked)
  // At the end of an Android List row with no text of its own: Android's switch stands 22dp from the row's end
  const rowEnd = useContext(RowEndContext) != null
  const hold = useContext(RowHoldContext)
  const toggle = () => {
    if (disabled) return
    if (checkedProp === undefined) setOwn(!checked)
    onCheckedChange?.(!checked)
  }
  const described = useDescription(description)
  const hasText = label != null || description != null
  // Android's switch has no press of its own (its thumb ripple is opt-in): a row shows the press, or nothing does.
  // Disabled, the switch and its text fade to half (as a switch row's), each on its own
  const control = (pressed: boolean) =>
    theme.isAndroid ? (
      <View style={[disabled ? styles.dim : null, rowEnd && !hasText ? styles.androidRowEnd : null]}>
        <AndroidTrack theme={theme} checked={checked} disabled={disabled} color={color} progress={progress} />
      </View>
    ) : (
      <IOSTrack theme={theme} checked={checked} disabled={disabled} color={color} progress={progress} held={pressed && !disabled} />
    )
  const text = <ControlLabel control="switch" label={label} description={description} disabled={disabled} descriptionId={described.id} />
  return (
    <Pressable
      {...described.props}
      {...spaceToggles(toggle)}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel ?? (typeof label === "string" ? label : undefined)}
      accessibilityState={{ checked, disabled }}
      aria-checked={checked}
      disabled={disabled}
      {...rowHold(hold)}
      onPress={toggle}
      testID={testID}
      // Android's switch row: 50dp, the text ending 11dp before the switch's 37dp view
      style={[styles.row, { gap: theme.isAndroid ? 11 : theme.length("--switch-label-gap", 8), minHeight: theme.isAndroid ? 50 : 44 }, style]}
    >
      {({ pressed }) => (
        <>
          {/* A switch without a label hugs its track: an empty growing slot would push it away from a row's end */}
          {labelPosition === "start" && hasText ? <View style={styles.grow}>{text}</View> : null}
          {control(pressed)}
          {labelPosition === "end" && hasText ? <View style={styles.grow}>{text}</View> : null}
        </>
      )}
    </Pressable>
  )
}

/**
 * The track of a switch on its own, for a row that is the switch (a List row toggles as a whole, as a Settings
 * preference): no press or accessibility of its own. `pressed` is the row's press; Android's switch draws none of
 * its own (its thumb ripple is opt-in), so the row's press is all there is.
 */
export function SwitchTrack({ checked, disabled = false, color }: { checked: boolean; disabled?: boolean; pressed?: boolean; color?: "primary" | "accent" }) {
  const theme = useTheme()
  const progress = useSwitchProgress(theme, checked)
  const rowEnd = useContext(RowEndContext) != null
  return theme.isAndroid ? (
    <View style={[disabled ? styles.dim : null, rowEnd ? styles.androidRowEnd : null]}>
      <AndroidTrack theme={theme} checked={checked} disabled={disabled} color={color} progress={progress} />
    </View>
  ) : (
    <IOSTrack theme={theme} checked={checked} disabled={disabled} color={color} progress={progress} />
  )
}

type TrackProps = { theme: Theme; checked: boolean; disabled: boolean; color?: "primary" | "accent"; progress: Animated.Value; held?: boolean }

/**
 * iOS 26's knob held down: the lens, 58 x 38 over the 37 x 24 knob on its center, a faint white glass with a soft
 * shadow and a light rim, growing in 200ms (the phone CSS's `--mobile-switch-knob-lens-*`, measured on the simulator).
 */
const LENS = { width: 58, height: 38, fill: "rgba(255, 255, 255, 0.09)", shadow: "0px 4.5px 8px rgba(0, 0, 0, 0.12), 0px 0px 0px 0.33px rgba(0, 0, 0, 0.2)" }

function IOSTrack({ theme, checked, disabled, color, progress, held = false }: TrackProps) {
  const width = theme.length("--switch-track-width", 63)
  const height = theme.length("--switch-track-height", 28)
  const thumbWidth = theme.length("--switch-thumb-width", 37)
  const thumbHeight = theme.length("--switch-thumb-size", 24)
  const offset = theme.length("--switch-thumb-offset", 2)
  // The accent switch (its own `color`, or the ThemeProvider's `selectionColor`) is the system green, as the web's
  // (`--switch-accent-color`, #34C759 / #30D158). Disabled, the phone switch keeps its colors at half opacity (Is
  // Enabled=False), as the web's phone layer
  const on = (color ?? theme.selectionColor) === "accent" ? theme.color("--switch-accent-color", theme.scheme === "dark" ? "#30D158" : "#34C759") : theme.color("--switch-track-color-checked")
  const off = theme.color("--switch-track-color")
  const [lens] = useState(() => new Animated.Value(held ? 1 : 0))
  useEffect(() => {
    if (theme.reducedMotion) {
      lens.setValue(held ? 1 : 0)
      return
    }
    const animation = Animated.timing(lens, { toValue: held ? 1 : 0, duration: 200, easing: Easing.bezier(0.19, 1, 0.22, 1), useNativeDriver: false })
    animation.start()
    return () => animation.stop()
  }, [held, lens, theme.reducedMotion])
  return (
    <View style={{ width, height, borderRadius: height / 2, backgroundColor: checked ? on : off, justifyContent: "center", opacity: disabled ? 0.5 : 1 }}>
      <Animated.View
        style={{
          position: "absolute",
          // From the start of the track: on is at its end, the right in a left-to-right row and the left in a right-to-left one
          start: progress.interpolate({ inputRange: [0, 1], outputRange: [offset, width - thumbWidth - offset] }),
          width: thumbWidth,
          height: thumbHeight,
          borderRadius: thumbHeight / 2,
          // The phone layer draws the thumb flat (`--switch-thumb-shadow: none`); held, it is the lens
          backgroundColor: held ? LENS.fill : theme.color("--switch-thumb-color"),
          boxShadow: held ? LENS.shadow : undefined,
          transform: [
            { scaleX: lens.interpolate({ inputRange: [0, 1], outputRange: [1, LENS.width / thumbWidth] }) },
            { scaleY: lens.interpolate({ inputRange: [0, 1], outputRange: [1, LENS.height / thumbHeight] }) },
          ],
        }}
      />
    </View>
  )
}

/**
 * Android's switch: its view 37x20dp, the track 31x14 in it, the 20.6dp thumb (a 2dp ring) reaching 3dp past the
 * track's ends, its center 7.3 to 23.7 along the track (the reference: 31.2x14.1, a 20.6 thumb with a 1.9 ring).
 */
const ANDROID_VIEW = { width: 37, height: 20 }
const ANDROID_TRACK = { width: 31, height: 14 }
const ANDROID_START = (ANDROID_VIEW.width - ANDROID_TRACK.width) / 2
const ANDROID_THUMB = 20.6
const ANDROID_RING = 2

function AndroidTrack({ theme, color, progress }: TrackProps) {
  // The knob is the card's color (the white of a card); the track off the gray of an off switch, on the selection
  // color (the switch's own, or the ThemeProvider's)
  const card = theme.colors.groupedSurface
  const off = androidSwitchOff(theme)
  const on = selectionColor(theme, color)
  const track = progress.interpolate({ inputRange: [0, 1], outputRange: [off, on] })
  // The thumb's start edge: 3dp before the track's start off, 3dp past its end on (mirrored in a right-to-left row)
  const start = progress.interpolate({ inputRange: [0, 1], outputRange: [ANDROID_START - 3, ANDROID_START + ANDROID_TRACK.width + 3 - ANDROID_THUMB] })
  return (
    <View style={styles.androidView}>
      <Animated.View style={[styles.androidTrack, { backgroundColor: track }]} />
      <Animated.View style={[styles.androidThumb, { start, backgroundColor: track }]}>
        <View style={[styles.androidKnob, { backgroundColor: card }]} />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", alignSelf: "stretch" },
  grow: { flex: 1, minWidth: 0 },
  dim: { opacity: 0.5 },
  // The row ends 21dp in; Android's switch stands 22dp in
  androidRowEnd: { marginEnd: ANDROID_SWITCH_END - ANDROID_ROW_END },
  androidView: { width: ANDROID_VIEW.width, height: ANDROID_VIEW.height, justifyContent: "center" },
  androidTrack: { position: "absolute", start: ANDROID_START, top: (ANDROID_VIEW.height - ANDROID_TRACK.height) / 2, width: ANDROID_TRACK.width, height: ANDROID_TRACK.height, borderRadius: ANDROID_TRACK.height / 2 },
  androidThumb: {
    position: "absolute",
    top: (ANDROID_VIEW.height - ANDROID_THUMB) / 2,
    width: ANDROID_THUMB,
    height: ANDROID_THUMB,
    borderRadius: ANDROID_THUMB / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  androidKnob: { width: ANDROID_THUMB - 2 * ANDROID_RING, height: ANDROID_THUMB - 2 * ANDROID_RING, borderRadius: ANDROID_THUMB / 2 - ANDROID_RING },
})
