import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react"
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ANDROID_FADE_ALPHA, ANDROID_FADE_STOPS, SoftBottomEdge, TabBarFade } from "../../internal/BarBackdrop"
import { withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import { Button, type ButtonProps } from "../Button/Button"

/** What stands between floating actions and the content under them */
export type BottomActionsBackground = "soft" | "fade"

export type BottomActionsProps = {
  /**
   * The screen's main action, a Button, and an optional second Button under it ("Not now", "Skip"). A second Button
   * with no `variant` of its own takes the platform's: on iOS 26 a glass capsule of the same size, as Apple's
   * step-by-step sheets set "Skip"; on Android a ghost button.
   */
  children: ReactNode
  /**
   * Puts the actions over the content (a scroll view under them), over a soft edge as a bottom Toolbar draws: on iOS
   * the screen's color fading in over 27pt above the actions, over a light blur; on Android the screen's color fading
   * in. Off, they take their room at the end of the screen. @default false
   */
  floating?: boolean
  /**
   * The edge under floating actions. `soft`: the screen's color in over 27pt above the actions, over a light blur.
   * `fade`: TabBar's fade, the content running on under the actions, crisp: from the top action's top the screen's
   * color comes in over 60pt to 85% and holds to the screen's edge; no blur. Android draws its soft edge for both, as
   * TabBar does. @default "soft"
   */
  background?: BottomActionsBackground
  /** The color the floating edge fades into: the screen's (a grouped screen's gray). @default the theme's background */
  canvasColor?: string
  /**
   * No main action: the lone Button takes the second action's look (iOS 26's glass capsule, Android's ghost button),
   * as a step whose rows move on by themselves keeps only its way past ("Skip"). @default false
   */
  secondary?: boolean
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
export function BottomActions({ children, floating = false, background = "soft", canvasColor, secondary = false, testID, style }: BottomActionsProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const android = theme.isAndroid
  const side = android ? 16 : 36
  // iOS: 2pt over the safe area (34 on a Face ID iPhone); a phone with a home button has none, so 16 there
  const bottom = android ? Math.max(insets.bottom, 0) + 16 : insets.bottom > 0 ? insets.bottom + 2 : 16
  const height = android ? 48 : 52
  const canvas = canvasColor ?? theme.colors.background
  const paddingTop = 8
  const actions = Children.toArray(children).map((child, index) => {
    if (!isValidElement(child) || child.type !== Button) return child
    const props = child.props as ButtonProps
    // The second action: iOS 26's glass capsule of the main one's size, Android's ghost button
    const second =
      (index > 0 || secondary) && props.variant === undefined
        ? android
          ? { variant: "ghost" as const, color: props.color ?? ("secondary" as const) }
          : { variant: "soft" as const, color: props.color ?? ("secondary" as const), mobileMaterial: props.mobileMaterial ?? ("glass" as const) }
        : null
    const button = cloneElement(child as ReactElement<ButtonProps>, {
      ...second,
      block: props.block ?? true,
      size: props.size ?? "3xl",
      style: [{ minHeight: height, borderRadius: height / 2 }, props.style],
    })
    // A disabled button's fill is see-through (the gray of iOS's disabled button): floating over the content it stands
    // on the screen's color, so the rows under it do not show through
    if (!floating || !props.disabled || android) return button
    return (
      <View key={child.key ?? index} style={{ borderRadius: height / 2, backgroundColor: canvas, alignSelf: (props.block ?? true) ? "stretch" : "flex-start" }}>
        {button}
      </View>
    )
  })
  return (
    <View
      testID={testID}
      pointerEvents="box-none"
      style={[styles.bar, { paddingHorizontal: side, paddingTop, paddingBottom: bottom, gap: 8 }, floating ? styles.floating : null, style]}
    >
      {floating ? (
        android ? (
          <SoftBottomEdge fill={withAlpha(canvas, ANDROID_FADE_ALPHA)} top={paddingTop - 13 + 60} tail={60} blur={0} stops={ANDROID_FADE_STOPS} />
        ) : background === "fade" ? (
          <TabBarFade fill={canvas} top={paddingTop} />
        ) : (
          <SoftBottomEdge fill={canvas} top={paddingTop} tail={27} blur={theme.length("--toolbar-edge-blur-small", 3)} />
        )
      ) : null}
      {actions}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: { alignSelf: "stretch" },
  floating: { position: "absolute", left: 0, right: 0, bottom: 0 },
})
