import { useState, type ReactNode } from "react"
import type { StyleProp, ViewStyle } from "react-native"
import Eye from "../../icons/plex/Eye"
import EyeOff from "../../icons/plex/EyeOff"
import { FieldStack } from "../../internal/fieldStack"
import { useTheme } from "../../theme/ThemeProvider"
import { Field } from "../Field/Field"
import { Input, InputField, type InputProps } from "../Input/Input"
import { List, useInList } from "../List/List"
import { Textarea } from "../Textarea/Textarea"

export type FloatingLabelInputProps = Omit<InputProps, "variant" | "size" | "invalid" | "multiline" | "secureTextEntry" | "pill"> & {
  /** The field's name: on Android it floats in the outlined field; on iOS it is the placeholder of its cell. */
  label: string
  /** An error under the field (iOS: inside the cell); it marks the field invalid. */
  errorMessage?: string
  /** @default false (true with an `errorMessage`) */
  invalid?: boolean
  /** Words under the field (iOS: the footer under its cell). */
  description?: ReactNode
  /**
   * The kind of value: `password` hides it (with the eye that shows it, `revealable`); `email`, `tel`, `url` and
   * `number` bring their keyboard. @default "text"
   */
  type?: "text" | "password" | "email" | "tel" | "url" | "number"
  /** The eye at the end that shows or hides the value. @default true for `type="password"` with no `endAdornment` */
  revealable?: boolean
  /** Called with the new state each time the eye is pressed. */
  onRevealedChange?: (revealed: boolean) => void
  /** Several lines (a Textarea). @default false */
  multiline?: boolean
  /** The lines of a `multiline` field. @default 2 */
  rows?: number
  /**
   * Where the label rests once it floats (Android): on the outline (`border`), or inside a filled box with the value
   * under it (`inside`). @default "border"
   */
  labelPlacement?: "border" | "inside"
  /** A capsule (the web's default). Android keeps the outlined field's 8dp corners unless it is set. */
  pill?: boolean
  style?: StyleProp<ViewStyle>
}

const KEYBOARD: Record<NonNullable<FloatingLabelInputProps["type"]>, Partial<InputProps>> = {
  text: {},
  password: { autoCapitalize: "none", autoCorrect: false },
  email: { inputMode: "email", autoCapitalize: "none", autoCorrect: false },
  tel: { inputMode: "tel" },
  url: { inputMode: "url", autoCapitalize: "none", autoCorrect: false },
  number: { inputMode: "decimal" },
}

/**
 * A text field named by a label that floats into its frame: Plex UI's FloatingLabelInput. Android: the outlined field,
 * its label 16sp at rest that springs to 12sp on the outline as the field takes focus or a value (or into a filled
 * box with `labelPlacement="inside"`), the help 14sp under it and a shake on an error, as TextField. iOS has no
 * floating label: the field is a cell named by its placeholder, as an iOS form (the web's phone view, a label-hidden
 * `Field row`): a row of its List, or a List of its own with the description in its footer.
 */
export function FloatingLabelInput({
  label,
  errorMessage,
  invalid: invalidProp,
  description,
  type = "text",
  revealable: revealableProp,
  onRevealedChange,
  multiline = false,
  rows = 2,
  labelPlacement = "border",
  pill,
  endAdornment,
  disabled = false,
  style,
  testID,
  accessibilityLabel,
  ...rest
}: FloatingLabelInputProps) {
  const theme = useTheme()
  const inList = useInList()
  const [revealed, setRevealed] = useState(false)
  const error = errorMessage != null && errorMessage !== ""
  const invalid = invalidProp ?? error
  const revealable = revealableProp ?? (type === "password" && endAdornment == null)
  const secure = (type === "password" || revealable) && !revealed && !multiline
  const reveal = () => {
    const next = !revealed
    setRevealed(next)
    onRevealedChange?.(next)
  }
  const eye = revealable && !multiline ? (
    <Input.AdornmentButton accessibilityLabel={revealed ? "Hide" : "Show"} selected={revealed} disabled={disabled} onPress={reveal}>
      {revealed ? <EyeOff /> : <Eye />}
    </Input.AdornmentButton>
  ) : null
  const end =
    endAdornment != null && eye != null ? (
      <>
        {endAdornment}
        {eye}
      </>
    ) : (endAdornment ?? eye ?? undefined)
  const field = {
    ...KEYBOARD[type],
    ...rest,
    disabled,
    invalid,
    secureTextEntry: secure,
    endAdornment: multiline ? undefined : end,
    accessibilityLabel: accessibilityLabel ?? label,
  }
  if (theme.isAndroid) {
    // The outlined field with its label floating on the line, or a filled box with the label inside
    return (
      <FieldStack label={label} description={description} errorMessage={errorMessage} invalid={invalid} disabled={disabled} floating style={style} testID={testID}>
        {({ described, invalid: bad, shake }) => (
          <InputField
            {...field}
            {...described}
            variant={labelPlacement === "inside" ? "soft" : "outline"}
            pill={labelPlacement === "border" && pill === true}
            label={label}
            invalid={bad}
            shift={shake}
            multiline={multiline}
            rows={multiline ? rows : undefined}
          />
        )}
      </FieldStack>
    )
  }
  // iOS: a cell named by its placeholder, its error inside it
  const cell = (
    <Field row hideLabel label={label} description={inList ? description : undefined} errorMessage={errorMessage} disabled={disabled} testID={inList ? testID : undefined}>
      {multiline ? <Textarea {...field} placeholder={rest.placeholder ?? label} rows={1} autoResize maxRows={Math.max(rows, 10)} /> : <Input {...field} placeholder={rest.placeholder ?? label} />}
    </Field>
  )
  if (inList) return cell
  return (
    <List footer={description} testID={testID} style={style}>
      {cell}
    </List>
  )
}
