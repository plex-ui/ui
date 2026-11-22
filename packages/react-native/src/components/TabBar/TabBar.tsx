import { createContext, useCallback, useContext, useRef, useState, type ReactElement, type ReactNode } from "react"
import {
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Search from "../../icons/plex/Search"
import { BarBackdrop } from "../../internal/BarBackdrop"
import { childrenOfType } from "../../internal/children"
import { Glass } from "../../internal/Glass"
import { useTabKeys } from "../../internal/tabKeys"
import { stateLayer, withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { materialType } from "../../theme/typography"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { Text } from "../Text/Text"

export type TabBarBackground = "soft" | "glass" | "hard" | "none"

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
   * bar. Drive it from the scroll of the screen with `useTabBarMinimize`. Android's navigation bar does not minimize.
   */
  minimized?: boolean
  /** The minimized state when it is first rendered. @default false */
  defaultMinimized?: boolean
  /** Called when the bar minimizes or expands. */
  onMinimizedChange?: (minimized: boolean) => void
  /**
   * How the bar meets content under it on iOS: `soft` and `none` let content run under the capsule, `hard` an opaque
   * bar, `glass` a translucent blurred one; the lines and the glass show once `scrolled` says content is under it.
   * @default "soft"
   */
  background?: TabBarBackground
  /** Content is under the bar. */
  scrolled?: boolean
  /** Content in a glass capsule above the tabs (iOS 26 bottom accessory); minimized, between the two circles. */
  accessory?: ReactNode
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
   * A count or a short word in a red capsule over the symbol, read after the label. A count of 0 shows none, as on
   * iOS. `true` draws Material's small dot on Android and an empty capsule on iOS.
   */
  badge?: ReactNode
  /** When `true`, the tab cannot be selected. */
  disabled?: boolean
  /** Called when the tab is pressed, before it is selected. */
  onPress?: () => void
  testID?: string
}

type TabBarContextValue = {
  value: string | undefined
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
  const theme = useTheme()
  return theme.isAndroid ? <AndroidTab {...props} /> : <IOSTab {...props} />
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

function IOSTab({ value, label, icon, badge, disabled = false, onPress, testID, context, kind = "tab", hideLabel = false }: TabProps) {
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
          weight="semibold"
          color={color}
          style={{ fontSize: theme.length("--tab-bar-label-font-size", 10), lineHeight: theme.length("--tab-bar-label-line-height", 12), maxWidth: "100%" }}
        >
          {label}
        </Text>
      ) : null}
      {hasBadge(badge) && !circle ? (
        <View pointerEvents="none" style={[styles.iosBadge, iosBadgeStyle(theme), { top: badgeTop, marginLeft: badgeStart }]}>
          {badge === true ? null : (
            <Text color={theme.color("--tab-bar-badge-color")} style={iosBadgeText(theme)} numberOfLines={1}>
              {badge}
            </Text>
          )}
        </View>
      ) : null}
    </Pressable>
  )
}

const iosBadgeStyle = (theme: Theme): ViewStyle => {
  const size = theme.length("--tab-bar-badge-size", 18)
  return {
    minWidth: size,
    height: size,
    paddingHorizontal: theme.length("--tab-bar-badge-padding-inline", 5),
    borderRadius: size / 2,
    backgroundColor: theme.color("--tab-bar-badge-background"),
  }
}

const iosBadgeText = (theme: Theme) => ({
  fontSize: theme.length("--tab-bar-badge-font-size", 12),
  lineHeight: theme.length("--tab-bar-badge-size", 18),
  textAlign: "center" as const,
  ...theme.font("regular"),
})

/**
 * A destination of Material 3's navigation bar (Expressive short bar, vertical item): the symbol in a 56x32 pill
 * indicator over a Label M label; Compose places a badge from the symbol's trailing top corner.
 */
function AndroidTab({ value, label, icon, badge, disabled = false, onPress, testID, context }: TabProps) {
  const theme = useTheme()
  const m = theme.material
  const selected = context.value === value
  const [pressed, setPressed] = useState(false)
  const iconColor = disabled ? withAlpha(m.onSurface, 0.38) : selected ? m.onSecondaryContainer : m.onSurfaceVariant
  // Compose ShortNavigationBar: the active label is `secondary`, a role the Plex mapping folds into onSurface (0022)
  const labelColor = disabled ? withAlpha(m.onSurface, 0.38) : selected ? m.onSurface : m.onSurfaceVariant
  const type = materialType.labelMedium
  const dot = badge === true
  return (
    <Pressable
      {...context.keys({ value, disabled })}
      accessibilityRole="tab"
      accessibilityLabel={tabName(label, badge)}
      accessibilityState={{ selected, disabled }}
      aria-selected={selected}
      disabled={disabled}
      onPress={() => press(context, { value, label, icon, disabled, onPress }, false)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      testID={testID}
      style={styles.androidItem}
    >
      <View
        style={[
          styles.androidIndicator,
          { backgroundColor: selected ? m.secondaryContainer : "transparent" },
        ]}
      >
        {/* The state layer of a press fills the indicator's shape, as Compose's indicator ripple; the badge stands
            outside it, unclipped */}
        {pressed && !disabled ? <View pointerEvents="none" style={[styles.androidLayer, { backgroundColor: withAlpha(iconColor, stateLayer.pressed) }]} /> : null}
        <View style={styles.androidIconBox}>
          <IconDefaultsProvider size={24} color={iconColor}>
            {icon}
          </IconDefaultsProvider>
          {hasBadge(badge) ? (
            <View
              pointerEvents="none"
              style={[
                dot ? styles.androidDot : styles.androidBadge,
                { backgroundColor: m.error },
                // BadgedBox: a large badge 12 in from the symbol's trailing edge and 2 over its top; the dot 6 in, on top
                dot ? { left: 24 - 6, top: 0 } : { left: 24 - 12, top: 14 - 16 },
              ]}
            >
              {dot ? null : (
                <Text color={m.onError} numberOfLines={1} style={{ fontSize: materialType.labelSmall.fontSize, lineHeight: 16, ...theme.font("medium") }}>
                  {badge}
                </Text>
              )}
            </View>
          ) : null}
        </View>
      </View>
      <Text numberOfLines={1} color={labelColor} style={{ fontSize: type.fontSize, lineHeight: type.lineHeight, marginTop: 4, ...theme.font("medium") }}>
        {label}
      </Text>
    </Pressable>
  )
}

/** The tabs of a TabBar, without the circles; fragments opened. */
const items = (children: ReactNode) => childrenOfType<TabBarItemProps>(children, TabBarItem)

/**
 * The tab bar of a phone screen: on iOS 26 two to five tabs, each a symbol over a label, in a floating glass capsule,
 * the selected one on a pill, with an optional search or prominent tab in a circle of its own and a bottom accessory,
 * after the Plex UI phone layer (`--tab-bar-*`); on Android Material 3's navigation bar. Props follow @plexui/ui.
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
  accessory,
  safeArea = true,
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
  // Android's navigation bar has no minimized state
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
  // The prominent tab takes the circle of the search tab, and search joins the capsule as its last tab
  const circle: TabBarItemProps | undefined = prominent ? { value: prominent.value, label: prominent.label, icon: prominent.icon } : searchTab
  const capsuleTabs: TabBarItemProps[] = [...tabs.map((tab) => tab.props), ...(prominent && searchTab ? [searchTab] : [])]
  const shown = minimized ? capsuleTabs.filter((tab) => tab.value === value).slice(0, 1) : capsuleTabs
  const visible = shown.length ? shown : capsuleTabs.slice(0, 1)
  const reachable = [...(theme.isAndroid ? capsuleTabs : visible), ...(circle ? [circle] : [])]
  const keys = useTabKeys(reachable, value, select)
  const context: TabBarContextValue = { value, minimized, select, expand, keys }

  if (theme.isAndroid) {
    const all = circle ? [...capsuleTabs, circle] : capsuleTabs
    return (
      <TabBarContext.Provider value={context}>
        <View {...rest} accessibilityRole="tablist" aria-label={ariaLabel} style={[{ backgroundColor: theme.material.surfaceContainer, paddingBottom: safeArea ? insets.bottom : 0 }, style]}>
          {accessory ? <View style={styles.androidAccessory}>{accessory}</View> : null}
          <View style={styles.androidRow}>
            {all.map((tab) => (
              <Tab key={tab.value} {...tab} context={context} />
            ))}
          </View>
        </View>
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
  const canvas = theme.colors.background
  const veil = withAlpha(canvas, parseFloat(String(theme.token("--page-bar-veil-opacity") ?? "55")) / 100)
  const backdrop =
    background === "hard" ? (
      <BarBackdrop fill={canvas} line={scrolled ? theme.color("--page-bar-hard-line") : undefined} edge="top" />
    ) : background === "glass" && scrolled ? (
      <BarBackdrop fill={veil} blur={6} line={theme.color("--page-bar-line")} edge="top" />
    ) : null
  // The accessory keeps one place in the tree, so its state lives through a minimize: above the capsule, or between
  // the two circles as tall as they are. The bar keeps its height either way, as TabBar.module.css
  const accessoryPlace: ViewStyle = minimized
    ? { bottom: paddingBottom, height: circleSize, left: gutter + circleSize + minimizedGap, right: gutter + (circle ? circleSize + minimizedGap : 0) }
    : { top: padTop, height: accessoryHeight, left: gutter, right: gutter }
  return (
    <TabBarContext.Provider value={context}>
      <View
        {...rest}
        accessibilityRole="tablist"
        aria-label={ariaLabel}
        style={[{ paddingTop: padTop + (accessory ? accessoryHeight + accessoryGap : 0), paddingBottom, paddingHorizontal: gutter }, style]}
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
  androidRow: { height: 64, flexDirection: "row" },
  androidAccessory: { height: 48, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" },
  androidItem: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 6 },
  androidIndicator: { width: 56, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  androidLayer: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, borderRadius: 16 },
  androidIconBox: { width: 24, height: 24 },
  androidBadge: { position: "absolute", minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  androidDot: { position: "absolute", width: 6, height: 6, borderRadius: 3 },
})
