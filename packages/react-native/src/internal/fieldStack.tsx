import { createContext, useEffect, useRef, useState, type ReactNode } from "react"
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { dangerText } from "../theme/material"
import { useTheme } from "../theme/ThemeProvider"
import { Text } from "../components/Text/Text"
import { stiffSpring } from "./motion"
import { useDescription } from "./a11y"

/** React Native Web's description link, which React Native's own types leave out. */
type DescribedBy = { "aria-describedby"?: string }

/**
 * Android: the label a Field hands the outlined field it wraps (an Input, a Textarea), which floats it in its frame as
 * TextField's does, with the asterisk of a required one and the shake of an error. Null elsewhere.
 */
export const FloatLabelContext = createContext<{ label: ReactNode; required: boolean; shift?: Animated.Value } | null>(null)

/** What a field's stack hands its control: the description's link, the invalid state and Android's shake. */
export type FieldStackControl = {
  /** `aria-describedby` on the web, `accessibilityHint` on a phone, with a caller's own kept. */
  described: Record<string, unknown>
  invalid: boolean
  /** Android: the field moves sideways by it when an error appears (InputField's `shift`). */
  shake?: Animated.Value
}

export type FieldStackProps = {
  label: ReactNode
  /** The label is not drawn; the control still carries it as its name. */
  hideLabel?: boolean
  required?: boolean
  description?: ReactNode
  errorMessage?: ReactNode
  /** Marks the control invalid without a message (the help turns the danger color). */
  invalid?: boolean
  /** Content at the end of the label's line, such as a link that acts on the field. */
  labelAction?: ReactNode
  disabled?: boolean
  /** Android: the control draws the label itself, floating in the field (an Input, a Textarea). */
  floating: boolean
  /** The caller's own `aria-describedby` and `accessibilityHint`, kept with the stack's. */
  describedBy?: string
  hint?: string
  style?: StyleProp<ViewStyle>
  testID?: string
  children: (control: FieldStackControl) => ReactNode
}

/**
 * A label, a control and the help or the error under it: the stacked field of TextField and Field. iOS sets the label
 * over the control (15/20 medium; no phone token for a stacked field's label), 8 above it, and the description or the
 * error 4pt under the control (15/20, `--mobile-field-error-*`). Android floats the label in a field that draws it
 * (the outlined field), or sets it over any other control (14/18 medium in the secondary gray, 14 in, as the help),
 * and the help under it (14/18, 14 in, 6 under), the field shaken when an error appears.
 */
export function FieldStack({
  label,
  hideLabel = false,
  required = false,
  description,
  errorMessage,
  invalid = false,
  labelAction,
  disabled = false,
  floating,
  describedBy: ownDescribedBy,
  hint,
  style,
  testID,
  children,
}: FieldStackProps) {
  const theme = useTheme()
  const error = errorMessage != null && errorMessage !== false && errorMessage !== ""
  const bad = invalid || error
  const help = error ? errorMessage : description
  // The help or the error describes the field: read after its label (a hint on a phone, `aria-describedby` on the
  // web). A caller's own hint wins; its described-by ids are kept with this one.
  const description_ = useDescription(help)
  const describedBy = [ownDescribedBy, (description_.props as DescribedBy)["aria-describedby"]].filter(Boolean).join(" ") || undefined
  const described = {
    ...description_.props,
    ...(describedBy ? { "aria-describedby": describedBy } : null),
    ...(hint != null ? { accessibilityHint: hint } : null),
  }
  // Android shakes the field when an error message appears: flung left at 350dp/s on a spring of stiffness 600 at half
  // its critical damping, it swings back and settles where it stood
  const [shake] = useState(() => new Animated.Value(0))
  const hadError = useRef(error)
  useEffect(() => {
    const appeared = error && !hadError.current
    hadError.current = error
    if (!appeared || !theme.isAndroid || theme.reducedMotion) return
    shake.setValue(0)
    Animated.spring(shake, { toValue: 0, velocity: -350, ...stiffSpring(600, 0.5), useNativeDriver: false }).start()
  }, [error, shake, theme.isAndroid, theme.reducedMotion])
  const control = (shift: boolean) => children({ described, invalid: bad, shake: shift ? shake : undefined })
  const asterisk = (color: string) => (required ? <Text color={color}> *</Text> : null)
  if (theme.isAndroid) {
    const labelLine =
      floating || hideLabel ? null : (
        // Over a control that does not float a label: the help's type and inset, Medium
        <View style={styles.labelRow}>
          <Text weight="medium" color={theme.colors.textSecondary} style={[styles.androidLabel, { opacity: disabled ? 0.5 : 1 }]}>
            {label}
            {asterisk(dangerText(theme))}
          </Text>
          {labelAction}
        </View>
      )
    return (
      <View style={[styles.field, style]} testID={testID}>
        {labelLine}
        {floating ? control(true) : <Animated.View style={{ transform: [{ translateX: shake }] }}>{control(false)}</Animated.View>}
        {help != null || (floating && labelAction != null) ? (
          <View style={styles.helpRow}>
            {help != null ? (
              // Android's help under a field: 14 in the gray of secondary text, or in the error color, at the text's 14
              // (dimmed with a disabled field)
              <Text
                nativeID={description_.id}
                color={bad ? dangerText(theme) : theme.colors.textSecondary}
                accessibilityLiveRegion={error ? "polite" : undefined}
                style={[styles.androidHelp, { opacity: disabled ? 0.5 : 1 }]}
              >
                {help}
              </Text>
            ) : (
              <View style={styles.grow} />
            )}
            {floating ? labelAction : null}
          </View>
        ) : null}
      </View>
    )
  }
  const labelText = (
    <Text weight="medium" style={[styles.iosLabel, labelAction != null ? styles.grow : null]} color={disabled ? "disabled" : "primary"}>
      {label}
      {asterisk(theme.color("--color-text-danger"))}
    </Text>
  )
  return (
    <View style={[styles.field, { gap: 8 }, style]} testID={testID}>
      {hideLabel ? null : labelAction != null ? (
        <View style={styles.labelRow}>
          {labelText}
          {labelAction}
        </View>
      ) : (
        labelText
      )}
      {control(false)}
      {help != null ? (
        <Text
          nativeID={description_.id}
          color={bad ? theme.color("--color-text-danger") : "secondary"}
          accessibilityLiveRegion={error ? "polite" : undefined}
          style={{
            fontSize: theme.length("--mobile-field-error-font-size", 15),
            lineHeight: theme.length("--mobile-field-error-line-height", 20),
            marginTop: theme.length("--mobile-field-error-offset", 4) - 8,
          }}
        >
          {help}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  field: { alignSelf: "stretch" },
  grow: { flex: 1, minWidth: 0 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  iosLabel: { fontSize: 15, lineHeight: 20 },
  androidLabel: { flex: 1, minWidth: 0, fontSize: 14, lineHeight: 18, paddingHorizontal: 14, paddingBottom: 6 },
  helpRow: { flexDirection: "row", alignItems: "flex-start" },
  androidHelp: { flex: 1, minWidth: 0, fontSize: 14, lineHeight: 18, paddingHorizontal: 14, paddingTop: 6 },
})
