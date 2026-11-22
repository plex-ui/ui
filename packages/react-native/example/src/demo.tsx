import { Text, useTheme } from "@plexui/react-native"
import type { ReactNode } from "react"
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"

/** A titled block of a screen of the gallery. */
export function Section({ title, note, children, testID }: { title: string; note?: string; children?: ReactNode; testID?: string }) {
  const theme = useTheme()
  return (
    <View style={styles.section} testID={testID}>
      <Text variant="footnote" color="secondary" style={theme.isIOS ? styles.iosTitle : undefined} weight={theme.isAndroid ? "medium" : undefined}>
        {theme.isIOS ? title.toUpperCase() : title[0].toUpperCase() + title.slice(1)}
      </Text>
      {note ? (
        <Text variant="footnote" color="tertiary">
          {note}
        </Text>
      ) : null}
      <View style={styles.body}>{children}</View>
    </View>
  )
}

/** Items in a row that wraps. */
export function Row({ children, gap = 8, style }: { children?: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, { gap }, style]}>{children}</View>
}

/** A labeled item: a sample over its name. */
export function Labeled({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <View style={styles.labeled}>
      {children}
      <Text variant="caption2" color="tertiary">
        {label}
      </Text>
    </View>
  )
}

/** A colorful backdrop under glass, so the glass shows what it blurs. */
export function Backdrop({ children }: { children?: ReactNode }) {
  return (
    <View style={styles.backdrop}>
      <View style={StyleSheet.absoluteFill}>
        {["#ff6b6b", "#ffd43b", "#51cf66", "#339af0", "#845ef7"].map((color) => (
          <View key={color} style={{ flex: 1, backgroundColor: color }} />
        ))}
      </View>
      <View style={styles.backdropContent}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  iosTitle: { letterSpacing: 0 },
  body: { gap: 12, marginTop: 4 },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  labeled: { alignItems: "center", gap: 4 },
  backdrop: { borderRadius: 16, overflow: "hidden", borderCurve: "continuous" },
  backdropContent: { padding: 16, gap: 12 },
})
