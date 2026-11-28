import { Children, cloneElement, isValidElement, useCallback, useEffect, useRef, useState, type ComponentRef, type ReactElement, type ReactNode } from "react"
import { AccessibilityInfo, Animated, Platform, StyleSheet, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type StyleProp, type ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ANDROID_FADE_ALPHA, ANDROID_FADE_STOPS, SoftBottomEdge, TabBarFade } from "../../internal/BarBackdrop"
import { curves } from "../../internal/motion"
import { useTransitionValue } from "../../internal/transition"
import { withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import { Button, type ButtonProps } from "../Button/Button"

/** What stands between floating actions and the content under them */
export type BottomActionsBackground = "soft" | "fade" | "none"

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
   * TabBar does. `none`: nothing under the actions, the content running on bare under them, as Apple's own screens
   * float their actions; a disabled Button still stands on `canvasColor` on iOS, so the rows do not show through its
   * gray. @default "soft"
   */
  background?: BottomActionsBackground
  /** The color the floating edge fades into: the screen's (a grouped screen's gray). @default the theme's background */
  canvasColor?: string
  /**
   * No main action: the lone Button takes the second action's look (iOS 26's glass capsule, Android's ghost button),
   * as a step whose rows move on by themselves keeps only its way past ("Skip"). @default false
   */
  secondary?: boolean
  /**
   * Floating actions out of the way: they move down off the screen by their height and fade, and take no presses
   * while away (iOS 300ms ease in and out; Android Material's 175ms out and 225ms back). `useHideOnScroll` sets it
   * from the scroll view under them. With reduced motion they fade at once. @default false
   */
  hidden?: boolean
  testID?: string
  style?: StyleProp<ViewStyle>
}

export type HideOnScrollOptions = {
  /** How far down the content scrolls before the actions go. @default 24 */
  threshold?: number
  /**
   * Near the end of the content (within `endDistance`): `show` brings the actions back, as Safari's bar comes back
   * at a page's end; `hide` keeps them away, for a page whose own actions stand at its end. @default "show"
   */
  atEnd?: "show" | "hide"
  /** How near the end counts as the end. @default 24 */
  endDistance?: number
}

/**
 * Floating actions that go as the content scrolls down past `threshold` and come back on the way up, as iOS 26
 * minimizes its bars and Material's bottom app bar hides on scroll. Spread the scroll props on the scroll view and
 * pass `hidden` to BottomActions. A bounce past either end moves nothing, and with a screen reader on (iOS, Android)
 * the actions stay.
 */
export function useHideOnScroll({ threshold = 24, atEnd = "show", endDistance = 24 }: HideOnScrollOptions = {}) {
  const [hidden, setHidden] = useState(false)
  const [reader, setReader] = useState(false)
  const last = useRef(0)
  useEffect(() => {
    // react-native-web cannot tell and answers yes, so the web goes by the scroll alone
    if (Platform.OS === "web") return
    let live = true
    AccessibilityInfo.isScreenReaderEnabled().then((on) => live && setReader(on), () => undefined)
    const subscription = AccessibilityInfo.addEventListener("screenReaderChanged", setReader)
    return () => {
      live = false
      subscription.remove()
    }
  }, [])
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent
      const most = Math.max(0, contentSize.height - layoutMeasurement.height)
      const y = Math.min(Math.max(contentOffset.y, 0), most)
      const delta = y - last.current
      last.current = y
      if (y <= threshold) return setHidden(false)
      if (most - y <= endDistance) return setHidden(atEnd === "hide")
      if (delta > 0) setHidden(true)
      else if (delta < 0) setHidden(false)
    },
    [threshold, atEnd, endDistance],
  )
  return { hidden: hidden && !reader, onScroll, scrollEventThrottle: 16 }
}

/**
 * The main action at the bottom of a phone screen: an onboarding's "Continue", a form's "Create account". iOS 26: a
 * capsule across the screen, 36pt from its sides, 52pt tall, its bottom just over the home indicator (2pt above the
 * safe area, about 36pt from the screen's edge on a Face ID iPhone), as iOS 26's own setup screens set it; a second
 * action stands under it, 8 apart. Android: the Plex Android look's 48dp full-width button, 16dp from the sides and
 * 16 above the gesture bar. Each Button inside is a block of the size `3xl` unless it sets its own.
 */
export function BottomActions({ children, floating = false, background = "soft", canvasColor, secondary = false, hidden = false, testID, style }: BottomActionsProps) {
  const theme = useTheme()
  const away = floating && hidden
  // The web: away, the actions leave the Tab order too (pointerEvents and aria-hidden keep them focusable there)
  const bar = useRef<ComponentRef<typeof View>>(null)
  useEffect(() => {
    if (Platform.OS !== "web") return
    const node = bar.current as unknown as HTMLElement | null
    if (node && "inert" in node) node.inert = away
  }, [away])
  const [own, setOwn] = useState(0)
  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height
    setOwn((old) => (old === next ? old : next))
  }
  const shift = useTransitionValue(away ? 1 : 0, {
    duration: theme.isAndroid ? (away ? 175 : 225) : 300,
    easing: theme.isAndroid ? (away ? curves.accelerate : curves.decelerate) : curves.easeInOut,
    native: true,
    reducedMotion: theme.reducedMotion,
  })
  const insets = useSafeAreaInsets()
  const android = theme.isAndroid
  const side = android ? 16 : 36
  // iOS: 2pt over the safe area (34 on a Face ID iPhone); a phone with a home button has none, so 16 there
  const bottom = android ? Math.max(insets.bottom, 0) + 16 : insets.bottom > 0 ? insets.bottom + 2 : 16
  const height = android ? 48 : 52
  const canvas = canvasColor ?? theme.colors.background
  const disabledGlass = theme.color("--button-disabled-glass", theme.scheme === "dark" ? "rgba(120, 120, 128, 0.36)" : "rgba(120, 120, 128, 0.34)")
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
    // iOS 26's floating action while it cannot be pressed (Health's Next before a choice): gray glass, the gray system
    // fill over the screen's color (`--button-disabled-glass`), its label gray
    const grayGlass = floating && !android && props.disabled
    // A brand's accent button keeps its own height and corners (`--button-accent-height`, `--button-accent-radius`)
    const own = props.color === "accent" && theme.token("--button-accent-height") != null ? theme.length("--button-accent-height") : height
    const corner = props.color === "accent" && theme.token("--button-accent-radius") != null ? Math.min(theme.length("--button-accent-radius"), own / 2) : own / 2
    // The main floating action on iOS 26 is prominent glass (`.glassProminent`): its color with the glass rim
    const main = !second && floating && !android && (props.variant ?? "solid") === "solid" ? { mobileMaterial: props.mobileMaterial ?? ("glass" as const) } : null
    const button = cloneElement(child as ReactElement<ButtonProps>, {
      ...second,
      ...main,
      block: props.block ?? true,
      size: props.size ?? "3xl",
      style: [{ minHeight: own, borderRadius: corner }, grayGlass ? { backgroundColor: disabledGlass } : null, props.style],
    })
    // A disabled button's fill is see-through (the gray glass above): floating over the content it stands on the
    // screen's color, so the rows under it do not show through and its face is the gray over that color. The backing stays, clear, while the button is
    // enabled: the button keeps its place in the tree, and with it focus, a screen reader's place and a press
    if (!floating || android) return button
    return (
      <View
        key={child.key ?? index}
        style={{ borderRadius: corner, backgroundColor: props.disabled ? canvas : "transparent", alignSelf: (props.block ?? true) ? "stretch" : "flex-start" }}
      >
        {button}
      </View>
    )
  })
  const motion = floating
    ? {
        opacity: shift.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
        // With reduced motion the actions fade where they stand
        transform: [{ translateY: theme.reducedMotion ? 0 : shift.interpolate({ inputRange: [0, 1], outputRange: [0, own] }) }],
      }
    : null
  return (
    <Animated.View
      ref={bar}
      testID={testID}
      pointerEvents={away ? "none" : "box-none"}
      accessibilityElementsHidden={away}
      aria-hidden={away || undefined}
      importantForAccessibility={away ? "no-hide-descendants" : "auto"}
      onLayout={floating ? onLayout : undefined}
      style={[styles.bar, { paddingHorizontal: side, paddingTop, paddingBottom: bottom, gap: 8 }, floating ? styles.floating : null, motion, style]}
    >
      {floating && background !== "none" ? (
        android ? (
          <SoftBottomEdge fill={withAlpha(canvas, ANDROID_FADE_ALPHA)} top={paddingTop - 13 + 60} tail={60} blur={0} stops={ANDROID_FADE_STOPS} />
        ) : background === "fade" ? (
          <TabBarFade fill={canvas} top={paddingTop} />
        ) : (
          <SoftBottomEdge fill={canvas} top={paddingTop} tail={27} blur={theme.length("--toolbar-edge-blur-small", 3)} />
        )
      ) : null}
      {actions}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  bar: { alignSelf: "stretch" },
  floating: { position: "absolute", left: 0, right: 0, bottom: 0 },
})
