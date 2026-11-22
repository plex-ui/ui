import { useState, type ReactNode } from "react"
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import CheckMd from "../../icons/plex/CheckMd"
import Minus from "../../icons/plex/Minus"
import { spaceToggles, useDescription } from "../../internal/a11y"
import { ControlLabel } from "../../internal/ControlLabel"
import { stateLayer, withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import { MaterialCheck, MaterialDash } from "../Icon/material"
import { selectionColor } from "../Switch/Switch"

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
  /** Kept for the API of @plexui/ui: the phone box is a circle on iOS and Material's square on Android. */
  pill?: boolean
  invalid?: boolean
  disabled?: boolean
  accessibilityLabel?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

/**
 * A checkbox: on iOS the 22pt circle of the phone layer (`--checkbox-*`: a 1.5pt ring, filled in the primary with a
 * check), on Android Material 3's 18dp box (2dp corners and outline, filled when checked) in a 48dp target.
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
  const [own, setOwn] = useState(defaultChecked)
  const state = checkedProp ?? own
  const on = state !== false
  const [pressed, setPressed] = useState(false)
  const toggle = () => {
    if (disabled) return
    // An indeterminate box checks on a press, as Radix does on the web
    const next = state !== true
    if (checkedProp === undefined) setOwn(next)
    onCheckedChange?.(next)
  }
  const Glyph = state === "indeterminate" ? Minus : CheckMd
  let box: ReactNode
  if (theme.isAndroid) {
    // Compose material3 CheckboxTokens: an 18dp box, a 2dp outline off, filled on; the mark a 2dp stroke
    const m = theme.material
    const selection = selectionColor(theme)
    const off = withAlpha(m.onSurface, 0.38)
    const fill = disabled ? off : invalid ? m.error : selection
    const ring = disabled ? off : invalid ? m.error : pressed ? m.onSurface : m.onSurfaceVariant
    const markColor = disabled ? m.surface : invalid ? m.onError : theme.color("--color-text-primary-solid")
    // Material's pressed layer: onSurface over a checked box, the selection color over an empty one, error when invalid
    const layer = invalid ? m.error : on ? m.onSurface : selection
    const Mark = state === "indeterminate" ? MaterialDash : MaterialCheck
    box = (
      <View style={styles.androidTarget}>
        {pressed && !disabled ? <View pointerEvents="none" style={[styles.androidLayer, { backgroundColor: withAlpha(layer, stateLayer.pressed) }]} /> : null}
        <View style={[styles.androidBox, on ? { backgroundColor: fill, borderWidth: 0 } : { borderColor: ring }]}>{on ? <Mark size={18} color={markColor} /> : null}</View>
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
          {on ? <Glyph size={theme.length("--checkbox-ghost-icon-size", 26)} color={disabled ? theme.colors.textDisabled : theme.colors.text} /> : null}
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
          {on ? <Glyph size={16} color={theme.color("--color-text-primary-solid")} /> : null}
        </View>
      )
  }
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
      onPress={toggle}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      testID={testID}
      style={[
        styles.row,
        { gap: theme.isAndroid ? 4 : theme.length("--checkbox-label-inset", 11), minHeight: theme.isAndroid ? 48 : theme.length("--checkbox-target-size", 44) },
        orientation === "right" ? styles.reverse : null,
        style,
      ]}
    >
      {box}
      <View style={styles.grow}>{text}</View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", alignSelf: "stretch" },
  reverse: { flexDirection: "row-reverse" },
  grow: { flexShrink: 1, minWidth: 0 },
  androidTarget: { width: 48, height: 48, alignItems: "center", justifyContent: "center", marginLeft: -15 },
  androidLayer: { position: "absolute", width: 40, height: 40, borderRadius: 20 },
  androidBox: { width: 18, height: 18, borderRadius: 2, borderWidth: 2, alignItems: "center", justifyContent: "center" },
})
