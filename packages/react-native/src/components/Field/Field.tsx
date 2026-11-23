import { cloneElement, isValidElement, useContext, useEffect, type ReactElement, type ReactNode } from "react"
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import ExclamationMarkCircle from "../../icons/plex/ExclamationMarkCircle"
import { textOf } from "../../internal/children"
import { FieldStack, FloatLabelContext } from "../../internal/fieldStack"
import { RowEndContext } from "../../internal/row"
import { dangerText } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import { Input } from "../Input/Input"
import { ListItem, ListStackedRow } from "../List/List"
import { Text } from "../Text/Text"
import { Textarea } from "../Textarea/Textarea"

/** What a Field hands its control: its name, the description's link and the invalid state. */
export type FieldControlProps = {
  /** The label's text, the control's name (a child's own name wins). */
  accessibilityLabel?: string
  /** The description or the error: a hint on a phone. */
  accessibilityHint?: string
  /** The description or the error on the web (react-native-web). */
  "aria-describedby"?: string
  /** The field has an error. */
  invalid: boolean
}

export type FieldProps = {
  /** The label's text. It names the control. */
  label: ReactNode
  /** The label is not drawn; it still names the control. On a row the value or placeholder starts at the row's edge. */
  hideLabel?: boolean
  /** Words that explain the field, under it (on a row under its label). */
  description?: ReactNode
  /** An error under the control; it marks the control invalid. */
  errorMessage?: ReactNode
  /** Content at the end of the label's line, such as a link that acts on the field. */
  labelAction?: ReactNode
  /** An asterisk after the label (visual only). */
  required?: boolean
  /** @default "horizontal" on a row with a visible label, else "vertical" */
  orientation?: "vertical" | "horizontal"
  /** One line of a List, as the web's `Field row` in a FieldGroup. */
  row?: boolean
  /** On a row, the control takes the rest of the line after the label. */
  fill?: boolean
  /** On a row, a symbol before the label (a ListItem's `leading`). */
  icon?: ReactNode
  /** On a row, a control at the end of the row after the row's own control. */
  action?: ReactNode
  /** The field is unavailable as a whole: its label dims with the control (the web's `data-disabled` on a row). */
  disabled?: boolean
  /** The control, given the field's name, description and invalid state; or a function that places them itself. */
  children: ReactElement | ((control: FieldControlProps) => ReactNode)
  style?: StyleProp<ViewStyle>
  testID?: string
}

type ChildProps = { accessibilityLabel?: string; "aria-label"?: string; invalid?: boolean; disabled?: boolean }

/** A control a Field floats its label in on Android: the outlined field of an Input or a Textarea. */
const floats = (child: ReactNode) => isValidElement(child) && (child.type === Input || child.type === Textarea)

/**
 * A label, a description and an error around a control, linked to it: Plex UI's Field. On its own the label stands over
 * the control (TextField's stack: iOS 15/20 Medium 8 above it, the help 4 under it; on Android an Input or a Textarea
 * floats the label in its outlined field). With `row` it is a line of a List, as the web's `Field row` on a phone: the
 * label at the start and the control at the end (a ListItem), or with `orientation="vertical"` or `hideLabel` the value
 * a line of its own under the label (iOS: 15/20 in the secondary label, 13 above and below).
 */
export function Field({
  label,
  hideLabel = false,
  description,
  errorMessage,
  labelAction,
  required = false,
  orientation,
  row = false,
  fill = false,
  icon,
  action,
  disabled,
  children,
  style,
  testID,
}: FieldProps) {
  const theme = useTheme()
  const name = textOf(label) || undefined
  const error = errorMessage != null && errorMessage !== false && errorMessage !== ""
  const element = typeof children === "function" ? null : (children as ReactElement<ChildProps>)
  const own = element?.props ?? {}
  // The child's own name wins, as the web's
  const control = (extra: Record<string, unknown>, bad: boolean): ReactNode => {
    const props: FieldControlProps = { accessibilityLabel: own.accessibilityLabel ?? own["aria-label"] ?? name, invalid: bad || own.invalid === true, ...extra }
    if (typeof children === "function") return children(props)
    // A row is the frame of its field, whatever its variant, as the web's rows on a phone; beside the label the value
    // ends at the row's end on Android too (the web's ghost row value), or starts the column of a List with `columns`
    return cloneElement(children as ReactElement<Record<string, unknown>>, row && floats(element) ? { ...props, variant: "ghost", valueAtEnd: true } : props)
  }
  const asterisk = required ? <Text color={theme.isAndroid ? dangerText(theme) : theme.color("--color-text-danger")}> *</Text> : null
  if (row) {
    const vertical = hideLabel || (orientation ?? "horizontal") === "vertical"
    if (vertical) {
      return (
        <ListStackedRow
          label={hideLabel ? undefined : <>{label}{asterisk}</>}
          description={description}
          error={errorMessage}
          disabled={disabled}
          action={action ?? labelAction}
          testID={testID}
        >
          {control({}, error)}
        </ListStackedRow>
      )
    }
    const end = control({}, error)
    const ends = fill ? <FillEnd>{end}</FillEnd> : end
    return (
      <ListItem
        label={<>{label}{asterisk}</>}
        description={description}
        error={errorMessage}
        leading={icon}
        disabled={disabled}
        accessibilityLabel={name}
        testID={testID}
        trailing={action != null ? <View style={styles.ends}>{ends}{action}</View> : ends}
      />
    )
  }
  const dimmed = disabled ?? own.disabled === true
  const floating = theme.isAndroid && !hideLabel && (orientation ?? "vertical") === "vertical" && floats(element)
  const stack = (
    <FieldStack
      label={label}
      hideLabel={hideLabel || orientation === "horizontal"}
      required={required}
      description={description}
      errorMessage={errorMessage}
      labelAction={orientation === "horizontal" ? undefined : labelAction}
      disabled={dimmed}
      floating={floating}
      style={orientation === "horizontal" ? styles.grow : style}
      testID={orientation === "horizontal" ? undefined : testID}
    >
      {({ described, invalid, shake }) =>
        floating ? (
          <FloatLabelContext.Provider value={{ label, required, shift: shake }}>{control(described, invalid)}</FloatLabelContext.Provider>
        ) : (
          control(described, invalid)
        )
      }
    </FieldStack>
  )
  if (orientation !== "horizontal") return stack
  // Beside the control: the label in its column, 40% of the field, as the web's horizontal Field
  return (
    <View testID={testID} style={[styles.horizontal, style]}>
      <View style={[styles.column, { minHeight: theme.isAndroid ? 50 : theme.length("--control-size-lg", 44) }]}>
        <Text weight="medium" color={dimmed ? "disabled" : theme.isAndroid ? theme.colors.textSecondary : "primary"} style={theme.isAndroid ? styles.androidLabel : styles.iosLabel}>
          {label}
          {asterisk}
        </Text>
        {labelAction}
      </View>
      {stack}
    </View>
  )
}

/** A row's end that takes the rest of the line after the label (`fill`). */
function FillEnd({ children }: { children: ReactNode }) {
  const rowEnd = useContext(RowEndContext)
  useEffect(() => {
    if (rowEnd == null) return
    rowEnd.fill(true)
    return () => rowEnd.fill(false)
  }, [rowEnd])
  return <View style={styles.grow}>{children}</View>
}

export type FieldErrorProps = {
  children: ReactNode
  /** The exclamation mark before the message (iOS). Turn it off where the message stands alone. @default true */
  icon?: boolean
  nativeID?: string
  style?: StyleProp<ViewStyle>
  testID?: string
}

/**
 * A form's error message, announced when it appears: Plex UI's FieldError. iOS: 15/20 in the danger color after a 16pt
 * exclamation mark, 4 apart (`--mobile-field-error-*`); Android: the help's 14sp in the error color, with no mark.
 */
export function FieldError({ children, icon = true, nativeID, style, testID }: FieldErrorProps) {
  const theme = useTheme()
  if (theme.isAndroid) {
    return (
      <Text nativeID={nativeID} testID={testID} color={dangerText(theme)} accessibilityLiveRegion="polite" style={[styles.androidError, style as never]}>
        {children}
      </Text>
    )
  }
  const color = theme.color("--field-error-color", theme.color("--color-text-danger-outline", theme.color("--color-text-danger")))
  const line = theme.length("--mobile-field-error-line-height", 20)
  const size = theme.length("--mobile-field-error-icon-size", 16)
  return (
    <View nativeID={nativeID} testID={testID} accessibilityLiveRegion="polite" style={[styles.error, { gap: theme.length("--mobile-field-error-icon-gap", 4) }, style]}>
      {icon ? <ExclamationMarkCircle size={size} color={color} style={{ marginTop: (line - size) / 2 }} /> : null}
      <Text color={color} style={[styles.shrink, { fontSize: theme.length("--mobile-field-error-font-size", 15), lineHeight: line }]}>
        {children}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
  ends: { flexDirection: "row", alignItems: "center", gap: 8 },
  horizontal: { alignSelf: "stretch", flexDirection: "row", alignItems: "flex-start", gap: 16 },
  column: { width: "40%", justifyContent: "center", gap: 4 },
  iosLabel: { fontSize: 15, lineHeight: 20 },
  androidLabel: { fontSize: 14, lineHeight: 18 },
  error: { flexDirection: "row", alignItems: "flex-start" },
  androidError: { fontSize: 14, lineHeight: 18 },
})
