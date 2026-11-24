import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactElement, type ReactNode } from "react"
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Search from "../../icons/plex/Search"
import { BarBackdrop, SoftBottomEdge, TabBarFade, ANDROID_FADE_ALPHA, ANDROID_FADE_STOPS, glassBarBlur, useAndroidGlass } from "../../internal/BarBackdrop"
import { childrenOfType, textOf } from "../../internal/children"
import { physicalPadding } from "../../internal/direction"
import { Glass } from "../../internal/Glass"
import { curves } from "../../internal/motion"
import { useTabKeys } from "../../internal/tabKeys"
import { barSurface, mix, stateLayer, withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { Text, textStyle } from "../Text/Text"

export type TabBarBackground = "soft" | "fade" | "glass" | "hard" | "none"

export type TabBarSearch = {
  /** The value of the search tab. */
  value: string
  /** Accessible name of the search tab. @default "Search" */
  label?: string
}

export type TabBarProminent = {
  /** The value of the prominent tab. */
  value: string
  /** Accessible name of the prominent tab: its circle shows the symbol only. */
  label: string
  /** The symbol, a Plex UI icon. */
  icon: ReactNode
}

export type TabBarProps = Omit<ViewProps, "children"> & {
  /** The controlled value of the selected tab. Use with `onValueChange`. */
  value?: string
  /** The selected tab when it is first rendered. */
  defaultValue?: string
  /** Called with the value of the tab a person selects. */
  onValueChange?: (value: string) => void
  /** A search tab in a glass circle of its own at the trailing end, as the iOS 26 separate search tab. */
  search?: TabBarSearch
  /** The one destination lifted out of the capsule, in a glass circle of its own; with `search` it takes the circle and search becomes the last tab of the capsule, as on the web. */
  prominent?: TabBarProminent
  /**
   * The bar shows the selected tab alone, in a 48pt circle (iOS 26 `tabBarMinimizeBehavior`); a tap on it expands the
   * bar. Drive it from the scroll of the screen with `useTabBarMinimize`. Android's bar does not minimize.
   */
  minimized?: boolean
  /** The minimized state when it is first rendered. @default false */
  defaultMinimized?: boolean
  /** Called when the bar minimizes or expands. */
  onMinimizedChange?: (minimized: boolean) => void
  /**
   * How the bar meets content under it: `soft` and `none` let content run under the capsule (on Android `soft` fades
   * the screen's color in under it, as the Android bar does), as native iOS 26 tab bars do; `fade` mutes it, as many
   * apps do on iOS: the rows over the capsule stay clear, and from its top the screen's color comes in over 60pt to
   * 85%, held to the screen's edge, with no blur (on Android as `soft`); `hard` an opaque bar, `glass` a translucent
   * blurred one. The lines and the glass show once `scrolled` says content is under it; the fade stays drawn.
   * @default "soft"
   */
  background?: TabBarBackground
  /** Content is under the bar. */
  scrolled?: boolean
  /**
   * The color of the screen under the bar, which its scroll edge takes (a grouped screen's canvas).
   * @default the theme's background
   */
  canvasColor?: string
  /** Content in a glass capsule above the tabs (iOS 26 bottom accessory); minimized, between the two circles. */
  accessory?: ReactNode
  /**
   * The badges' color: `danger`, the red of iOS's badges, or `accent`, the accent with its on color, as Android's
   * badges are; a tab's own `badgeColor` wins. @default the platform's own: "danger" on iOS, "accent" on Android
   */
  badgeColor?: TabBarBadgeColor
  /** Pads the bar for the home indicator. @default true */
  safeArea?: boolean
  /** Accessible name of the navigation. @default "Tabs" */
  "aria-label"?: string
  /** `TabBar.Item` elements. */
  children?: ReactNode
  style?: StyleProp<ViewStyle>
}

export type TabBarItemProps = {
  /** The value of the tab. */
  value: string
  /** The label under the symbol, and the accessible name of the tab. */
  label: string
  /** The symbol, a Plex UI icon. */
  icon: ReactNode
  /**
   * A count or a short word in a capsule over the symbol, read after the label: red on iOS, the accent on Android. A
   * count of 0 shows none, as on iOS. `true` draws a small dot on Android and an empty capsule on iOS.
   */
  badge?: ReactNode
  /** The badge's color, over the bar's `badgeColor`. */
  badgeColor?: TabBarBadgeColor
  /** When `true`, the tab cannot be selected. */
  disabled?: boolean
  /** Called when the tab is pressed, before it is selected. */
  onPress?: () => void
  testID?: string
}

export type TabBarBadgeColor = "danger" | "accent"

type TabBarContextValue = {
  value: string | undefined
  badgeColor?: TabBarBadgeColor
  minimized: boolean
  select: (value: string) => void
  expand: () => void
  keys: ReturnType<typeof useTabKeys>
}

const TabBarContext = createContext<TabBarContextValue | null>(null)

/** A badge shows unless it is empty: nothing, false, an empty text or a count of 0 (iOS hides `.badge(0)`). */
const hasBadge = (badge: ReactNode) => badge != null && badge !== false && badge !== "" && badge !== 0

/** The accessible name of a tab: "Inbox, 3". */
const tabName = (label: string, badge: ReactNode) => (hasBadge(badge) && (typeof badge === "string" || typeof badge === "number") ? `${label}, ${badge}` : label)

/** One destination of the bar. */
function TabBarItem(props: TabBarItemProps): ReactElement | null {
  const context = useContext(TabBarContext)
  if (!context) throw new Error("TabBar.Item must be inside a TabBar")
  return <Tab {...props} context={context} />
}
TabBarItem.displayName = "TabBar.Item"

type TabProps = TabBarItemProps & { context: TabBarContextValue; kind?: "tab" | "circle"; hideLabel?: boolean }

function Tab(props: TabProps) {
  return <IOSTab {...props} />
}

function press(context: TabBarContextValue, { value, disabled, onPress }: TabBarItemProps, collapsed: boolean) {
  if (disabled) return
  // A minimized bar shows the selected tab only; pressing it brings the other tabs back
  if (collapsed) {
    context.expand()
    return
  }
  onPress?.()
  context.select(value)
}

function IOSTab({ value, label, icon, badge, badgeColor, disabled = false, onPress, testID, context, kind = "tab", hideLabel = false }: TabProps) {
  const theme = useTheme()
  const selected = context.value === value
  const circle = kind === "circle"
  const collapsed = context.minimized && !circle
  const minimizedSize = theme.length("--tab-bar-minimized-size", 48)
  const capsulePadding = theme.length("--tab-bar-capsule-padding-block", 4)
  const color = disabled
    ? theme.colors.textDisabled
    : collapsed
      ? theme.color("--tab-bar-item-color-minimized")
      : selected
        ? theme.color("--tab-bar-item-color-selected")
        : theme.color("--tab-bar-item-color")
  const showLabel = !hideLabel && !collapsed && !circle
  const size: ViewStyle = circle
    ? { width: "100%", height: "100%", justifyContent: "center", paddingVertical: 0 }
    : collapsed
      ? { width: minimizedSize - 2 * capsulePadding, height: minimizedSize - 2 * capsulePadding, justifyContent: "center", paddingVertical: 0 }
      : { width: theme.length("--tab-bar-item-width", 85), height: theme.length("--tab-bar-item-height", 54), paddingTop: 6, paddingBottom: 7 }
  const pillOutset = theme.length("--tab-bar-pill-outset", 6)
  // The pill reaches 6 past a tab and stands 4 inside a circle; a minimized tab has none
  const pill: ViewStyle = circle ? { top: capsulePadding, bottom: capsulePadding, left: capsulePadding, right: capsulePadding } : { top: 0, bottom: 0, left: -pillOutset, right: -pillOutset }
  const badgeTop = collapsed ? theme.length("--tab-bar-minimized-badge-top", 2) - capsulePadding : theme.length("--tab-bar-badge-top", 2.33)
  const badgeStart = collapsed ? theme.length("--tab-bar-minimized-badge-start", 9.67) : theme.length("--tab-bar-badge-start", 11.67)
  return (
    <Pressable
      {...(collapsed ? null : context.keys({ value, disabled }))}
      accessibilityRole="tab"
      accessibilityLabel={tabName(label, badge)}
      accessibilityState={{ selected, disabled }}
      aria-selected={selected}
      disabled={disabled}
      onPress={() => press(context, { value, label, icon, disabled, onPress }, collapsed)}
      testID={testID}
      // A minimized tab takes the touches of its whole 48pt circle, not only its 40pt face
      hitSlop={collapsed ? capsulePadding : undefined}
      // A tab bar's labels keep their size, as UIKit's: a large text size shows the tab in the large content viewer
      accessibilityShowsLargeContentViewer
      accessibilityLargeContentTitle={textOf(label) || undefined}
      style={[styles.iosItem, size, circle ? null : { flexShrink: 1, minWidth: 0 }]}
    >
      {selected && !collapsed ? <View pointerEvents="none" style={[styles.pill, pill, { backgroundColor: theme.color("--tab-bar-item-background-selected") }]} /> : null}
      <View style={[styles.iosIcon, { height: theme.length("--tab-bar-icon-box", 28) }]}>
        <IconDefaultsProvider size={theme.length("--tab-bar-icon-size", 28)} color={color}>
          {icon}
        </IconDefaultsProvider>
      </View>
      {showLabel ? (
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          weight="semibold"
          color={color}
          style={{ fontSize: theme.length("--tab-bar-label-font-size", 10), lineHeight: theme.length("--tab-bar-label-line-height", 12), maxWidth: "100%" }}
        >
          {label}
        </Text>
      ) : null}
      {hasBadge(badge) && !circle ? (
        <View pointerEvents="none" style={[styles.iosBadge, iosBadgeStyle(theme, badgeColor ?? context.badgeColor), { top: badgeTop, marginLeft: badgeStart }]}>
          {badge === true ? null : (
            <Text color={(badgeColor ?? context.badgeColor) === "accent" ? theme.color("--color-text-accent-solid", "#FFFFFF") : theme.color("--tab-bar-badge-color")} style={iosBadgeText(theme)} numberOfLines={1} allowFontScaling={false}>
              {badge}
            </Text>
          )}
        </View>
      ) : null}
    </Pressable>
  )
}

const iosBadgeStyle = (theme: Theme, color: TabBarBadgeColor | undefined): ViewStyle => {
  const size = theme.length("--tab-bar-badge-size", 18)
  return {
    minWidth: size,
    height: size,
    paddingHorizontal: theme.length("--tab-bar-badge-padding-inline", 5),
    borderRadius: size / 2,
    // iOS's own red, or the accent
    backgroundColor: color === "accent" ? theme.color("--color-background-accent-solid") : theme.color("--tab-bar-badge-background"),
  }
}

const iosBadgeText = (theme: Theme) => ({
  fontSize: theme.length("--tab-bar-badge-font-size", 12),
  lineHeight: theme.length("--tab-bar-badge-size", 18),
  textAlign: "center" as const,
  ...theme.font("regular"),
})

/** A badge grows from nothing about its point and shrinks back into it: 380ms on an ease-out quint. */
const BADGE_SCALE = { duration: 380, easing: curves.easeOutQuint }
/** A new count: the digits that change slide down 0.3 of the text's size (3dp at 10) and cross-fade, in 320ms. */
const COUNT_CHANGE = { duration: 320, easing: curves.easeOutQuint }
const COUNT_SLIDE = 3

/**
 * Android's counter on a tab: a 16dp capsule in the accent, at least 16 wide and 8 wider than its
 * count, its text 10 Medium in white, centered 11 past the tab's middle and 10 under its top (a wider one keeps that
 * start and grows toward the end, off the symbol), cut out of the symbol by a 1.33dp ring (here the ring takes the color
 * behind it). `true` draws a dot of the accent there. It scales in and out about that point (the center of a dot or a
 * one-digit count), staying drawn as it shrinks away.
 */
function AndroidBadge({ badge, ring, color }: { badge: ReactNode; ring: string | Animated.AnimatedInterpolation<string>; color?: TabBarBadgeColor }) {
  const theme = useTheme()
  const m = theme.material
  const reduced = theme.reducedMotion
  const visible = hasBadge(badge)
  // The badge last shown, drawn while it shrinks away, and whether it is still drawn
  const [last, setLast] = useState<ReactNode>(visible ? badge : null)
  if (visible && badge !== last) setLast(badge)
  const [drawn, setDrawn] = useState(visible)
  if (visible && !drawn) setDrawn(true)
  const [scale] = useState(() => new Animated.Value(visible ? 1 : 0))
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (reduced) {
      scale.stopAnimation()
      scale.setValue(visible ? 1 : 0)
      return
    }
    const animation = Animated.timing(scale, { toValue: visible ? 1 : 0, ...BADGE_SCALE, useNativeDriver: false })
    animation.start(({ finished }) => {
      if (finished && !visible) setDrawn(false)
    })
    return () => animation.stop()
  }, [visible, reduced, scale])
  if (!drawn || (!visible && reduced)) return null
  const shown = visible ? badge : last
  const dot = shown === true
  return (
    <Animated.View pointerEvents="none" style={[styles.androidBadgeFrame, { transform: [{ scale }] }]}>
      <Animated.View style={[dot ? styles.androidDot : styles.androidBadge, { backgroundColor: color === "danger" ? m.error : m.primary, borderColor: ring }]}>
        {dot ? null : <BadgeCount value={shown} color={color === "danger" ? m.onError : m.onPrimary} reduced={reduced} />}
      </Animated.View>
    </Animated.View>
  )
}

type CountChange = { from: string; to: string; progress: Animated.Value }

/**
 * The text of an Android badge. When a count changes, the characters it shares with the last one (from either end)
 * stay and the others cross-fade, the old ones sliding down out of the capsule and the new ones down into it.
 */
function BadgeCount({ value, color, reduced }: { value: ReactNode; color: string; reduced: boolean }) {
  const theme = useTheme()
  const text = typeof value === "number" || typeof value === "string" ? String(value) : null
  const [current, setCurrent] = useState(text)
  const [change, setChange] = useState<CountChange | null>(null)
  if (text !== current) {
    setCurrent(text)
    setChange(text != null && current != null && !reduced ? { from: current, to: text, progress: new Animated.Value(0) } : null)
  }
  useEffect(() => {
    if (!change) return
    const animation = Animated.timing(change.progress, { toValue: 1, ...COUNT_CHANGE, useNativeDriver: false })
    animation.start(({ finished }) => {
      if (finished) setChange((now) => (now === change ? null : now))
    })
    return () => animation.stop()
  }, [change])
  const style = [textStyle(theme, { weight: "medium" }), { fontSize: 10, lineHeight: 13, letterSpacing: theme.tracking(10), color }]
  if (!change) {
    return (
      <Text color={color} numberOfLines={1} allowFontScaling={false} style={{ fontSize: 10, lineHeight: 13, ...theme.font("medium") }}>
        {value}
      </Text>
    )
  }
  const { from, to, progress } = change
  const shared = Math.min(from.length, to.length)
  let head = 0
  while (head < shared && from[head] === to[head]) head++
  let tail = 0
  while (tail < shared - head && from[from.length - 1 - tail] === to[to.length - 1 - tail]) tail++
  const leaving = from.slice(head, from.length - tail)
  const coming = to.slice(head, to.length - tail)
  const slide = (fromY: number, toY: number) => ({ transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [fromY, toY] }) }] })
  return (
    <View style={styles.countRow}>
      {head > 0 ? (
        <Animated.Text allowFontScaling={false} style={style}>
          {to.slice(0, head)}
        </Animated.Text>
      ) : null}
      <View>
        <Animated.Text allowFontScaling={false} style={[style, { opacity: progress }, slide(-COUNT_SLIDE, 0)]}>
          {coming}
        </Animated.Text>
        {leaving ? (
          // Centered over the new characters, in a box wide enough that it never wraps
          <View style={styles.countLeaving}>
            <Animated.Text allowFontScaling={false} style={[style, { opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }, slide(0, COUNT_SLIDE)]}>
              {leaving}
            </Animated.Text>
          </View>
        ) : null}
      </View>
      {tail > 0 ? (
        <Animated.Text allowFontScaling={false} style={style}>
          {to.slice(to.length - tail)}
        </Animated.Text>
      ) : null}
    </View>
  )
}

/** Android's decelerate ease, 1 - (1 - t)² (DecelerateInterpolator). */
const DECELERATE = curves.decelerate
/** The symbol turns from its outline to its filled look in about 100ms (six frames). */
const ICON_FILL_MS = 100

/**
 * The symbol of an Android tab in a color between `from` and `to` as `shown` runs, drawn again on each step (an icon
 * takes its color as a string), its filled look fading in over its outline as the tab is selected and out as it is
 * left (the thicker strokes cover the outline, so the selected symbol looks filled alone).
 */
function AndroidTabIcon({ icon, shown, selected, from, to }: { icon: ReactNode; shown: Animated.Value; selected: boolean; from: string; to: string }) {
  const theme = useTheme()
  const [amount, setAmount] = useState(selected ? 1 : 0)
  useEffect(() => {
    const id = shown.addListener(({ value }) => setAmount(value))
    return () => shown.removeListener(id)
  }, [shown])
  const [filled] = useState(() => new Animated.Value(selected ? 1 : 0))
  useEffect(() => {
    const animation = Animated.timing(filled, { toValue: selected ? 1 : 0, duration: theme.reducedMotion ? 0 : ICON_FILL_MS, easing: Easing.linear, useNativeDriver: false })
    animation.start()
    return () => animation.stop()
  }, [selected, theme.reducedMotion, filled])
  const color = from === to || amount <= 0 ? from : amount >= 1 ? to : mix(to, from, amount)
  return (
    <View style={styles.androidIconBox}>
      <IconDefaultsProvider size={24} color={color}>
        {icon}
      </IconDefaultsProvider>
      <Animated.View pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[StyleSheet.absoluteFill, { opacity: filled }]}>
        <IconDefaultsProvider size={24} color={color} weight="semibold">
          {icon}
        </IconDefaultsProvider>
      </Animated.View>
    </View>
  )
}

/**
 * A destination of the Android tab bar: its 24dp symbol over its label (Medium 12, ExtraBold
 * when selected) in a 48dp pill of the width the bar gives it. Selected, the symbol takes the accent and the label its
 * darker text, both blending there with the tab's own pill of the accent at 9%, which fades in and grows from 0.6
 * over 320ms, decelerating. No ripple on a press, as the Android tab bar draws none.
 */
function AndroidTab({
  value,
  label,
  icon,
  badge,
  badgeColor,
  disabled = false,
  onPress,
  testID,
  context,
  width,
  fontSize,
}: TabProps & { width: number | undefined; fontSize: number }) {
  const theme = useTheme()
  const m = theme.material
  const selected = context.value === value
  const [shown] = useState(() => new Animated.Value(selected ? 1 : 0))
  useEffect(() => {
    Animated.timing(shown, { toValue: selected ? 1 : 0, duration: theme.reducedMotion ? 0 : 320, easing: DECELERATE, useNativeDriver: false }).start()
  }, [selected, shown, theme.reducedMotion])
  // The selected label is a little darker than its symbol in light (#0D7FCF under #1A91E6), the same in dark mode; a
  // disabled tab keeps the ink at 38%
  const off = withAlpha(m.onSurface, 0.38)
  const iconTo = disabled ? off : m.primary
  const iconFrom = disabled ? off : m.onSurface
  const text = disabled ? off : shown.interpolate({ inputRange: [0, 1], outputRange: [m.onSurface, theme.scheme === "dark" ? m.primary : theme.colors.textAccent] })
  const card = barSurface(m, theme.scheme)
  return (
    <Pressable
      {...context.keys({ value, disabled })}
      accessibilityRole="tab"
      accessibilityLabel={tabName(label, badge)}
      accessibilityState={{ selected, disabled }}
      aria-selected={selected}
      disabled={disabled}
      onPress={() => press(context, { value, label, icon, disabled, onPress }, false)}
      testID={testID}
      // The 48dp pill takes the touches of the capsule's 56dp height
      hitSlop={{ top: 4, bottom: 4 }}
      style={[styles.androidTab, width != null ? { width } : { paddingHorizontal: 16 }]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.androidPill,
          {
            backgroundColor: withAlpha(m.primary, 0.09),
            opacity: shown.interpolate({ inputRange: [0, 1], outputRange: [0, 1], easing: DECELERATE }),
            transform: [{ scale: shown.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
          },
        ]}
      />
      <AndroidTabIcon icon={icon} shown={shown} selected={selected} from={iconFrom} to={iconTo} />
      {/* An Animated text, so its color can blend: the face, size and tracking of the kit's Text */}
      <Animated.Text
        numberOfLines={1}
        style={[textStyle(theme, { weight: selected ? "bold" : "medium" }), { fontSize, lineHeight: 16, letterSpacing: theme.tracking(fontSize), maxWidth: "100%", color: text }]}
      >
        {label}
      </Animated.Text>
      {/* The ring takes the pill's color as the pill fades in under it */}
      <AndroidBadge badge={badge} color={badgeColor ?? context.badgeColor} ring={shown.interpolate({ inputRange: [0, 1], outputRange: [card, mix(m.primary, card, 0.09)], easing: DECELERATE })} />
    </Pressable>
  )
}

/**
 * The search or prominent tab of the bar, a 56dp circle of its own beside the capsule (ours: the Android bar has
 * none): in the capsule's glass for search, in the accent for the prominent one.
 */
function AndroidCircle({ value, label, icon, disabled = false, onPress, testID, context, accent, glass }: TabProps & { accent: boolean; glass: ViewStyle }) {
  const theme = useTheme()
  const m = theme.material
  const selected = context.value === value
  const [pressed, setPressed] = useState(false)
  const color = disabled ? withAlpha(m.onSurface, 0.38) : accent ? m.onPrimary : selected ? m.primary : m.onSurface
  return (
    <Pressable
      {...context.keys({ value, disabled })}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      aria-selected={selected}
      disabled={disabled}
      onPress={() => press(context, { value, label, icon, disabled, onPress }, false)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      testID={testID}
      style={[styles.androidCircle, accent && !disabled ? { backgroundColor: m.primary, boxShadow: glass.boxShadow } : glass]}
    >
      {pressed && !disabled ? <View pointerEvents="none" style={[styles.androidCircleLayer, { backgroundColor: withAlpha(color, stateLayer.pressed) }]} /> : null}
      <IconDefaultsProvider size={24} color={color} weight={selected ? "semibold" : undefined}>
        {icon}
      </IconDefaultsProvider>
    </Pressable>
  )
}

/**
 * Android's widths of its tabs: each its label and room on either side, 16 a side at 12sp, else 8,
 * else 4 at 10sp, the first that fits the room; then the tabs grow together to fill 320dp (or the room, if less), the
 * tabs wider than an even share keeping their width, or shrink together to fit. `labels` are the widths at 12sp.
 */
function androidTabWidths(labels: number[], room: number): { fontSize: number; widths: number[] } {
  const passes = [
    { fontSize: 12, pad: 16 },
    { fontSize: 12, pad: 8 },
    { fontSize: 10, pad: 4 },
  ]
  const sized = (pass: (typeof passes)[number]) => labels.map((width) => (width * pass.fontSize) / 12 + 2 * pass.pad)
  const pass = passes.find((each) => sized(each).reduce((sum, width) => sum + width, 0) <= room) ?? passes[passes.length - 1]
  const widths = sized(pass)
  const share = room / Math.max(1, labels.length)
  const grows = widths.some((width) => width <= share) ? widths.map((width) => (width > share ? 0 : 1)) : widths.map(() => 1)
  const total = widths.reduce((sum, width) => sum + width, 0)
  const least = Math.min(320, room)
  const weight = grows.reduce((sum, each) => sum + each, 0)
  const out =
    total > room ? widths.map((width) => (width * room) / total) : total < least ? widths.map((width, index) => width + ((least - total) / weight) * grows[index]) : widths
  return { fontSize: pass.fontSize, widths: out.map(Math.round) }
}

/** The room on either side of the Android capsule and the gap to the circle beside it. */
const ANDROID_SIDE = 12
const ANDROID_GAP = 8

/**
 * The Android tab bar: the tabs in a 56dp capsule of see-through glass centered 8dp over
 * the gesture bar, at least 320dp of tabs wide, the selected one on its own pill of the accent at 9%; our search or
 * prominent tab in a 56dp circle beside it, an accessory in a capsule above. Its background as the Toolbar's: `soft`
 * the screen's color fading in over the content under the bar.
 */
function AndroidBar({
  context,
  tabs,
  circle,
  accent,
  accessory,
  background,
  scrolled,
  canvasColor,
  safeArea,
  ariaLabel,
  rest,
  style,
}: {
  context: TabBarContextValue
  tabs: TabBarItemProps[]
  circle: TabBarItemProps | undefined
  accent: boolean
  accessory: ReactNode
  background: TabBarBackground
  scrolled: boolean
  canvasColor: string | undefined
  safeArea: boolean
  ariaLabel: string
  rest: ViewProps
  style: StyleProp<ViewStyle>
}) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const m = theme.material
  const [width, setWidth] = useState(0)
  const [labels, setLabels] = useState<Record<string, number>>({})
  // The room for the tabs: the bar less its sides, the circle beside the capsule and the capsule's 4dp padding
  const sideInsets = safeArea ? insets.left + insets.right : 0
  const room = width - 2 * ANDROID_SIDE - sideInsets - (circle ? 56 + ANDROID_GAP : 0) - 8
  const measured = width > 0 && tabs.every((tab) => labels[tab.value] != null)
  const layout = measured ? androidTabWidths(tabs.map((tab) => labels[tab.value] ?? 0), room) : null
  const onLabel = useCallback((value: string, next: number) => setLabels((prev) => (prev[value] === next ? prev : { ...prev, [value]: next })), [])
  const canvas = canvasColor ?? theme.colors.background
  const glass = useAndroidGlass("tabs", canvas)
  const veil = withAlpha(canvas, parseFloat(String(theme.token("--page-bar-veil-opacity") ?? "55")) / 100)
  // Android's fade under its tabs, from the bar's top (8 above the capsule): the
  // screen's color fading in over 60dp in four even steps, then at 81% down to the edge; the other backgrounds show
  // once content is under the bar
  const backdrop =
    background === "soft" || background === "fade" ? (
      <SoftBottomEdge fill={withAlpha(canvas, ANDROID_FADE_ALPHA)} top={60} tail={60} blur={0} stops={ANDROID_FADE_STOPS} />
    ) : background === "hard" ? (
      <BarBackdrop fill={canvas} line={scrolled ? m.outlineVariant : undefined} edge="top" />
    ) : background === "glass" && scrolled ? (
      <BarBackdrop fill={veil} blur={glassBarBlur(theme)} line={m.outlineVariant} edge="top" />
    ) : null
  return (
    <View
      {...rest}
      // Around the capsule the content shows and takes touches
      pointerEvents="box-none"
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      style={[
        styles.androidBar,
        { paddingBottom: 8 + (safeArea ? insets.bottom : 0) },
        physicalPadding(ANDROID_SIDE + (safeArea ? insets.left : 0), ANDROID_SIDE + (safeArea ? insets.right : 0)),
        style,
      ]}
    >
      {backdrop}
      {/* The labels' own widths at 12sp, out of sight, for the widths of the tabs */}
      <View pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.measureBox}>
        <View style={styles.measureRow}>
          {tabs.map((tab) => (
            <View key={tab.value} onLayout={(event: LayoutChangeEvent) => onLabel(tab.value, event.nativeEvent.layout.width)}>
              <Text numberOfLines={1} weight="medium" style={{ fontSize: 12, lineHeight: 16 }}>
                {tab.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
      {accessory ? <View style={[styles.androidAccessory, glass]}>{accessory}</View> : null}
      <View accessibilityRole="tablist" aria-label={ariaLabel} pointerEvents="box-none" style={styles.androidRow}>
        <View style={[styles.androidCapsule, glass]}>
          {tabs.map((tab, index) => (
            <AndroidTab key={tab.value} {...tab} context={context} width={layout?.widths[index]} fontSize={layout?.fontSize ?? 12} />
          ))}
        </View>
        {circle ? <AndroidCircle {...circle} context={context} accent={accent} glass={glass} /> : null}
      </View>
    </View>
  )
}

/** The tabs of a TabBar, without the circles; fragments opened. */
const items = (children: ReactNode) => childrenOfType<TabBarItemProps>(children, TabBarItem)

/**
 * The tab bar of a phone screen: on iOS 26 two to five tabs, each a symbol over a label, in a floating glass capsule,
 * the selected one on a pill, with an optional search or prominent tab in a circle of its own and a bottom accessory,
 * after the Plex UI phone layer (`--tab-bar-*`). On Android the tabs stand in a capsule of see-through glass,
 * each a symbol over a label, the selected one on its own pill of the accent, the search or prominent tab in a circle
 * beside it.
 * Props follow @plexui/ui.
 */
function TabBarRoot({
  value: valueProp,
  defaultValue,
  onValueChange,
  search,
  prominent,
  minimized: minimizedProp,
  defaultMinimized = false,
  onMinimizedChange,
  background = "soft",
  scrolled = false,
  canvasColor,
  accessory,
  safeArea = true,
  badgeColor,
  "aria-label": ariaLabel = "Tabs",
  children,
  style,
  ...rest
}: TabBarProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const tabs = items(children)
  const [ownValue, setOwnValue] = useState(defaultValue ?? tabs[0]?.props.value)
  const value = valueProp ?? ownValue
  const [ownMinimized, setOwnMinimized] = useState(defaultMinimized)
  // The Android bar has no minimized state
  const minimized = theme.isIOS && (minimizedProp ?? ownMinimized)
  const select = (next: string) => {
    if (valueProp === undefined) setOwnValue(next)
    onValueChange?.(next)
  }
  const expand = () => {
    if (minimizedProp === undefined) setOwnMinimized(false)
    onMinimizedChange?.(false)
  }
  const searchTab: TabBarItemProps | undefined = search ? { value: search.value, label: search.label ?? "Search", icon: <Search /> } : undefined
  const prominentTab: TabBarItemProps | undefined = prominent ? { value: prominent.value, label: prominent.label, icon: prominent.icon } : undefined
  // The prominent tab takes the circle of the search tab, and search joins the capsule as its last tab
  const circle = prominentTab ?? searchTab
  const capsuleTabs: TabBarItemProps[] = [...tabs.map((tab) => tab.props), ...(prominentTab && searchTab ? [searchTab] : [])]
  const shown = minimized ? capsuleTabs.filter((tab) => tab.value === value).slice(0, 1) : capsuleTabs
  const visible = shown.length ? shown : capsuleTabs.slice(0, 1)
  const reachable = [...visible, ...(circle ? [circle] : [])]
  const keys = useTabKeys(reachable, value, select)
  const context: TabBarContextValue = { value, badgeColor, minimized, select, expand, keys }

  if (theme.isAndroid) {
    return (
      <TabBarContext.Provider value={context}>
        <AndroidBar
          context={context}
          tabs={capsuleTabs}
          circle={circle}
          accent={!!prominentTab}
          accessory={accessory}
          background={background}
          scrolled={scrolled}
          canvasColor={canvasColor}
          safeArea={safeArea}
          ariaLabel={ariaLabel}
          rest={rest}
          style={style}
        />
      </TabBarContext.Provider>
    )
  }

  const padTop = minimized ? theme.length("--tab-bar-minimized-padding-top", 19) : theme.length("--tab-bar-padding-top", 12)
  const padBottom = minimized ? theme.length("--tab-bar-minimized-padding-bottom", 28) : theme.length("--tab-bar-padding-bottom", 21)
  // The capsule stands 21 above the bottom of a phone with a home indicator (34), as the kit draws it
  const paddingBottom = safeArea ? Math.max(padBottom, insets.bottom - 13) : padBottom
  const gutter = minimized ? theme.length("--tab-bar-minimized-gutter", 28) : theme.length("--tab-bar-gutter", 21)
  const accessoryHeight = theme.length("--tab-bar-accessory-height", 48)
  const circleSize = minimized ? theme.length("--tab-bar-minimized-size", 48) : theme.length("--tab-bar-search-size", 62)
  const capsulePadding = theme.length("--tab-bar-capsule-padding-block", 4)
  const accessoryGap = theme.length("--tab-bar-accessory-gap", 8)
  const minimizedGap = theme.length("--tab-bar-minimized-accessory-gap", 13.33)
  const canvas = canvasColor ?? theme.colors.background
  const veil = withAlpha(canvas, parseFloat(String(theme.token("--page-bar-veil-opacity") ?? "55")) / 100)
  const backdrop =
    background === "hard" ? (
      <BarBackdrop fill={canvas} line={scrolled ? theme.color("--page-bar-hard-line") : undefined} edge="top" />
    ) : background === "glass" && scrolled ? (
      <BarBackdrop fill={veil} blur={glassBarBlur(theme)} line={theme.color("--page-bar-line")} edge="top" />
    ) : background === "fade" ? (
      // The screen's color coming in from the capsule's top (or the accessory's) down
      <TabBarFade fill={canvas} top={padTop} />
    ) : null
  // The accessory keeps one place in the tree, so its state lives through a minimize: above the capsule, or between
  // the two circles as tall as they are. The bar keeps its height either way, as TabBar.module.css
  const sideLeft = gutter + (safeArea ? insets.left : 0)
  const sideRight = gutter + (safeArea ? insets.right : 0)
  const accessoryPlace: ViewStyle = minimized
    ? { bottom: paddingBottom, height: circleSize, left: sideLeft + circleSize + minimizedGap, right: sideRight + (circle ? circleSize + minimizedGap : 0) }
    : { top: padTop, height: accessoryHeight, left: sideLeft, right: sideRight }
  return (
    <TabBarContext.Provider value={context}>
      <View
        {...rest}
        accessibilityRole="tablist"
        aria-label={ariaLabel}
        style={[
          { paddingTop: padTop + (accessory ? accessoryHeight + accessoryGap : 0), paddingBottom },
          physicalPadding(sideLeft, sideRight),
          style,
        ]}
      >
        {backdrop}
        {accessory ? (
          <Glass key="accessory" radius={accessoryHeight / 2} elevation="raised" style={[styles.accessory, accessoryPlace]}>
            {accessory}
          </Glass>
        ) : null}
        <View style={[styles.iosRow, { gap: theme.length("--tab-bar-gap", 8), justifyContent: circle || minimized ? "space-between" : "center" }]}>
          <Glass
            radius={999}
            elevation="raised"
            style={[styles.capsule, minimized ? { padding: capsulePadding } : { paddingVertical: capsulePadding, paddingHorizontal: theme.length("--tab-bar-capsule-padding-inline", 10) }]}
          >
            {visible.map((tab) => (
              <Tab key={tab.value} {...tab} context={context} />
            ))}
          </Glass>
          {circle ? (
            <Glass radius={circleSize / 2} elevation="raised" style={{ width: circleSize, height: circleSize }}>
              <Tab {...circle} context={{ ...context, minimized: false }} kind="circle" hideLabel />
            </Glass>
          ) : null}
        </View>
      </View>
    </TabBarContext.Provider>
  )
}
TabBarRoot.displayName = "TabBar"

export const TabBar = Object.assign(TabBarRoot, { Item: TabBarItem })

/** A scroll of at least this many points in one direction minimizes or expands the bar, as on the web. */
const MINIMIZE_AFTER = 8

/**
 * Minimizes a TabBar while the screen scrolls down and expands it when it scrolls back up, as iOS 26
 * `tabBarMinimizeBehavior(.onScrollDown)`: pass `onScroll` to the ScrollView and `minimized` and
 * `onMinimizedChange` to the TabBar.
 */
export function useTabBarMinimize() {
  const [minimized, setMinimizedState] = useState(false)
  const state = useRef({ anchor: 0, minimized: false })
  const setMinimized = useCallback((next: boolean) => {
    state.current.minimized = next
    setMinimizedState(next)
  }, [])
  // As the web hook: the anchor follows the scroll while it runs the current way (down while minimized, up while
  // expanded), so a turn back of MINIMIZE_AFTER points from its farthest point flips the bar; the top expands it
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y
      const current = state.current
      if (y <= 0) {
        current.anchor = 0
        if (current.minimized) setMinimized(false)
        return
      }
      const delta = y - current.anchor
      if (current.minimized ? delta < 0 : delta > 0) {
        if (Math.abs(delta) >= MINIMIZE_AFTER) {
          current.anchor = y
          setMinimized(!current.minimized)
        }
        return
      }
      current.anchor = y
    },
    [setMinimized],
  )
  return { minimized, onMinimizedChange: setMinimized, onScroll, scrollEventThrottle: 16 }
}

const styles = StyleSheet.create({
  iosRow: { flexDirection: "row", alignItems: "flex-end" },
  capsule: { flexDirection: "row", flexShrink: 1, minWidth: 0 },
  accessory: { position: "absolute", flexDirection: "row", alignItems: "center", minWidth: 0, overflow: "hidden" },
  iosItem: { alignItems: "center", gap: 1, borderRadius: 999 },
  pill: { position: "absolute", borderRadius: 999 },
  iosIcon: { alignItems: "center", justifyContent: "center" },
  iosBadge: { position: "absolute", left: "50%", alignItems: "center", justifyContent: "center" },
  androidIconBox: { width: 24, height: 24 },
  // A frame 0 wide 11dp past the tab's middle and 10 under its top: a dot or a one-digit badge centers on it, a wider
  // one keeps its start there (2dp past the icon's end) and grows toward the end, so its label never covers the
  // symbol, as Material's large badge
  androidBadgeFrame: { position: "absolute", top: 10, left: "50%", marginLeft: 11, width: 0, height: 0, alignItems: "center", justifyContent: "center", overflow: "visible" },
  androidBadge: {
    position: "absolute",
    // Its start half its least width before the frame: the least badge centers on it, a wider one grows to the end
    start: -(16 + 2 * 1.33) / 2,
    minWidth: 16 + 2 * 1.33,
    height: 16 + 2 * 1.33,
    paddingHorizontal: 4 + 1.33,
    borderRadius: 8 + 1.33,
    borderWidth: 1.33,
    alignItems: "center",
    justifyContent: "center",
  },
  androidDot: { position: "absolute", width: 6 + 2 * 1.33, height: 6 + 2 * 1.33, borderRadius: 3 + 1.33, borderWidth: 1.33 },
  countRow: { flexDirection: "row" },
  countLeaving: { position: "absolute", top: 0, bottom: 0, start: -20, end: -20, alignItems: "center" },
  measureBox: { position: "absolute", top: 0, left: 0, width: 0, height: 0, overflow: "hidden", opacity: 0 },
  measureRow: { position: "absolute", top: 0, left: 0, width: 2000, flexDirection: "row", alignItems: "flex-start" },
  androidBar: { paddingTop: 8, gap: 8 },
  androidRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: ANDROID_GAP },
  androidCapsule: { height: 56, borderRadius: 28, padding: 4, flexDirection: "row", alignItems: "center" },
  androidPill: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, borderRadius: 24 },
  androidTab: { height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", gap: 0 },
  androidCircle: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  androidCircleLayer: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0 },
  androidAccessory: { minHeight: 56, borderRadius: 28, paddingStart: 8, paddingEnd: 4, flexDirection: "row", alignItems: "center" },
})
