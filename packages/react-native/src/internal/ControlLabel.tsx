import type { ReactNode } from "react"
import { StyleSheet, View } from "react-native"
import { Text } from "../components/Text/Text"
import { materialType } from "../theme/typography"
import { useTheme } from "../theme/ThemeProvider"

/**
 * The label and description beside a selection control: the 17/22 body and 15/20 secondary text of an iOS list row,
 * Material's Body L and Body M on Android.
 */
export function ControlLabel({ label, description, disabled, descriptionId }: { label?: ReactNode; description?: ReactNode; disabled?: boolean; descriptionId?: string }) {
  const theme = useTheme()
  if (label == null && description == null) return null
  const body = theme.isAndroid ? materialType.bodyLarge : { fontSize: 17, lineHeight: 22 }
  const small = theme.isAndroid ? materialType.bodyMedium : { fontSize: 15, lineHeight: 20 }
  return (
    <View style={styles.text}>
      {label != null ? (
        <Text color={disabled ? "disabled" : "primary"} style={{ fontSize: body.fontSize, lineHeight: body.lineHeight }}>
          {label}
        </Text>
      ) : null}
      {description != null ? (
        <Text nativeID={descriptionId} color={disabled ? "disabled" : "secondary"} style={{ fontSize: small.fontSize, lineHeight: small.lineHeight }}>
          {description}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  text: { flexShrink: 1, minWidth: 0 },
})
