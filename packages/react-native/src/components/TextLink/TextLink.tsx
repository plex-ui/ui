import { useState, type ReactNode } from "react"
import { Linking, Platform, Text as RNText, type GestureResponderEvent, type StyleProp, type TextStyle } from "react-native"
import { controlHighlight } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { FontWeightName } from "../../theme/types"

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
  accessibilityLabel?: string
  testID?: string
  style?: StyleProp<TextStyle>
}

const EXTERNAL = /^https?:\/\//

/**
 * A link in running text, as @plexui/ui's TextLink: put it inside a `Text`, whose face, size and color it takes
 * (the web's `currentcolor`), underlined; `primary` colors it with `--link-primary-text-color` and drops the underline.
 * iOS highlights a pressed link as its text views do (a gray behind the text); Android and the web draw the press of a
 * row in the Plex Android look (the text's ink at 11%, white at 5% at night). With `href` it is a `link` and opens the
 * URL (an `<a>` on the web, a new tab for an external one); with only `onPress` it is a `button`.
 */
export function TextLink({ children, href, primary = false, underline = !primary, forceExternal, onPress, weight, accessibilityLabel, testID, style }: TextLinkProps) {
  const theme = useTheme()
  const [pressed, setPressed] = useState(false)
  const external = forceExternal ?? EXTERNAL.test(href ?? "")
  const web = Platform.OS === "web"
  const press = (event: GestureResponderEvent) => {
    onPress?.(event)
    if (!href || web || prevented(event)) return
    void Linking.openURL(href).catch(() => {})
  }
  const actionable = href != null || onPress != null
  // react-native-web draws a Text with `href` as an anchor: the browser opens it, a new tab for an external one
  const anchor = web && href ? { href, hrefAttrs: external ? { target: "_blank", rel: "noopener noreferrer" } : undefined } : null
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
