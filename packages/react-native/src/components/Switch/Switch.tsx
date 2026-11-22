import { useEffect, useState, type ReactNode } from "react"
import { Animated, Easing, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { spaceToggles, useDescription } from "../../internal/a11y"
import { ControlLabel } from "../../internal/ControlLabel"
import { withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"

export type SwitchProps = {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (nextState: boolean) => void
  /** The color of the on track: the Plex primary (the ink, or a brand's) or the accent. @default "primary" */
  color?: "primary" | "accent"
  label?: ReactNode
  description?: ReactNode
  /** Where the label stands. A phone settings row puts it at the start. @default "end" */
  labelPosition?: "start" | "end"
  disabled?: boolean
  accessibilityLabel?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

/** The on color of a switch, a checkbox and a radio: the Plex primary solid, or the accent (decision 0023). */
export function selectionColor(theme: Theme, color: "primary" | "accent" = "primary") {
  return theme.color(color === "accent" ? "--color-background-accent-solid" : "--color-background-primary-solid")
}

/**
 * A switch: the iOS 26 switch of the phone layer (a 63x28 track, a 37x24 capsule thumb, `--switch-*`), or Material 3's
 * (a 52x32 track, its thumb 16 off, 24 on and 28 held). Props follow @plexui/ui.
 */
export function Switch({
  checked: checkedProp,
  defaultChecked = false,
  onCheckedChange,
  color = "primary",
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
  const [pressed, setPressed] = useState(false)
  const [progress] = useState(() => new Animated.Value(checked ? 1 : 0))
  useEffect(() => {
    Animated.timing(progress, { toValue: checked ? 1 : 0, duration: theme.reducedMotion ? 0 : 200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
  }, [checked, progress, theme.reducedMotion])
  const toggle = () => {
    if (disabled) return
    if (checkedProp === undefined) setOwn(!checked)
    onCheckedChange?.(!checked)
  }
  const control = theme.isAndroid ? <AndroidTrack theme={theme} checked={checked} pressed={pressed} disabled={disabled} color={color} progress={progress} /> : <IOSTrack theme={theme} checked={checked} disabled={disabled} color={color} progress={progress} />
  const described = useDescription(description)
  const hasText = label != null || description != null
  const text = <ControlLabel label={label} description={description} disabled={disabled} descriptionId={described.id} />
  return (
    <Pressable
      {...described.props}
      {...spaceToggles(toggle)}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel ?? (typeof label === "string" ? label : undefined)}
      accessibilityState={{ checked, disabled }}
      aria-checked={checked}
      disabled={disabled}
      onPress={toggle}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      testID={testID}
      style={[styles.row, { gap: theme.isAndroid ? 16 : theme.length("--switch-label-gap", 8), minHeight: theme.isAndroid ? 48 : 44 }, style]}
    >
      {/* A switch without a label hugs its track: an empty growing slot would push it away from a row's end */}
      {labelPosition === "start" && hasText ? <View style={styles.grow}>{text}</View> : null}
      {control}
      {labelPosition === "end" && hasText ? <View style={styles.grow}>{text}</View> : null}
    </Pressable>
  )
}

type TrackProps = { theme: Theme; checked: boolean; disabled: boolean; color: "primary" | "accent"; progress: Animated.Value }

function IOSTrack({ theme, checked, disabled, color, progress }: TrackProps) {
  const width = theme.length("--switch-track-width", 63)
  const height = theme.length("--switch-track-height", 28)
  const thumbWidth = theme.length("--switch-thumb-width", 37)
  const thumbHeight = theme.length("--switch-thumb-size", 24)
  const offset = theme.length("--switch-thumb-offset", 2)
  const on = disabled ? theme.color("--switch-track-color-checked-disabled") : color === "accent" ? selectionColor(theme, "accent") : theme.color("--switch-track-color-checked")
  const off = disabled ? theme.color("--switch-track-color-disabled") : theme.color("--switch-track-color")
  return (
    <View style={{ width, height, borderRadius: height / 2, backgroundColor: checked ? on : off, justifyContent: "center" }}>
      <Animated.View
        style={{
          position: "absolute",
          left: progress.interpolate({ inputRange: [0, 1], outputRange: [offset, width - thumbWidth - offset] }),
          width: thumbWidth,
          height: thumbHeight,
          borderRadius: thumbHeight / 2,
          backgroundColor: disabled ? theme.color("--switch-thumb-color-disabled") : theme.color("--switch-thumb-color"),
          // The phone layer draws the thumb flat (`--switch-thumb-shadow: none`)
        }}
      />
    </View>
  )
}

function AndroidTrack({ theme, checked, pressed, disabled, color, progress }: TrackProps & { pressed: boolean }) {
  const m = theme.material
  // Compose SwitchTokens: track 52x32, a 2dp outline off; thumb 16 off, 24 on, 28 pressed
  const thumb = pressed && !disabled ? 28 : checked ? 24 : 16
  const trackOn = disabled ? withAlpha(m.onSurface, 0.12) : selectionColor(theme, color)
  const trackOff = disabled ? withAlpha(m.surfaceContainerHighest, 0.12) : m.surfaceContainerHighest
  const thumbOn = disabled ? m.surface : theme.color(color === "accent" ? "--color-text-accent-solid" : "--color-text-primary-solid")
  const thumbOff = disabled ? withAlpha(m.onSurface, 0.38) : m.outline
  const border = checked ? "transparent" : disabled ? withAlpha(m.onSurface, 0.12) : m.outline
  return (
    <View style={{ width: 52, height: 32, borderRadius: 16, borderWidth: 2, borderColor: border, backgroundColor: checked ? trackOn : trackOff, justifyContent: "center" }}>
      <Animated.View
        style={{
          position: "absolute",
          // The thumb's center travels from 16 to 36 of the track (inside its 2dp border)
          left: progress.interpolate({ inputRange: [0, 1], outputRange: [16 - 2 - thumb / 2, 36 - 2 - thumb / 2] }),
          width: thumb,
          height: thumb,
          borderRadius: thumb / 2,
          backgroundColor: checked ? thumbOn : thumbOff,
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", alignSelf: "stretch" },
  grow: { flex: 1, minWidth: 0 },
})
