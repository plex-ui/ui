import { useEffect, useState, type ReactNode } from "react"
import { Animated, Easing, Pressable, StyleSheet, Text as NativeText, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from "react-native"
import XCircleFilled from "../../icons/plex/XCircleFilled"
import { withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { materialType } from "../../theme/typography"
import type { ControlSize } from "../Button/Button"
import { createIcon, IconDefaultsProvider } from "../Icon/createIcon"
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

/**
 * Material's `cancel` (Material Symbols Outlined, 24dp): the clear icon of a text field's trailing slot, a ring with an
 * X. Plex's XCircleFilled is the iOS glyph (`xmark.circle.fill`).
 */
const Cancel = createIcon("Cancel", "0 -960 960 960", [
  [
    "path",
    {
      d: "m336-280 144-144 144 144 56-56-144-144 144-144-56-56-144 144-144-144-56 56 144 144-144 144 56 56Zm144 200q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z",
      fill: 0,
    },
  ],
])

type FrameState = { focused: boolean; filled: boolean; disabled: boolean; invalid: boolean }

/**
 * The line around (outlined) or under (filled) an Android field. Drawn as a layer over the field, not as the field's
 * border, so the field stays 56 tall and its content does not move when the line thickens on focus (Compose draws it
 * inside the container the same way).
 */
export type FieldFrame = { outlined: boolean; color: string; width: number; radius: number }

/** The look of a field on this platform: its box, text and colors. Shared by Input, TextField and Select. */
export function fieldLook(theme: Theme, { variant, size, pill }: { variant: InputVariant; size: ControlSize; pill: boolean }, state: FrameState) {
  if (theme.isAndroid) {
    // Compose material3 OutlinedTextFieldTokens / FilledTextFieldTokens
    const m = theme.material
    const outlined = variant === "outline"
    const accent = state.invalid ? m.error : state.focused ? m.primary : null
    const radius = outlined && pill ? 28 : 4
    const frame: FieldFrame | null =
      variant === "ghost"
        ? null
        : {
            outlined,
            color: state.disabled ? withAlpha(m.onSurface, outlined ? 0.12 : 0.38) : (accent ?? (outlined ? m.outline : m.onSurfaceVariant)),
            width: state.focused && !state.disabled ? 2 : 1,
            radius,
          }
    const box: ViewStyle = outlined
      ? { minHeight: 56, borderRadius: radius, paddingHorizontal: 16 }
      : {
          minHeight: 56,
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
          backgroundColor: variant === "ghost" ? "transparent" : state.disabled ? withAlpha(m.onSurface, 0.04) : m.surfaceContainerHighest,
          paddingHorizontal: 16,
        }
    const type = materialType.bodyLarge
    const off = withAlpha(m.onSurface, 0.38)
    return {
      box,
      frame,
      gap: 16,
      text: { fontSize: type.fontSize, lineHeight: type.lineHeight, color: state.disabled ? off : m.onSurface },
      placeholder: m.onSurfaceVariant,
      // A leading icon keeps its color in error; a trailing one turns to the error color
      icon: state.disabled ? off : m.onSurfaceVariant,
      trailingIcon: state.disabled ? off : state.invalid ? m.error : m.onSurfaceVariant,
      caret: state.invalid ? m.error : m.primary,
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
    frame: null as FieldFrame | null,
    trailingIcon: theme.color("--mobile-label-secondary"),
    caret: theme.color("--color-background-accent-solid"),
    iconSize: 20,
    clearSize: 17,
  }
}

/**
 * Draws a field's frame. An outlined field whose label has floated is cut where the label sits on the line, as
 * Compose's `outlineCutout`. The outline shows through three windows that do not overlap (a translucent disabled
 * line would darken where two did), each a clipped copy of the outline aligned with the field: before the cut (full
 * height), after it below the top line, and after it on the top line. So the cut animates with the label, needs no
 * fill behind the label, and keeps a pill's round ends. The windows are placed by `start` / `end`, so the cut
 * follows the label to the right in a right-to-left layout.
 */
export function FieldOutline({ frame, cut }: { frame: FieldFrame | null; cut?: { start: number; width: Animated.AnimatedInterpolation<number> | number } | null }) {
  if (!frame) return null
  if (!frame.outlined) return <View pointerEvents="none" style={[styles.underline, { height: frame.width, backgroundColor: frame.color }]} />
  const line = { borderWidth: frame.width, borderColor: frame.color, borderRadius: frame.radius }
  if (!cut) return <View pointerEvents="none" style={[StyleSheet.absoluteFill, line]} />
  const end = typeof cut.width === "number" ? cut.start + cut.width : Animated.add(cut.start, cut.width)
  const back = typeof end === "number" ? -end : Animated.multiply(end, -1)
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.window, { start: 0, width: cut.start, top: 0, bottom: 0 }]}>
        <View style={[styles.copy, line, { start: 0, end: FAR, top: 0, bottom: 0 }]} />
      </View>
      <View style={[styles.window, { start: cut.start, end: 0, top: CUT_DEPTH, bottom: 0 }]}>
        <View style={[styles.copy, line, { start: -cut.start, end: 0, top: -CUT_DEPTH, bottom: 0 }]} />
      </View>
      <Animated.View style={[styles.window, { start: end, end: 0, top: 0, height: CUT_DEPTH }]}>
        {/* Only its top line and the start of its corner show: it may run past the field's bottom */}
        <Animated.View style={[styles.copy, line, { start: back, end: 0, top: 0, bottom: FAR }]} />
      </Animated.View>
    </View>
  )
}

/** A clipped copy of the outline reaches this far past its window, so only its own edges show. */
const FAR = -2000
/** The cut removes the top line only: deeper than the 2dp focused line. */
const CUT_DEPTH = 4

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
  const showClear = !!onClear && filled && !disabled && !readOnly
  // Compose places a 24dp icon in a 48dp slot at the field's edge (the icon 12 in) and the text 4 past the slot (52 in)
  const sides: ViewStyle | null = theme.isAndroid ? { paddingStart: startAdornment ? 12 : 16, paddingEnd: endAdornment || showClear ? 12 : 16 } : null
  const textStart = theme.isAndroid ? (startAdornment ? 52 : 16) : 0
  // An outlined label floats to the field's start padding over the line (past a pill's round end), the cut 4 around it
  const floatedStart = pill ? 28 : 16
  const [labelWidth, setLabelWidth] = useState(0)
  const cut = floating && outlined && look.frame ? { start: floatedStart - 4, width: float.interpolate({ inputRange: [0, 1], outputRange: [0, labelWidth + 8] }) } : null
  const labelText = (
    <>
      {label}
      {required ? " *" : ""}
    </>
  )
  return (
    <View style={[styles.box, look.box, { gap: look.gap }, sides, style]} testID={testID}>
      {theme.isAndroid ? <FieldOutline frame={look.frame} cut={cut} /> : null}
      {startAdornment ? (
        <IconDefaultsProvider size={look.iconSize} color={look.icon}>
          {startAdornment}
        </IconDefaultsProvider>
      ) : null}
      <View style={styles.grow}>
        {floating ? (
          <>
            {outlined ? (
              // The floated label's width, in the visible label's own type (React Native's Text: no Plex tracking)
              <NativeText
                aria-hidden
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                numberOfLines={1}
                onLayout={(event) => setLabelWidth(event.nativeEvent.layout.width)}
                style={[styles.measure, { fontSize: materialType.bodySmall.fontSize, lineHeight: materialType.bodySmall.lineHeight, ...theme.font("regular") }]}
              >
                {labelText}
              </NativeText>
            ) : null}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.floating,
                outlined
                  ? {
                      top: float.interpolate({ inputRange: [0, 1], outputRange: [16, -materialType.bodySmall.lineHeight / 2] }),
                      start: float.interpolate({ inputRange: [0, 1], outputRange: [0, floatedStart - textStart] }),
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
                {labelText}
              </Animated.Text>
            </Animated.View>
          </>
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
          selectionColor={look.caret}
          cursorColor={look.caret}
          style={[
            styles.input,
            look.text,
            theme.font("regular"),
            floating && !outlined ? { paddingTop: 24, paddingBottom: 8 } : { paddingVertical: theme.isAndroid ? 16 : 11 },
          ]}
        />
      </View>
      {showClear ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear"
          hitSlop={theme.isAndroid ? 12 : 8}
          onPress={() => {
            if (value === undefined) setOwn("")
            onChangeText?.("")
            onClear()
          }}
          style={styles.clear}
        >
          {theme.isAndroid ? <Cancel size={look.clearSize} color={look.trailingIcon} /> : <XCircleFilled size={look.clearSize} color={theme.color("--mobile-label-tertiary")} />}
        </Pressable>
      ) : null}
      {endAdornment ? (
        <IconDefaultsProvider size={look.iconSize} color={look.trailingIcon}>
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
            color={input.disabled ? withAlpha(m.onSurface, 0.38) : bad ? m.error : m.onSurfaceVariant}
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
  floating: { position: "absolute", start: 0, maxWidth: "100%", flexDirection: "row" },
  measure: { position: "absolute", start: 0, top: 0, opacity: 0 },
  underline: { position: "absolute", left: 0, right: 0, bottom: 0 },
  window: { position: "absolute", overflow: "hidden" },
  copy: { position: "absolute" },
  clear: { alignItems: "center", justifyContent: "center", minWidth: 24, alignSelf: "stretch" },
  field: { alignSelf: "stretch" },
})
