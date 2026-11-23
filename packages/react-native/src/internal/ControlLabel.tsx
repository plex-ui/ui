import type { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { Text } from "../components/Text/Text"
import { materialType } from "../theme/typography"
import { useTheme } from "../theme/ThemeProvider"

/** The phone layer's label and description tokens of each selection control (touch.css). */
const TOKENS = {
  checkbox: { label: "--checkbox-label", description: "--checkbox-description" },
  "radio-group": { label: "--radio-group-item", description: "--radio-group-description" },
  switch: { label: "--switch-label", description: "--switch-description" },
} as const

/**
 * Android's description under the label: a switch row writes a switch's in 13dp (in the gray text), the other
 * controls keep Body M.
 */
const ANDROID_DESCRIPTION = {
  checkbox: materialType.bodyMedium,
  "radio-group": materialType.bodyMedium,
  switch: { fontSize: 13, lineHeight: 16 },
} as const

/**
 * The label and description beside a selection control: the 17/22 body and 15/20 secondary text of an iOS list row
 * (the control's `--*-label-*` and `--*-description-*` tokens), Material's Body L and Body M on Android (a switch's
 * description 13dp). Disabled, iOS draws the text in the disabled gray; Android keeps its colors at half, as
 * Android's rows fade their text to 50%.
 */
/** The line height of a control's label: a mark beside it centers on its first line, as the web's indicator does. */
export function controlLabelLine(theme: ReturnType<typeof useTheme>, control: keyof typeof TOKENS = "checkbox") {
  return theme.isAndroid ? materialType.bodyLarge.lineHeight : theme.length(`${TOKENS[control].label}-line-height`, 22)
}

export function ControlLabel({
  label,
  description,
  disabled,
  descriptionId,
  control = "checkbox",
}: {
  label?: ReactNode
  description?: ReactNode
  disabled?: boolean
  descriptionId?: string
  /** Whose tokens size the text on iOS. @default "checkbox" */
  control?: keyof typeof TOKENS
}) {
  const theme = useTheme()
  if (label == null && description == null) return null
  const names = TOKENS[control]
  const body = theme.isAndroid
    ? materialType.bodyLarge
    : { fontSize: theme.length(`${names.label}-font-size`, 17), lineHeight: theme.length(`${names.label}-line-height`, 22) }
  const small = theme.isAndroid
    ? ANDROID_DESCRIPTION[control]
    : { fontSize: theme.length(`${names.description}-font-size`, 15), lineHeight: theme.length(`${names.description}-line-height`, 20) }
  const grayed = disabled && !theme.isAndroid
  return (
    <View style={[styles.text, disabled && theme.isAndroid ? styles.half : null]}>
      {label != null ? (
        <Text color={grayed ? "disabled" : "primary"} style={{ fontSize: body.fontSize, lineHeight: body.lineHeight }}>
          {label}
        </Text>
      ) : null}
      {description != null ? (
        <Text nativeID={descriptionId} color={grayed ? "disabled" : "secondary"} style={{ fontSize: small.fontSize, lineHeight: small.lineHeight }}>
          {description}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  text: { flexShrink: 1, minWidth: 0 },
  half: { opacity: 0.5 },
})
