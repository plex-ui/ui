import { cloneElement, createContext, isValidElement, memo, useContext, useEffect, useRef, useState, type ComponentRef, type ReactElement, type ReactNode } from "react"
import { Animated, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewProps, type ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  BarBackdrop,
  BarShadow,
  SoftBottomEdge,
  SoftTopEdge,
  ANDROID_FADE_ALPHA,
  ANDROID_FADE_STOPS,
  glassBarBlur,
  useAndroidGlass,
} from "../../internal/BarBackdrop"
import { physicalPadding, useRTL } from "../../internal/direction"
import { Glass } from "../../internal/Glass"
import { curves } from "../../internal/motion"
import { divider, withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { flattenChildren } from "../../internal/children"
import { BarFieldContext, BarItemContext, type BarItemStyle } from "../Button/Button"
import { SegmentedControlRowContext } from "../SegmentedControl/SegmentedControl"
import { Text } from "../Text/Text"

export type ToolbarPlacement = "top" | "bottom"
export type ToolbarTitleStyle = "inline" | "large"
export type ToolbarTitleAlign = "center" | "start"
export type ToolbarBackground = "soft" | "glass" | "hard" | "none"

export type ToolbarProps = ViewProps & {
  /** @default "top" */
  placement?: ToolbarPlacement
  /** A title in the row of the controls, or the large title under them. @default "inline" */
  titleStyle?: ToolbarTitleStyle
  /**
   * Where an inline title stands; a large one starts at the leading edge.
   * @default "center"; "start" in an opaque (`hard`) top bar on Android
   */
  titleAlign?: ToolbarTitleAlign
  /**
   * How the bar meets content under it: `glass` a translucent blurred bar with a line, `hard` an opaque one, `soft` a
   * veil that fades out (on Android the screen's color over a light blur), `none` nothing. Each shows once
   * `scrolled` says content is under the bar; a bottom bar's soft edge stays. A `hard` top bar on Android is its
   * classic bar, drawn at all times: 56dp in the cards' color with a 3dp shadow under it, its icons plain in 48dp
   * targets with no circles, the title from the start (72dp in after a back button), 18 over a subtitle of 14.
   * @default "glass" at the top on iOS, "soft" at the bottom and on Android
   */
  background?: ToolbarBackground
  /** Content is under the bar (scrolled under a top bar, running on under a bottom one). */
  scrolled?: boolean
  /**
   * The color of the screen under the bar, which its scroll edge takes (a grouped screen's canvas, a sheet's panel).
   * @default the theme's background
   */
  canvasColor?: string
  /** Pads the bar for the status bar or the home indicator. @default true */
  safeArea?: boolean
  style?: StyleProp<ViewStyle>
  children?: ReactNode
}

type Placement = { placement: ToolbarPlacement; plain?: boolean }
const ToolbarContext = createContext<Placement>({ placement: "top" })

/** The leading items: a back button. */
function ToolbarLeading({ children, style, ...rest }: ViewProps) {
  const theme = useTheme()
  return (
    <View {...rest} style={[styles.slot, { gap: slotGap(theme, useContext(ToolbarContext)) }, style]}>
      {children}
    </View>
  )
}
ToolbarLeading.displayName = "Toolbar.Leading"

/** The trailing items: actions, a confirm button. */
function ToolbarTrailing({ children, style, ...rest }: ViewProps) {
  const theme = useTheme()
  return (
    <View {...rest} style={[styles.slot, styles.trailing, { gap: slotGap(theme, useContext(ToolbarContext)) }, style]}>
      {children}
    </View>
  )
}
ToolbarTrailing.displayName = "Toolbar.Trailing"

export type ToolbarContentProps = ViewProps & {
  /** Stretches between the leading and trailing items, as a search field does. */
  fill?: boolean
}

/** Custom middle content: a segmented control, a single centered action, a search field. */
function ToolbarContent({ fill = false, children, style, ...rest }: ToolbarContentProps) {
  const theme = useTheme()
  return (
    <View {...rest} style={[styles.slot, styles.content, { gap: slotGap(theme, useContext(ToolbarContext)) }, fill ? styles.fill : null, style]}>
      {children}
    </View>
  )
}
ToolbarContent.displayName = "Toolbar.Content"

/** The Android capsule's width and its glass coming or going as its buttons change: 320ms on an ease-out quint. */
const GROUP_CHANGE = { duration: 320, easing: curves.easeOutQuint }
/** The capsule's padding on either end: a width of no more than both is a capsule with no buttons. */
const GROUP_PADDING = 4

/**
 * The Android capsule of actions: 46dp of the bar's glass, its icons in 38dp slots
 * 4 from its ends. When its buttons change, its glass follows their width over 320ms (ease-out quint), from the
 * trailing end, never narrower than a circle; with no buttons left it fades out, and back in as they come.
 */
function AndroidGroup({ item, children, style, onLayout, ...rest }: ViewProps & { item: BarItemStyle }) {
  const theme = useTheme()
  const glass = useAndroidGlass("bar", item.canvas)
  const [width] = useState(() => new Animated.Value(0))
  const [opacity] = useState(() => new Animated.Value(1))
  const filled = useRef<boolean | null>(null)
  const [measured, setMeasured] = useState(false)
  const handleLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width
    const hasItems = next > 2 * GROUP_PADDING + 0.5
    const changed = filled.current !== hasItems
    filled.current = hasItems
    if (!measured || theme.reducedMotion) {
      width.setValue(next)
      opacity.setValue(hasItems ? 1 : 0)
    } else {
      Animated.timing(width, { toValue: next, ...GROUP_CHANGE, useNativeDriver: false }).start()
      if (changed) Animated.timing(opacity, { toValue: hasItems ? 1 : 0, ...GROUP_CHANGE, useNativeDriver: false }).start()
    }
    if (!measured) setMeasured(true)
    onLayout?.(event)
  }
  const radius = item.height / 2
  // The glass keeps at least a circle's width, so an emptied capsule shrinks to a circle as it fades
  const glassWidth = width.interpolate({ inputRange: [item.height, item.height + 1], outputRange: [item.height, item.height + 1], extrapolateLeft: "clamp" })
  return (
    <BarItemContext.Provider value={{ ...item, inGroup: true }}>
      <View accessibilityRole="toolbar" {...rest} onLayout={handleLayout} style={[styles.slot, { height: item.height, paddingHorizontal: GROUP_PADDING }, style]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.groupGlass, { borderRadius: radius, opacity }, measured ? { width: glassWidth } : { start: 0 }, glass]}
        />
        {children}
      </View>
    </BarItemContext.Provider>
  )
}

/** Buttons that share one capsule: of glass on iOS, of the glass of a bar's circles on Android (the bar's action group). */
function ToolbarGroup({ children, style, ...rest }: ViewProps) {
  const theme = useTheme()
  const bar = useContext(ToolbarContext)
  const { placement } = bar
  const item = useContext(BarItemContext)
  // An opaque Android bar sets its icons side by side, plain, with no capsule
  if (theme.isAndroid && item?.plain) {
    return (
      <View accessibilityRole="toolbar" {...rest} style={[styles.slot, style]}>
        {children}
      </View>
    )
  }
  if (theme.isAndroid && item) {
    return (
      <AndroidGroup item={item} {...rest} style={style}>
        {children}
      </AndroidGroup>
    )
  }
  if (!item) {
    return (
      <View accessibilityRole="toolbar" {...rest} style={[styles.slot, { gap: slotGap(theme, bar) }, style]}>
        {children}
      </View>
    )
  }
  const bottom = placement === "bottom"
  return (
    <BarItemContext.Provider value={{ ...item, inGroup: true }}>
      <Glass
        accessibilityRole="toolbar"
        {...rest}
        elevation={item.raised ? "raised" : "regular"}
        radius={item.height / 2}
        style={[
          styles.slot,
          {
            gap: theme.length(bottom ? "--toolbar-bottom-group-gap" : "--toolbar-group-gap", bottom ? 8 : 10),
            paddingHorizontal: theme.length(bottom ? "--toolbar-bottom-group-padding" : "--toolbar-group-padding", bottom ? 2 : 1),
          },
          style,
        ]}
      >
        {children}
      </Glass>
    </BarItemContext.Provider>
  )
}
ToolbarGroup.displayName = "Toolbar.Group"

export type ToolbarTitleProps = {
  children: ReactNode
  subtitle?: ReactNode
  numberOfLines?: number
}

/** The title of the bar, and an optional subtitle under it. Announced as a header. */
function ToolbarTitle(_: ToolbarTitleProps): ReactElement | null {
  // Drawn by Toolbar, which knows the title style
  return null
}
ToolbarTitle.displayName = "Toolbar.Title"

/** A row under the controls, part of the bar: a segmented control, a search field. Its control fills the row. */
function ToolbarRow({ children, style, ...rest }: ViewProps) {
  // A row holds ordinary controls: the metrics and glass of bar actions belong to the action slots only. A search
  // field learns it stands in a row (on Android it keeps the capsule of the bar's own search)
  const field = useContext(BarFieldContext)
  const rowField = field ? (ROW_FIELD[`${field.height}${field.raised ? " raised" : ""} ${field.canvas ?? ""}`] ??= { ...field, row: true }) : null
  return (
    <BarItemContext.Provider value={null}>
      <BarFieldContext.Provider value={rowField}>
        <SegmentedControlRowContext.Provider value={ROW}>
          <View {...rest} style={[styles.row, style]}>
            {children}
          </View>
        </SegmentedControlRowContext.Provider>
      </BarFieldContext.Provider>
    </BarItemContext.Provider>
  )
}
const ROW = { inRow: true }
ToolbarRow.displayName = "Toolbar.Row"

type BarField = { height: number; raised: boolean; row?: boolean; canvas?: string }
const FIELD_OF_HEIGHT: Record<string, BarField> = {}
const ROW_FIELD: Record<string, BarField> = {}

function slotGap(theme: Theme, { placement, plain }: Placement) {
  // Android sets its circles, capsules and search field 6dp apart, and the 48dp targets of an opaque bar side by side
  if (theme.isAndroid) return plain ? 0 : 6
  return placement === "bottom" ? theme.length("--toolbar-bottom-item-gap", 12) : theme.length("--toolbar-top-item-gap", 10)
}

function barItem(theme: Theme, placement: ToolbarPlacement, plain: boolean): BarItemStyle {
  // Android's opaque bar: 24dp glyphs plain in 48dp targets, a label (Save) Medium 15 12 in from the ends of its press
  if (theme.isAndroid && plain) return { height: 48, fontSize: 15, lineHeight: 20, weight: "medium", prominentWeight: "medium", iconSize: 24, gutter: 12, plain: true }
  // Android: 46dp circles with 24dp glyphs; a label (Save) Medium 15 in a capsule 16 in from its ends
  if (theme.isAndroid) return { height: 46, fontSize: 15, lineHeight: 20, weight: "medium", prominentWeight: "medium", iconSize: 24, gutter: 16, bottom: placement === "bottom" }
  const bottom = placement === "bottom"
  const weight = (name: string, fallback: number) => {
    const value = theme.length(name, fallback)
    return value >= 590 ? "semibold" : value >= 500 ? "medium" : "regular"
  }
  return {
    height: theme.length(bottom ? "--toolbar-bottom-item-size" : "--toolbar-top-item-size", bottom ? 48 : 44),
    fontSize: theme.length("--toolbar-label-font-size", 17),
    lineHeight: theme.length("--toolbar-label-line-height", 22),
    weight: weight("--toolbar-label-font-weight", 510),
    prominentWeight: weight("--toolbar-label-prominent-font-weight", 590),
    iconSize: theme.length("--toolbar-icon-size", 26),
    gutter: theme.length(bottom ? "--toolbar-bottom-label-gutter" : "--toolbar-label-gutter", 16),
  }
}

type Parts = {
  leading?: ReactElement
  title?: ReactElement<ToolbarTitleProps>
  content?: ReactElement<ToolbarContentProps>
  trailing?: ReactElement
  rows: ReactElement[]
}

function parts(children: ReactNode): Parts {
  const out: Parts = { rows: [] }
  for (const child of flattenChildren(children)) {
    if (!isValidElement(child)) continue
    if (child.type === ToolbarLeading) out.leading = child
    else if (child.type === ToolbarTitle) out.title = child as ReactElement<ToolbarTitleProps>
    else if (child.type === ToolbarContent) out.content = child as ReactElement<ToolbarContentProps>
    else if (child.type === ToolbarTrailing) out.trailing = child
    else if (child.type === ToolbarRow) out.rows.push(child)
  }
  return out
}

function BarTitle({
  title,
  large,
  start,
  plain = false,
  afterLeading = false,
}: {
  title: ToolbarTitleProps
  large: boolean
  start: boolean
  /** In an opaque Android bar. */
  plain?: boolean
  /** Leading items stand before it. */
  afterLeading?: boolean
}) {
  const theme = useTheme()
  const subtitle = title.subtitle != null && title.subtitle !== false
  const android = theme.isAndroid
  // Android's title: Medium 17, centered in the 46dp row of its circles, a subtitle 14 in the gray of secondary text
  // under it (a glass bar). Set from the start, it stands 76dp in after a back button and 24dp with none:
  // 18 past the bar's gutter and the gap after the back button. In an opaque bar Medium 18 over the subtitle in the
  // lighter gray of a row's description, the pair centered in the bar (baselines 25.6 and 43.9 of its 56dp), from 72dp
  // in after a back button and 18 with none
  const font = plain
    ? { fontSize: 18, lineHeight: 22 }
    : android
      ? { fontSize: 17, lineHeight: subtitle ? 20 : 22 }
      : large
        ? { fontSize: theme.length("--toolbar-large-title-font-size", 34), lineHeight: theme.length("--toolbar-large-title-line-height", 41) }
        : subtitle
          ? { fontSize: theme.length("--toolbar-title-compact-font-size", 15), lineHeight: theme.length("--toolbar-title-compact-line-height", 20) }
          : { fontSize: theme.length("--toolbar-title-font-size", 17), lineHeight: theme.length("--toolbar-title-line-height", 22) }
  const sub = android
    ? { fontSize: 14, lineHeight: 18 }
    : large
      ? { fontSize: theme.length("--toolbar-large-subtitle-font-size", 15), lineHeight: theme.length("--toolbar-large-subtitle-line-height", 20) }
      : { fontSize: theme.length("--toolbar-subtitle-font-size", 12), lineHeight: theme.length("--toolbar-subtitle-line-height", 16), marginTop: -2 }
  return (
    <View
      style={[
        styles.heading,
        { alignItems: start || large ? "flex-start" : "center", minHeight: large ? 0 : plain ? 48 : android ? 46 : theme.length("--toolbar-top-item-size", 44) },
        android && start && !large ? { marginStart: plain ? (afterLeading ? 20 : 14) : 18 } : null,
      ]}
    >
      <Text
        accessibilityRole="header"
        numberOfLines={title.numberOfLines ?? 1}
        weight={android ? "medium" : large ? "bold" : "semibold"}
        align={start || large ? "auto" : "center"}
        style={font}
      >
        {title.children}
      </Text>
      {subtitle ? (
        <Text
          numberOfLines={1}
          weight={android || large ? "regular" : "medium"}
          color={android && !plain ? theme.colors.textSecondary : theme.colors.labelSecondary}
          style={sub}
        >
          {title.subtitle}
        </Text>
      ) : null}
    </View>
  )
}

/**
 * A bar of controls at the top or the bottom of a screen. On iOS 26 its items stand in glass on the content (44pt at
 * the top, 48 at the bottom), with an inline or a large title, after the Plex UI phone layer; on Android its items
 * are 46dp circles and capsules of see-through glass over the content, with the title centered between
 * them and a soft edge under them. Parts: `Toolbar.Leading`, `Toolbar.Title`, `Toolbar.Content`, `Toolbar.Group`, `Toolbar.Trailing`,
 * `Toolbar.Row`, as in @plexui/ui.
 */
function ToolbarRoot({
  placement = "top",
  titleStyle = "inline",
  titleAlign: titleAlignProp,
  background,
  scrolled = false,
  canvasColor,
  safeArea = true,
  style,
  children,
  ...rest
}: ToolbarProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { leading, title, content, trailing, rows } = parts(children)
  const top = placement === "top"
  const mode = background ?? (top && !theme.isAndroid ? "glass" : "soft")
  // An opaque top bar on Android is its classic bar: plain icons, the title from the start, drawn at all times
  const plain = theme.isAndroid && top && mode === "hard"
  const titleAlign = titleAlignProp ?? (plain ? "start" : "center")
  const bar = { placement, plain }
  // Android's bars keep their title in the row: no large title
  const large = top && titleStyle === "large" && !theme.isAndroid
  const start = titleAlign === "start" || !!content?.props.fill
  // With content under the bar its glass casts the raised shadow, as a scrolled top bar's and a bottom bar's with
  // more below (Toolbar.module.css data-scrolled, data-content-below)
  const canvas = canvasColor ?? theme.colors.background
  const item = { ...barItem(theme, placement, plain), raised: scrolled, canvas }
  // A landscape phone's cutout and rounded corners: the bar's fill reaches the edges, its items stay clear of them
  const sides = (gutter: number) => physicalPadding(gutter + (safeArea ? insets.left : 0), gutter + (safeArea ? insets.right : 0))
  const android = theme.isAndroid
  // Android's bars: 46dp circles and capsules 6dp from the screen's sides in a 56dp row under the status bar, and 6dp
  // more under it on a glass screen (62dp); at the bottom on the line of its 56dp tab bar, 8dp over the gesture bar.
  // iOS 26's bars after the Plex UI phone layer (Toolbar.module.css)
  // An opaque bar: 48dp targets 4dp from its sides in a 56dp row
  const paddingTop = android
    ? (top && safeArea ? insets.top : 0) + (plain ? 4 : 5)
    : top
      ? safeArea
        ? Math.max(theme.length("--toolbar-padding-bottom", 10), insets.top)
        : theme.length("--toolbar-padding-bottom", 10)
      : theme.length("--toolbar-bottom-padding-top", 4)
  const bottomPadding = theme.length("--toolbar-bottom-padding-bottom", 16)
  // The items of a bottom bar stand 28 above the edge of a phone with a home indicator (the reference of the CSS)
  const paddingBottom = android
    ? top
      ? plain
        ? 4
        : 11
      : (safeArea ? insets.bottom : 0) + 13
    : top
      ? theme.length("--toolbar-padding-bottom", 10)
      : safeArea
        ? Math.max(bottomPadding, insets.bottom - 6)
        : bottomPadding
  const gutter = android ? (top ? (plain ? 4 : 6) : 16) : top ? theme.length("--toolbar-gutter", 16) : theme.length("--toolbar-bottom-gutter", 28)
  const veil = withAlpha(canvas, parseFloat(String(theme.token("--page-bar-veil-opacity") ?? "55")) / 100)
  const edge = top ? "bottom" : "top"
  // A bottom bar's soft edge covers the content from the items down at all times, as the CSS draws it; the other
  // backgrounds show once content is under the bar. Android's soft edges: under the top bar the screen's color over
  // the blurred content, eased out toward the bar's bottom (SoftTopEdge); under the bottom bar its fade of the tabs,
  // from 8 above the tab bar's line: the screen's color fading in over 60dp in
  // four even steps (0, 0x60, 0xB0, 0xE8 of 285) and staying at 0xE8/285 (81%) down to the edge
  const backdrop = plain ? (
    // The classic bar stands in the cards' color whether or not content is under it, its shadow over the content
    <>
      <BarBackdrop fill={theme.colors.groupedSurface} edge={edge} />
      <BarShadow />
    </>
  ) : !top && mode === "soft" ? (
    android ? (
      <SoftBottomEdge fill={withAlpha(canvas, ANDROID_FADE_ALPHA)} top={paddingTop - 13 + 60} tail={60} blur={0} stops={ANDROID_FADE_STOPS} />
    ) : (
      <SoftBottomEdge fill={canvas} top={paddingTop} tail={27} blur={theme.length("--toolbar-edge-blur-small", 3)} />
    )
  ) : !scrolled || mode === "none" ? null : mode === "hard" ? (
    // Android's bars draw no line of their own; an opaque bottom bar keeps the light divider of a card's rows, so
    // the content still parts from it
    <BarBackdrop fill={canvas} line={android ? divider(theme) : theme.color("--page-bar-hard-line")} edge={edge} />
  ) : mode === "glass" ? (
    // On Android the blur alone parts the bar from what scrolls under it, as its bars do
    <BarBackdrop fill={veil} blur={glassBarBlur(theme)} line={android ? undefined : theme.color("--page-bar-line")} edge={edge} />
  ) : android ? (
    <SoftTopEdge fill={canvas} blur={6} />
  ) : (
    <BarBackdrop fill={veil} blur={theme.length("--page-bar-soft-blur", 10)} edge={edge} />
  )
  const sideStyle = start ? null : styles.side
  // The sides share the row evenly, so the middle stands centered; each keeps at least the width of its items and the
  // bar's gap, so a wider side pushes the middle toward the narrower one (and makes it shrink) rather than spill over
  // it or touch it, as iOS does
  const [sideWidths, setSideWidths] = useState({ leading: 0, trailing: 0 })
  const sideMin = (width: number) => (sideStyle ? { minWidth: width ? width + slotGap(theme, bar) : 0 } : null)
  const measured = (key: keyof typeof sideWidths, element?: ReactElement) =>
    element && sideStyle
      ? cloneElement(element as ReactElement<ViewProps>, {
          onLayout: (event: LayoutChangeEvent) => {
            ;(element as ReactElement<ViewProps>).props.onLayout?.(event)
            const width = event.nativeEvent.layout.width
            setSideWidths((prev) => (prev[key] === width ? prev : { ...prev, [key]: width }))
          },
        })
      : element
  // A search field in the bar or in a row of it: the bar's item height and the look of its buttons (one value to a
  // height, so the context does not change on each render)
  const field = (FIELD_OF_HEIGHT[`${item.height}${scrolled ? " raised" : ""} ${canvas}`] ??= { height: item.height, raised: scrolled, canvas })
  // Android swaps its bar and the search in it over 150ms: the field fades in as the title and the actions fade out
  // where they stood, the title shrinking to 0.95, and the menu (the field and the actions) moves 5dp toward the end;
  // closing runs it back. The parts are keyed, so a part that leaves keeps its state while it fades
  const searching = android && !!content?.props.fill
  const middleKey = content ? (content.props.fill ? "search" : "content") : title && !large ? "title" : "none"
  const hasLeading = !!(leading || sideStyle)
  const hasTrailing = !!(trailing || sideStyle)
  const swap = useSearchSwap({ searching, middle: middleKey, trailing: hasTrailing, start }, android, theme.reducedMotion)
  const { open, leaving } = swap
  const shut = open.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })
  const toEnd = swap.rtl ? -MENU_SHIFT : MENU_SHIFT
  const shift = (from: number, to: number) => [{ translateX: open.interpolate({ inputRange: [0, 1], outputRange: [from * toEnd, to * toEnd] }) }]
  // A part of the search's look or of the bar's own; on iOS nothing moves
  const look = (search: boolean, menu: boolean) =>
    android ? { opacity: search ? open : shut, transform: menu ? shift(search ? -1 : 0, search ? 0 : 1) : [] } : null
  const track = (key: string) => (android ? swap.measure(key) : undefined)
  const titleBox = (alignStart: boolean, hold: boolean) => {
    const drawn = <Held hold={hold}>{title && !hold ? <BarTitle title={title.props} large={false} start={start} plain={plain} afterLeading={!!leading} /> : null}</Held>
    // Android scales the title about its own middle, so it hugs its text
    return android ? (
      <Animated.View style={[{ alignSelf: alignStart ? "flex-start" : "center", maxWidth: "100%" }, { transform: [{ scale: open.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] }) }] }]}>
        {drawn}
      </Animated.View>
    ) : (
      drawn
    )
  }
  const middle =
    middleKey === "none" ? (
      <View key="none" style={styles.grow} />
    ) : (
      <Animated.View
        key={middleKey}
        onLayout={track(middleKey)}
        style={[(middleKey === "title" ? start : middleKey === "search") ? styles.grow : styles.middle, look(middleKey === "search", middleKey === "search")]}
      >
        {middleKey === "title" ? titleBox(start, false) : <Held hold={false}>{content}</Held>}
      </Animated.View>
    )
  const leavingMiddle = leaving?.middle ? (
    <Animated.View
      key={leaving.middle.key}
      {...LEFT_BEHIND}
      style={[away(leaving.middle.place), styles.awayMiddle, look(leaving.middle.key === "search", leaving.middle.key === "search")]}
    >
      {leaving.middle.key === "title" ? titleBox(leaving.middle.start, true) : <Held hold>{null}</Held>}
    </Animated.View>
  ) : null
  const trailingSide = hasTrailing ? (
    <Animated.View key="trailing" onLayout={track("trailing")} style={[sideStyle, styles.sideEnd, sideMin(sideWidths.trailing), look(searching, true)]}>
      <Held hold={false}>{measured("trailing", trailing)}</Held>
    </Animated.View>
  ) : leaving?.trailing ? (
    <Animated.View key="trailing" {...LEFT_BEHIND} style={[away(leaving.trailing), styles.sideEnd, styles.awayTrailing, look(!searching, true)]}>
      <Held hold>{null}</Held>
    </Animated.View>
  ) : null
  return (
    <ToolbarContext.Provider value={bar}>
      <BarItemContext.Provider value={item}>
        <BarFieldContext.Provider value={field}>
          <View accessibilityRole="toolbar" {...rest} style={[{ paddingTop, paddingBottom }, sides(gutter), style]}>
            {backdrop}
            <View
              ref={swap.ref}
              onLayout={android ? swap.onRow : undefined}
              style={[styles.iosRow, { minHeight: item.height, gap: start || content?.props.fill ? slotGap(theme, bar) : 0 }]}
            >
              {/* A row set from the start leaves out an empty side, which would push the rest a gap in */}
              {hasLeading ? (
                <View key="leading" style={[sideStyle, styles.sideStart, sideMin(sideWidths.leading)]}>
                  {measured("leading", leading)}
                </View>
              ) : null}
              {leavingMiddle}
              {middle}
              {trailingSide}
            </View>
            {large && title ? (
              <View style={{ marginTop: theme.length("--toolbar-large-title-gap", 13.3) }}>
                <BarTitle title={title.props} large start />
              </View>
            ) : null}
            {rows.map((row, index) => (
              <View key={row.key} style={{ marginTop: android ? 8 : index === 0 && large && title ? rowUnderTitle(theme, title.props.subtitle != null) : theme.length("--toolbar-row-gap", 10) }}>
                {row}
              </View>
            ))}
          </View>
        </BarFieldContext.Provider>
      </BarItemContext.Provider>
    </ToolbarContext.Provider>
  )
}
ToolbarRoot.displayName = "Toolbar"

/** Android's swap of its bar and its search: 150ms, accelerating then decelerating. */
const SEARCH_SWAP = { duration: 150, easing: curves.accelerateDecelerate }
/** How far the menu (the search field and the actions) moves toward the end as the search opens. */
const MENU_SHIFT = 5

/**
 * Its children as last drawn while `hold` is set: a part of the bar that has left keeps its look and its state (a
 * search field its text) while it fades out.
 */
const Held = memo(
  function Held({ children }: { hold: boolean; children?: ReactNode }) {
    return <>{children}</>
  },
  (_, next) => next.hold,
)

const LEFT_BEHIND = { pointerEvents: "none", "aria-hidden": true, accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" } as const

/** A part of the row from its start edge, so it reads the same in a right-to-left row. */
type Place = { start: number; width: number }
/** A part that has left stays where it stood while it fades out. */
const away = (place: Place): ViewStyle => ({ position: "absolute", top: 0, bottom: 0, start: place.start, width: place.width })

/** The parts of the row: which middle (`search`, `content`, `title` or `none`), a trailing side, the title's side. */
type RowParts = { searching: boolean; middle: string; trailing: boolean; start: boolean }
type Leaving = { middle: { key: string; place: Place; start: boolean } | null; trailing: Place | null }

/**
 * The swap of an Android bar and its search: `open` runs to 1 as the search opens and back to 0 as it closes, from
 * where it stands, over 150ms (at once with reduced motion); `leaving` holds the parts of the other look, where they
 * were laid out, until it lands. The parts report their frames through `measure`, the row its width through `onRow`.
 */
function useSearchSwap(parts: RowParts, enabled: boolean, reduced: boolean) {
  const { searching } = parts
  const [open] = useState(() => new Animated.Value(searching ? 1 : 0))
  const { ref, rtl } = useRTL<ComponentRef<typeof View>>()
  const [frames, setFrames] = useState<Record<string, { x: number; width: number }>>({})
  const [rowWidth, setRowWidth] = useState(0)
  const [shown, setShown] = useState(parts)
  const [leaving, setLeaving] = useState<Leaving | null>(null)
  if (shown.searching !== searching || shown.middle !== parts.middle || shown.trailing !== parts.trailing || shown.start !== parts.start) {
    setShown(parts)
    if (shown.searching !== searching) {
      // The frames are still those of the parts that leave (x from the left, as a layout reports it)
      const place = (key: string): Place | null => {
        const frame = frames[key]
        return frame ? { start: rtl ? rowWidth - frame.x - frame.width : frame.x, width: frame.width } : null
      }
      const middle = shown.middle !== "none" ? place(shown.middle) : null
      const trailing = shown.trailing && !parts.trailing ? place("trailing") : null
      setLeaving(enabled && !reduced && (middle || trailing) ? { middle: middle && { key: shown.middle, place: middle, start: shown.start }, trailing } : null)
    }
  }
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (reduced) {
      open.stopAnimation()
      open.setValue(searching ? 1 : 0)
      return
    }
    const animation = Animated.timing(open, { toValue: searching ? 1 : 0, ...SEARCH_SWAP, useNativeDriver: false })
    animation.start(({ finished }) => {
      if (finished) setLeaving(null)
    })
    return () => animation.stop()
  }, [searching, reduced, open])
  const measure = (key: string) => (event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout
    setFrames((prev) => (prev[key]?.x === x && prev[key]?.width === width ? prev : { ...prev, [key]: { x, width } }))
  }
  const onRow = (event: LayoutChangeEvent) => setRowWidth(event.nativeEvent.layout.width)
  return { open, leaving, ref, rtl, measure, onRow }
}

/**
 * The first row under a large title: 16 under the title's last baseline, as the web's content starts under a large
 * title (iOS 27.2: 16 under the baseline; 16.6 under a subtitle's), less the descent of that line.
 */
function rowUnderTitle(theme: Theme, subtitle: boolean) {
  return subtitle
    ? 16.6 - theme.length("--toolbar-large-subtitle-descent", 4.6)
    : 16 - theme.length("--toolbar-large-title-descent", 8.3)
}

export const Toolbar = Object.assign(ToolbarRoot, {
  Leading: ToolbarLeading,
  Title: ToolbarTitle,
  Content: ToolbarContent,
  Group: ToolbarGroup,
  Trailing: ToolbarTrailing,
  Row: ToolbarRow,
})

const styles = StyleSheet.create({
  slot: { flexDirection: "row", alignItems: "center" },
  trailing: { justifyContent: "flex-end" },
  content: { justifyContent: "center" },
  // A filling content stretches its control across (a search field, a block button), as a column would
  fill: { flex: 1, flexDirection: "column", alignItems: "stretch" },
  // A row's control fills it when it is a block control, and stands at the leading edge otherwise
  row: { flexDirection: "column", alignItems: "stretch" },
  heading: { justifyContent: "center", minWidth: 0 },
  iosRow: { flexDirection: "row", alignItems: "center" },
  side: { flex: 1, flexBasis: 0 },
  sideStart: { flexDirection: "row", justifyContent: "flex-start" },
  sideEnd: { flexDirection: "row", justifyContent: "flex-end" },
  middle: { flexShrink: 1, alignItems: "center", minWidth: 0 },
  grow: { flex: 1, minWidth: 0 },
  groupGlass: { position: "absolute", top: 0, bottom: 0, end: 0 },
  awayMiddle: { justifyContent: "center" },
  awayTrailing: { alignItems: "center" },
})
