import { useEffect, useState, type ReactNode } from "react"
import { Animated, Easing, Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native"
import XCircleFilled from "../../icons/plex/XCircleFilled"
import { withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { materialType } from "../../theme/typography"
import type { ControlSize } from "../Button/Button"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { Text } from "../Text/Text"

export type InputVariant = "outline" | "soft" | "ghost"

export type InputProps = Omit<TextInputProps, "editable" | "style"> & {
  /** On Android `outline` is Material's outlined text field, `soft` and `ghost` its filled one. @default "outline" */
  variant?: InputVariant
  /** @default "md" (44pt on a phone, as every phone control) */
  size?: ControlSize
  disabled?: boolean
  invalid?: boolean
  /** Shows a clear button while the field has a value; called when it is pressed. */
  onClear?: () => void
  startAdornment?: ReactNode
  endAdornment?: ReactNode
  /** A capsule. */
  pill?: boolean
  style?: StyleProp<ViewStyle>
  testID?: string
}

type FrameState = { focused: boolean; filled: boolean; disabled: boolean; invalid: boolean }

/** The look of a field on this platform: its box, text and colors. Shared by Input, TextField and Select. */
export function fieldLook(theme: Theme, { variant, size, pill }: { variant: InputVariant; size: ControlSize; pill: boolean }, state: FrameState) {
  if (theme.isAndroid) {
    const m = theme.material
    const outlined = variant === "outline"
    const accent = state.invalid ? m.error : state.focused ? m.primary : null
    const box: ViewStyle = outlined
      ? { minHeight: 56, borderRadius: pill ? 28 : 4, borderWidth: accent ? 2 : 1, borderColor: state.disabled ? withAlpha(m.onSurface, 0.12) : (accent ?? m.outline), paddingHorizontal: accent ? 15 : 16 }
      : {
          minHeight: 56,
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
          backgroundColor: variant === "ghost" ? "transparent" : state.disabled ? withAlpha(m.onSurface, 0.04) : m.surfaceContainerHighest,
          borderBottomWidth: accent ? 2 : 1,
          borderBottomColor: state.disabled ? withAlpha(m.onSurface, 0.38) : (accent ?? m.onSurfaceVariant),
          paddingHorizontal: 16,
        }
    const type = materialType.bodyLarge
    return {
      box,
      gap: 16,
      text: { fontSize: type.fontSize, lineHeight: type.lineHeight, color: state.disabled ? withAlpha(m.onSurface, 0.38) : m.onSurface },
      placeholder: m.onSurfaceVariant,
      icon: state.disabled ? withAlpha(m.onSurface, 0.38) : state.invalid ? m.error : m.onSurfaceVariant,
      iconSize: 24,
      clearSize: 24,
    }
  }
  const height = theme.length(`--control-size-${size}`, 44)
  const radius = pill ? height / 2 : theme.length(`--control-radius-${size}`, 10)
  const border =
    variant === "outline"
      ? state.invalid
        ? theme.color("--input-border-color-invalid")
        : state.focused
          ? theme.color("--input-outline-border-color-focus")
          : theme.color("--input-outline-border-color")
      : state.invalid
        ? theme.color("--input-border-color-invalid")
        : "transparent"
  return {
    box: {
      minHeight: height,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: variant === "soft" ? theme.color("--input-soft-background-color") : "transparent",
      paddingHorizontal: theme.length(`--control-gutter-${size}`, 14) - 1,
      borderCurve: "continuous",
      opacity: state.disabled ? 0.5 : 1,
    } as ViewStyle,
    gap: theme.length(`--input-gap-${size}`, 8),
    text: { fontSize: theme.length(`--control-font-size-${size}`, 17), lineHeight: 22, color: theme.color("--input-text-color", theme.colors.text) },
    placeholder: theme.color("--input-placeholder-text-color", theme.colors.textTertiary),
    icon: theme.color("--mobile-label-secondary"),
    iconSize: 20,
    clearSize: 17,
  }
}

/** A single-line text field: Plex UI's Input. iOS 26 draws a 44pt field in 17pt type, Android Material 3's text field. */
export function Input(props: InputProps) {
  return <InputField {...props} />
}

type FieldExtras = { label?: ReactNode; required?: boolean }

/** The field itself; TextField passes it a floating label on Android. */
export function InputField({
  variant = "outline",
  size = "md",
  disabled = false,
  invalid = false,
  onClear,
  startAdornment,
  endAdornment,
  pill = false,
  style,
  testID,
  label,
  required,
  value,
  defaultValue,
  onChangeText,
  onFocus,
  onBlur,
  ...rest
}: InputProps & FieldExtras) {
  const theme = useTheme()
  const [focused, setFocused] = useState(false)
  const [own, setOwn] = useState(defaultValue ?? "")
  const text = value ?? own
  const filled = text.length > 0
  // A read-only field shows no clear button, as on the web
  const readOnly = rest.readOnly === true
  const look = fieldLook(theme, { variant, size, pill }, { focused, filled, disabled, invalid })
  const floating = theme.isAndroid && label != null
  const outlined = variant === "outline"
  const [float] = useState(() => new Animated.Value(filled ? 1 : 0))
  const up = focused || filled
  useEffect(() => {
    Animated.timing(float, { toValue: up ? 1 : 0, duration: theme.reducedMotion ? 0 : 150, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
  }, [up, float, theme.reducedMotion])
  const m = theme.material
  const labelColor = disabled ? withAlpha(m.onSurface, 0.38) : invalid ? m.error : focused ? m.primary : m.onSurfaceVariant
  return (
    <View style={[styles.box, look.box, { gap: look.gap }, style]} testID={testID}>
      {startAdornment ? (
        <IconDefaultsProvider size={look.iconSize} color={look.icon}>
          {startAdornment}
        </IconDefaultsProvider>
      ) : null}
      <View style={styles.grow}>
        {floating ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.floating,
              outlined
                ? {
                    top: float.interpolate({ inputRange: [0, 1], outputRange: [16, -9] }),
                    backgroundColor: float.interpolate({ inputRange: [0, 1], outputRange: ["transparent", theme.colors.background] }),
                    marginLeft: -4,
                    paddingHorizontal: 4,
                  }
                : { top: float.interpolate({ inputRange: [0, 1], outputRange: [16, 8] }) },
            ]}
          >
            <Animated.Text
              style={{
                color: labelColor,
                fontSize: float.interpolate({ inputRange: [0, 1], outputRange: [materialType.bodyLarge.fontSize, materialType.bodySmall.fontSize] }),
                lineHeight: float.interpolate({ inputRange: [0, 1], outputRange: [materialType.bodyLarge.lineHeight, materialType.bodySmall.lineHeight] }),
                ...theme.font("regular"),
              }}
              numberOfLines={1}
            >
              {label}
              {required ? " *" : ""}
            </Animated.Text>
          </Animated.View>
        ) : null}
        <TextInput
          {...rest}
          accessibilityLabel={rest.accessibilityLabel ?? (typeof label === "string" ? label : undefined)}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          value={text}
          onChangeText={(next) => {
            if (value === undefined) setOwn(next)
            onChangeText?.(next)
          }}
          onFocus={(event) => {
            setFocused(true)
            onFocus?.(event)
          }}
          onBlur={(event) => {
            setFocused(false)
            onBlur?.(event)
          }}
          editable={!disabled}
          placeholder={floating && !up ? undefined : rest.placeholder}
          placeholderTextColor={look.placeholder}
          selectionColor={theme.isAndroid ? m.primary : theme.color("--color-background-accent-solid")}
          style={[
            styles.input,
            look.text,
            theme.font("regular"),
            floating && !outlined ? { paddingTop: 24, paddingBottom: 8 } : { paddingVertical: theme.isAndroid ? 16 : 11 },
          ]}
        />
      </View>
      {onClear && filled && !disabled && !readOnly ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear"
          hitSlop={8}
          onPress={() => {
            if (value === undefined) setOwn("")
            onChangeText?.("")
            onClear()
          }}
          style={styles.clear}
        >
          <XCircleFilled size={look.clearSize} color={theme.isAndroid ? m.onSurfaceVariant : theme.color("--mobile-label-tertiary")} />
        </Pressable>
      ) : null}
      {endAdornment ? (
        <IconDefaultsProvider size={look.iconSize} color={look.icon}>
          {endAdornment}
        </IconDefaultsProvider>
      ) : null}
    </View>
  )
}

export type TextFieldProps = InputProps & {
  /** The field's name: over the field on iOS, floating inside it on Android. */
  label: ReactNode
  /** Help under the field. */
  description?: ReactNode
  /** Shown under the field in place of the description, and marks it invalid. */
  errorMessage?: ReactNode
  required?: boolean
}

/**
 * A labelled text field: Plex UI's Field around an Input. iOS sets the label over the field (15/20 medium) and the
 * description or error under it (15/20, 4pt below, `--mobile-field-error-*`); Android is Material 3's text field with
 * its floating label and supporting text (Body S, 16dp in).
 */
export function TextField({ label, description, errorMessage, required, invalid, ...input }: TextFieldProps) {
  const theme = useTheme()
  const error = errorMessage != null && errorMessage !== false && errorMessage !== ""
  const bad = invalid || error
  const help = error ? errorMessage : description
  if (theme.isAndroid) {
    const m = theme.material
    const small = materialType.bodySmall
    return (
      <View style={styles.field}>
        <InputField {...input} label={label} required={required} invalid={bad} />
        {help != null ? (
          <Text
            color={bad ? m.error : m.onSurfaceVariant}
            accessibilityLiveRegion={error ? "polite" : undefined}
            style={{ fontSize: small.fontSize, lineHeight: small.lineHeight, paddingHorizontal: 16, paddingTop: 4 }}
          >
            {help}
          </Text>
        ) : null}
      </View>
    )
  }
  return (
    <View style={[styles.field, { gap: 8 }]}>
      <Text weight="medium" style={{ fontSize: 15, lineHeight: 20 }} color={input.disabled ? "disabled" : "primary"}>
        {label}
        {required ? <Text color={theme.color("--color-text-danger")}> *</Text> : null}
      </Text>
      <InputField {...input} accessibilityLabel={input.accessibilityLabel ?? (typeof label === "string" ? label : undefined)} required={required} invalid={bad} />
      {help != null ? (
        <Text
          color={bad ? theme.color("--color-text-danger") : "secondary"}
          accessibilityLiveRegion={error ? "polite" : undefined}
          style={{ fontSize: theme.length("--mobile-field-error-font-size", 15), lineHeight: theme.length("--mobile-field-error-line-height", 20), marginTop: theme.length("--mobile-field-error-offset", 4) - 8 }}
        >
          {help}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  box: { flexDirection: "row", alignItems: "center", alignSelf: "stretch" },
  grow: { flex: 1, minWidth: 0, justifyContent: "center" },
  input: { margin: 0, padding: 0, outlineWidth: 0, minWidth: 0 },
  floating: { position: "absolute", left: 0, maxWidth: "100%", flexDirection: "row" },
  clear: { alignItems: "center", justifyContent: "center", minWidth: 24, alignSelf: "stretch" },
  field: { alignSelf: "stretch" },
})
