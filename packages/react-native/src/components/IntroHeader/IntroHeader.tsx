import type { ReactNode } from "react"
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { useTheme } from "../../theme/ThemeProvider"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { Text } from "../Text/Text"

export type IntroHeaderAlign = "cells" | "text"

export type IntroHeaderProps = {
  /** The step's title: Title 2 bold on iOS (22/28), Headline Small on Android (24/32). Read as a header. */
  title: ReactNode
  /** An optional line or two under the title: Title 2 in the secondary label on iOS, Body Large on Android. */
  description?: ReactNode
  /**
   * An optional symbol or picture over the title, in the middle on iOS, at the start on Android. A kit icon takes
   * the accent and 80pt on iOS (its drawing about 67), 40dp in the primary on Android, unless it sets its own.
   */
  media?: ReactNode
  /**
   * What the title and description line up with. `cells`: the column the content under them stands on, the edge of
   * the fields, cards and buttons (a step with a field or a few rows, as Apple Account or Set Up eSIM); `text`: the text
   * inside the cells, the row inset (20pt, 16dp) in, over a long grouped list (as Health's Choose the Medication Type).
   * @default "cells"
   */
  align?: IntroHeaderAlign
  testID?: string
  style?: StyleProp<ViewStyle>
}

/**
 * The header of a step in a sheet or a setup flow: an optional symbol, the step's title and what it asks, as iOS 27's
 * own steps set them (Apple Account, Add Email Address, Recovery Key, Pair Hearing Device, Set Up eSIM, Health's
 * medication steps). Measured on a 430pt phone: the symbol's drawing about 70pt, in the middle, its bottom about 31pt
 * over the title's line; the title in Title 2 bold and the description in Title 2 in the secondary label right under
 * it, both at the start of the column. The header keeps no space round it: the screen sets it 24 under its bar and the
 * content 24 under it. Android: the setup wizard's header, a 40dp symbol in the primary at the start 16 over a Headline
 * Small title, the description in Body Large 16 under it in onSurfaceVariant.
 */
export function IntroHeader({ title, description, media, align = "cells", testID, style }: IntroHeaderProps) {
  const theme = useTheme()
  const android = theme.isAndroid
  const inset = align === "text" ? (android ? 16 : theme.length("--list-row-inset", 20)) : 0
  return (
    <View testID={testID} style={[{ paddingHorizontal: inset }, style]}>
      {media != null ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          // A symbol's box keeps about 7 round its drawing at 80: 24 under the box is the drawing's 31 over the title
          style={[styles.media, { alignSelf: android ? "flex-start" : "center", marginBottom: android ? 16 : 24 }]}
        >
          <IconDefaultsProvider size={android ? 40 : 80} color={android ? theme.material.primary : theme.colors.accent}>
            {media}
          </IconDefaultsProvider>
        </View>
      ) : null}
      <Text variant="title2" weight={android ? "regular" : "bold"} accessibilityRole="header" style={styles.start}>
        {title}
      </Text>
      {description != null ? (
        <Text variant={android ? "body" : "title2"} color="secondary" style={[styles.start, android ? styles.androidDescription : null]}>
          {description}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  media: { alignItems: "center", justifyContent: "center" },
  // `left` is the start: React Native turns it to the right in a right-to-left layout
  start: { textAlign: "left" },
  androidDescription: { marginTop: 16 },
})
