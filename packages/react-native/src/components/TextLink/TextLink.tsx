import { useState, type ReactNode } from "react"
import { Linking, Platform, Pressable, Text as RNText, type GestureResponderEvent, type StyleProp, type TextStyle } from "react-native"
import { controlHighlight } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { FontWeightName } from "../../theme/types"
import { Button, buttonColors } from "../Button/Button"
import { Text } from "../Text/Text"

export type TextLinkProps = {
  /** The link's text; an icon after it (an external link's arrow) stands on the text's line. */
  children: ReactNode
  /** Where the link goes: opened with `Linking`, a link of the page on the web. An http:// or https:// URL is external. */
  href?: string
  /** The primary link color in place of the text's own, with no underline unless `underline` asks for one. @default false */
  primary?: boolean
  /** Underlines the link. @default true, false for a `primary` link */
  underline?: boolean
  /** External link behavior (a new tab on the web) whatever the URL. Detected from the URL by default. */
  forceExternal?: boolean
  /** Called when the link is pressed, before it opens `href`; `event.preventDefault()` keeps it from opening. */
  onPress?: (event: GestureResponderEvent) => void
  /** The weight of the link's text; it takes the text's own around it by default (`--link-font-weight: inherit`). */
  weight?: FontWeightName
  /**
   * A small action of its own outside running text (Restore Purchases under a store's plans): on iOS the text alone
   * at the subheadline (15/20, regular) in the link color with a 44pt target and the system's pressed fade; on Android
   * Material's small text button. @default false
   */
  standalone?: boolean
  accessibilityLabel?: string
  testID?: string
  style?: StyleProp<TextStyle>
}

const EXTERNAL = /^https?:\/\//

/** The underline's distance under the letters on the web: the token, else a tenth of the type. */
const underlineOffset = (value: unknown) => (typeof value === "number" ? value : typeof value === "string" && value !== "" ? value : "0.1em")

/**
 * A link in running text, as @plexui/ui's TextLink: put it inside a `Text`, whose face, size and color it takes
 * (the web's `currentcolor`), underlined; `primary` colors it with `--link-primary-text-color` and drops the underline.
 * iOS highlights a pressed link as its text views do (a gray behind the text); Android and the web draw the press of a
 * row in the Plex Android look (the text's ink at 11%, white at 5% at night). With `href` it is a `link` and opens the
 * URL (an `<a>` on the web, a new tab for an external one); with only `onPress` it is a `button`.
 */
export function TextLink({ children, href, primary = false, underline = !primary, forceExternal, onPress, weight, standalone = false, accessibilityLabel, testID, style }: TextLinkProps) {
  const theme = useTheme()
  const [pressed, setPressed] = useState(false)
  const external = forceExternal ?? EXTERNAL.test(href ?? "")
  const web = Platform.OS === "web"
  const press = (event: GestureResponderEvent) => {
    onPress?.(event)
    // On the web the link is an anchor the browser opens (a new tab for an external one)
    if (!href || web || prevented(event)) return
    void Linking.openURL(href).catch(() => {})
  }
  // react-native-web draws a Text with `href` as an anchor: the browser opens it, a new tab for an external one
  const anchor = web && href ? { href, hrefAttrs: external ? { target: "_blank", rel: "noopener noreferrer" } : undefined } : null
  if (standalone) {
    const role = href ? "link" : "button"
    // A pressable is a View, which react-native-web draws as an anchor with the same `href`
    const link = anchor as object | null
    if (theme.isAndroid)
      return (
        <Button {...link} variant="ghost" color="primary" size="sm" onPress={press} accessibilityRole={role} accessibilityLabel={accessibilityLabel} testID={testID}>
          {weight != null || style != null ? (
            // A caller's face or type over the button's label (14/20 Medium in the primary)
            <Text weight={weight ?? "medium"} color={buttonColors(theme, "primary", "ghost", false, false).text} style={[{ fontSize: 14, lineHeight: 20 }, style]}>
              {children}
            </Text>
          ) : (
            children
          )}
        </Button>
      )
    return (
      // UIButton's plain style: no frame, the text faded while held, the target 44 tall
      <Pressable
        {...link}
        onPress={press}
        accessibilityRole={role}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        hitSlop={{ left: 8, right: 8 }}
        style={({ pressed: held }) => ({ minHeight: 44, justifyContent: "center", alignSelf: "flex-start", opacity: held ? 0.35 : 1 })}
      >
        <Text weight={weight ?? "regular"} color={theme.color("--link-primary-text-color", theme.colors.textAccent)} style={[{ fontSize: 15, lineHeight: 20 }, style]}>
          {children}
        </Text>
      </Pressable>
    )
  }
  const actionable = href != null || onPress != null
  // iOS's own Text highlights a press (as UITextView's links); elsewhere the press layer of a row
  const highlight = theme.isIOS && !web ? null : pressed ? { backgroundColor: controlHighlight(theme.scheme) } : null
  return (
    <RNText
      {...anchor}
      accessibilityRole={href ? "link" : onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={actionable ? press : undefined}
      onPressIn={actionable ? () => setPressed(true) : undefined}
      onPressOut={actionable ? () => setPressed(false) : undefined}
      style={[
        primary ? { color: theme.color("--link-primary-text-color", theme.colors.textAccent) } : null,
        underline ? { textDecorationLine: "underline" } : null,
        // The web sets the line a tenth of the type under the letters (`--link-underline-decoration-offset`), clear of
        // the descenders; a phone draws it where the platform does
        underline && Platform.OS === "web" ? ({ textUnderlineOffset: underlineOffset(theme.token("--link-underline-decoration-offset")) } as TextStyle) : null,
        weight ? theme.font(weight) : null,
        highlight,
        style,
      ]}
    >
      {children}
    </RNText>
  )
}

/** A press the handler kept from going on (`event.preventDefault()`). */
function prevented(event: GestureResponderEvent) {
  const synthetic = event as GestureResponderEvent & { isDefaultPrevented?: () => boolean; defaultPrevented?: boolean }
  return synthetic.defaultPrevented === true || synthetic.isDefaultPrevented?.() === true
}
