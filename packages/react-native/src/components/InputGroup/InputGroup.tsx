import { createContext, isValidElement, useContext, type ReactElement, type ReactNode } from "react"
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { Pressable } from "../../internal/Pressable"
import { flattenChildren } from "../../internal/children"
import { RowEndContext } from "../../internal/row"
import { useTheme } from "../../theme/ThemeProvider"
import { Button, buttonColors, type ButtonProps, type ControlSize } from "../Button/Button"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { InputAdornmentButton, InputField, type InputProps } from "../Input/Input"
import { Text, type TextProps } from "../Text/Text"

type GroupState = { size: ControlSize; pill: boolean; disabled: boolean; invalid: boolean; row: boolean }

const GroupContext = createContext<GroupState | null>(null)

/** The size of a button in a group, a step under the field's (InputGroup.tsx). */
const BUTTON_SIZE: Record<ControlSize, ControlSize> = { "3xs": "3xs", "2xs": "3xs", xs: "3xs", sm: "3xs", md: "2xs", lg: "sm", xl: "md", "2xl": "lg", "3xl": "xl" }

export type InputGroupProps = {
  /** @default "outline" */
  variant?: "outline" | "soft"
  /** @default "md" */
  size?: ControlSize
  /** A capsule. @default false */
  pill?: boolean
  /** @default false */
  disabled?: boolean
  /** @default false */
  invalid?: boolean
  /** One `InputGroup.Input` or `InputGroup.Textarea`, and `InputGroup.Addon`s around it. */
  children: ReactNode
  style?: StyleProp<ViewStyle>
  testID?: string
}

export type InputGroupInputProps = Omit<InputProps, "variant" | "size" | "pill" | "startAdornment" | "endAdornment" | "multiline">
export type InputGroupTextareaProps = InputGroupInputProps & {
  /** @default 3 */
  rows?: number
  autoResize?: boolean
  maxRows?: number
}

export type InputGroupAddonAlign = "inline-start" | "inline-end" | "block-start" | "block-end"
export type InputGroupAddonProps = {
  /**
   * Where the addon sits: before or after the control on its line, or as a row above or below it (a Textarea's heading
   * or counter). @default "inline-start"
   */
  align?: InputGroupAddonAlign
  children: ReactNode
  style?: StyleProp<ViewStyle>
}

export type InputGroupButtonProps = Omit<ButtonProps, "size"> & {
  /** @default "secondary" */
  color?: ButtonProps["color"]
}

export type InputGroupTextProps = TextProps

/** The control of a group: its props, read by the group (it is drawn by the group's field). */
function InputGroupInput(_props: InputGroupInputProps): ReactElement | null {
  return null
}

function InputGroupTextarea(_props: InputGroupTextareaProps): ReactElement | null {
  return null
}

/** Content beside, above or below the control: icons, text, buttons. */
function InputGroupAddon({ children, style }: InputGroupAddonProps) {
  return <View style={[styles.addon, style]}>{children}</View>
}

/**
 * A ghost Button sized from the group, a step under the field. An icon alone (`uniform`) is the field's adornment
 * button: its 44pt (48dp) target around a 20pt (24dp) glyph in the field's icon gray.
 */
function InputGroupButton({ color = "secondary", variant = "ghost", uniform = false, disabled, children, accessibilityLabel, onPress, style, ...rest }: InputGroupButtonProps) {
  const group = useContext(GroupContext)
  const theme = useTheme()
  if (uniform && variant === "ghost" && group?.row && !theme.isAndroid) {
    // In a row on iOS, as the web's on a phone: a 36pt square (the 44pt row control less 4 above and below) that ends
    // at the row's inset, an 18pt symbol in the ghost button's color
    const size = theme.length("--control-size-lg", 44) - 8
    const off = disabled ?? group.disabled
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: off }}
        disabled={off}
        onPress={onPress ?? undefined}
        style={({ pressed }) => [
          styles.rowButton,
          // It overhangs the row's line, as the web's, so the row keeps its 52
          { width: size, height: size, marginVertical: (theme.length("--field-row-label-line-height", 22) - size) / 2, opacity: off || pressed ? 0.5 : 1 },
          style,
        ]}
      >
        <IconDefaultsProvider size={theme.length("--control-icon-size-md", 18)} color={buttonColors(theme, color, "ghost", false, false).text}>
          {children}
        </IconDefaultsProvider>
      </Pressable>
    )
  }
  if (uniform && variant === "ghost") {
    return (
      <InputAdornmentButton accessibilityLabel={accessibilityLabel ?? ""} disabled={disabled ?? group?.disabled} onPress={onPress ?? undefined} style={style}>
        {children}
      </InputAdornmentButton>
    )
  }
  return (
    <Button
      {...rest}
      color={color}
      variant={variant}
      uniform={uniform}
      size={BUTTON_SIZE[group?.size ?? "md"]}
      disabled={disabled ?? group?.disabled}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={style}
    >
      {children}
    </Button>
  )
}

/** Plain text in an addon (a prefix, a unit, a counter): the field's type in the secondary label. */
function InputGroupText({ style, children, ...rest }: InputGroupTextProps) {
  const theme = useTheme()
  const group = useContext(GroupContext)
  const type = theme.isAndroid
    ? group?.row
      ? styles.androidRowText
      : styles.androidText
    : { fontSize: theme.length("--field-row-label-font-size", 17), lineHeight: theme.length("--field-row-label-line-height", 22) }
  return (
    <Text {...rest} color={theme.colors.labelSecondary} numberOfLines={1} style={[type, { opacity: group?.disabled ? 0.5 : 1 }, style]}>
      {children}
    </Text>
  )
}

type AddonElement = ReactElement<InputGroupAddonProps>

/**
 * A field with addons around its control: Plex UI's InputGroup. The addons on its line are the field's adornments
 * (an icon, a prefix, a unit, a button), in the frame of an Input of the same `variant`, `size` and `pill`; block
 * addons stand as rows above and below the control inside one frame. In a List row (a `Field row`) the row is the
 * frame, as the web's on a phone: a prefix sits right before the value in the secondary label, a unit right after it
 * ("72 kg"), a button at the row's end.
 */
export function InputGroup({ variant = "outline", size = "md", pill = false, disabled = false, invalid = false, children, style, testID }: InputGroupProps) {
  const theme = useTheme()
  const rowEnd = useContext(RowEndContext)
  const row = rowEnd != null
  const parts = flattenChildren(children).filter(isValidElement)
  const control = parts.find((part) => part.type === InputGroupInput || part.type === InputGroupTextarea) as
    | ReactElement<InputGroupTextareaProps>
    | undefined
  const addons = parts.filter((part) => part.type === InputGroupAddon) as AddonElement[]
  const at = (align: InputGroupAddonAlign) => addons.filter((addon) => (addon.props.align ?? "inline-start") === align)
  const inline = (align: "inline-start" | "inline-end") => {
    const found = at(align)
    return found.length === 0 ? undefined : <View style={styles.addons}>{found}</View>
  }
  const multiline = control?.type === InputGroupTextarea
  const own = control?.props ?? {}
  const state: GroupState = { size, pill, disabled, invalid, row }
  const field = (props: Partial<InputProps> & { rows?: number; autoResize?: boolean; maxRows?: number; valueAtEnd?: boolean }) => (
    <InputField
      {...own}
      disabled={own.disabled ?? disabled}
      invalid={own.invalid ?? invalid}
      size={size}
      pill={pill}
      multiline={multiline}
      rows={multiline ? (own.rows ?? 3) : undefined}
      {...props}
    />
  )
  if (row) {
    // The row is the frame: the prefix right before the value, the unit 8 after it (as the web's "5 km"), a button at
    // the end
    const start = inline("inline-start")
    const end = inline("inline-end")
    // A text prefix is part of the value ("$0.00", as iOS writes it); an icon keeps a gap before the value
    const textPrefix = at("inline-start").every((addon) =>
      flattenChildren(addon.props.children).every((child) => typeof child === "string" || (isValidElement(child) && child.type === InputGroupText)),
    )
    return (
      <GroupContext.Provider value={state}>
        <View testID={testID} style={[styles.inRow, style]}>
          {start != null ? <View style={{ marginEnd: textPrefix ? 0 : theme.isAndroid ? 4 : 8 }}>{start}</View> : null}
          {/* On Android a value before its unit stands at the row's end, as a value row's ("72 kg") */}
          <View style={styles.grow}>{field({ variant: "ghost", style: theme.isAndroid ? styles.flush : undefined, valueAtEnd: theme.isAndroid && rowEnd.align !== "start" })}</View>
          {end != null ? <View style={{ marginStart: theme.isAndroid ? 4 : 8 }}>{end}</View> : null}
        </View>
      </GroupContext.Provider>
    )
  }
  const above = at("block-start")
  const below = at("block-end")
  if (above.length === 0 && below.length === 0) {
    return (
      <GroupContext.Provider value={state}>
        {field({ variant, startAdornment: inline("inline-start"), endAdornment: inline("inline-end"), style, testID })}
      </GroupContext.Provider>
    )
  }
  // Block addons: rows above and below the control in one frame, the control bare between them
  const radius = theme.isAndroid ? 8 : theme.length("--control-radius-lg", 10)
  return (
    <GroupContext.Provider value={state}>
      <View
        testID={testID}
        style={[
          styles.block,
          {
            borderRadius: pill ? 9999 : radius,
            borderWidth: variant === "outline" ? StyleSheet.hairlineWidth * 2 : 0,
            borderColor: invalid ? theme.color("--color-border-danger-outline", theme.colors.border) : theme.colors.border,
            backgroundColor: variant === "soft" ? theme.color("--input-soft-background-color", theme.colors.surfaceSecondary) : undefined,
            opacity: disabled ? 0.5 : 1,
          },
          style,
        ]}
      >
        {above.length > 0 ? <View style={[styles.blockRow, styles.blockTop]}>{above}</View> : null}
        {field({ variant: "ghost", startAdornment: inline("inline-start"), endAdornment: inline("inline-end") })}
        {below.length > 0 ? <View style={[styles.blockRow, styles.blockBottom]}>{below}</View> : null}
      </View>
    </GroupContext.Provider>
  )
}

InputGroup.Input = InputGroupInput
InputGroup.Textarea = InputGroupTextarea
InputGroup.Addon = InputGroupAddon
InputGroup.Button = InputGroupButton
InputGroup.Text = InputGroupText

export { InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea }

const styles = StyleSheet.create({
  addon: { flexDirection: "row", alignItems: "center", gap: 8 },
  addons: { flexDirection: "row", alignItems: "center", gap: 8 },
  inRow: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center" },
  grow: { flex: 1, minWidth: 0 },
  rowButton: { alignItems: "center", justifyContent: "center" },
  flush: { paddingStart: 0, paddingEnd: 0 },
  androidText: { fontSize: 16, lineHeight: 20 },
  androidRowText: { fontSize: 16, lineHeight: 20 },
  block: { alignSelf: "stretch", overflow: "hidden" },
  blockRow: { paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  blockTop: { paddingTop: 10 },
  blockBottom: { paddingBottom: 10 },
})
