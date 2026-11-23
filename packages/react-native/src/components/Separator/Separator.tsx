import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { divider } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"

export type SeparatorProps = {
  /** A line across (between rows) or standing up (between inline items, as tall as its row). @default "horizontal" */
  orientation?: "horizontal" | "vertical"
  /**
   * Hidden from screen readers, as a line that only draws. `false` makes it a `separator` element, for a line that
   * marks a real grouping. @default true
   */
  decorative?: boolean
  testID?: string
  style?: StyleProp<ViewStyle>
}

/**
 * A thin line that divides content, as @plexui/ui's Separator: `--separator-color` (`--color-border`) at
 * `--separator-thickness` (1) on iOS, as the web draws it on a phone. On Android the line between the rows of a card
 * in the Plex Android look: one device pixel of the divider gray (a light gray over a light card, the darkest gray at
 * night). A vertical one stretches to the height of its row, at least a line of text.
 */
export function Separator({ orientation = "horizontal", decorative = true, testID, style }: SeparatorProps) {
  const theme = useTheme()
  const color = theme.isAndroid ? divider(theme) : theme.color("--separator-color", theme.colors.border)
  // One device pixel on Android (a hairline); the token's 1 elsewhere, the web's phone line
  const thickness = theme.isAndroid ? StyleSheet.hairlineWidth : theme.length("--separator-thickness", 1)
  const vertical = orientation === "vertical"
  const a11y = decorative
    ? { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" as const, "aria-hidden": true }
    : { role: "separator" as const, ...(Platform.OS === "web" ? { "aria-orientation": orientation } : null) }
  return (
    <View
      {...a11y}
      testID={testID}
      style={[
        styles.line,
        { backgroundColor: color },
        vertical ? { width: thickness, alignSelf: "stretch", minHeight: MIN_VERTICAL } : { height: thickness, alignSelf: "stretch" },
        style,
      ]}
    />
  )
}

/** A vertical line is at least a line of the body text tall (the web's `min-height: 1em`). */
const MIN_VERTICAL = 16

const styles = StyleSheet.create({
  line: { flexShrink: 0 },
})
