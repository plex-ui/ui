import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react"
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useTheme } from "../../theme/ThemeProvider"
import { Button, type ButtonProps } from "../Button/Button"

export type BottomActionsProps = {
  /** The screen's main action, a Button, and an optional second Button under it (a ghost "Not now"). */
  children: ReactNode
  /** Puts the actions over the content (a scroll view under them); off, they take their room at the end of the screen. @default false */
  floating?: boolean
  testID?: string
  style?: StyleProp<ViewStyle>
}

/**
 * The main action at the bottom of a phone screen: an onboarding's "Continue", a form's "Create account". iOS 26: a
 * capsule across the screen, 36pt from its sides, 52pt tall, its bottom just over the home indicator (2pt above the
 * safe area, about 36pt from the screen's edge on a Face ID iPhone), as iOS 26's own setup screens set it; a second
 * action stands under it, 8 apart. Android: the Plex Android look's 48dp full-width button, 16dp from the sides and
 * 16 above the gesture bar. Each Button inside is a block of the size `3xl` unless it sets its own.
 */
export function BottomActions({ children, floating = false, testID, style }: BottomActionsProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const android = theme.isAndroid
  const side = android ? 16 : 36
  // iOS: 2pt over the safe area (34 on a Face ID iPhone); a phone with a home button has none, so 16 there
  const bottom = android ? Math.max(insets.bottom, 0) + 16 : insets.bottom > 0 ? insets.bottom + 2 : 16
  const height = android ? 48 : 52
  const actions = Children.toArray(children).map((child) =>
    isValidElement(child) && child.type === Button
      ? cloneElement(child as ReactElement<ButtonProps>, {
          block: (child.props as ButtonProps).block ?? true,
          size: (child.props as ButtonProps).size ?? "3xl",
          style: [{ minHeight: height, borderRadius: height / 2 }, (child.props as ButtonProps).style],
        })
      : child,
  )
  return (
    <View
      testID={testID}
      pointerEvents="box-none"
      style={[styles.bar, { paddingHorizontal: side, paddingBottom: bottom, gap: 8 }, floating ? styles.floating : null, style]}
    >
      {actions}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: { alignSelf: "stretch", paddingTop: 8 },
  floating: { position: "absolute", left: 0, right: 0, bottom: 0 },
})
