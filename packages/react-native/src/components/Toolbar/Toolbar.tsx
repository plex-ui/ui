import { createContext, isValidElement, useContext, type ReactElement, type ReactNode } from "react"
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { BarBackdrop } from "../../internal/BarBackdrop"
import { Glass } from "../../internal/Glass"
import { withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { materialType } from "../../theme/typography"
import { flattenChildren } from "../../internal/children"
import { BarItemContext, type BarItemStyle } from "../Button/Button"
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
   * Where an inline title stands; a large one starts at the leading edge. @default "center" on iOS, "start" on
   * Android (Material's small top app bar; `center` is its center-aligned one)
   */
  titleAlign?: ToolbarTitleAlign
  /**
   * How the bar meets content under it, on iOS: `glass` a translucent blurred bar with a line, `hard` an opaque one,
   * `soft` a veil, `none` nothing. Each shows once `scrolled` says content is under the bar. Android draws Material's
   * containers: the top app bar takes `surfaceContainer` when scrolled; the bottom toolbar is always filled.
   * @default "glass" at the top, "soft" at the bottom
   */
  background?: ToolbarBackground
  /** Content is under the bar (scrolled under a top bar, running on under a bottom one). */
  scrolled?: boolean
  /** Pads the bar for the status bar or the home indicator. @default true */
  safeArea?: boolean
  style?: StyleProp<ViewStyle>
  children?: ReactNode
}

type Placement = { placement: ToolbarPlacement }
const ToolbarContext = createContext<Placement>({ placement: "top" })

/** The leading items: a back button. */
function ToolbarLeading({ children, style, ...rest }: ViewProps) {
  const theme = useTheme()
  return (
    <View {...rest} style={[styles.slot, { gap: slotGap(theme, useContext(ToolbarContext).placement) }, style]}>
      {children}
    </View>
  )
}
ToolbarLeading.displayName = "Toolbar.Leading"

/** The trailing items: actions, a confirm button. */
function ToolbarTrailing({ children, style, ...rest }: ViewProps) {
  const theme = useTheme()
  return (
    <View {...rest} style={[styles.slot, styles.trailing, { gap: slotGap(theme, useContext(ToolbarContext).placement) }, style]}>
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
    <View {...rest} style={[styles.slot, styles.content, { gap: slotGap(theme, useContext(ToolbarContext).placement) }, fill ? styles.fill : null, style]}>
      {children}
    </View>
  )
}
ToolbarContent.displayName = "Toolbar.Content"

/** Buttons that share one capsule of glass on iOS; adjacent actions on Android. */
function ToolbarGroup({ children, style, ...rest }: ViewProps) {
  const theme = useTheme()
  const { placement } = useContext(ToolbarContext)
  const item = useContext(BarItemContext)
  if (theme.isAndroid || !item) {
    return (
      <View accessibilityRole="toolbar" {...rest} style={[styles.slot, { gap: slotGap(theme, placement) }, style]}>
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
  // A row holds ordinary controls: the metrics and glass of bar actions belong to the action slots only
  return (
    <BarItemContext.Provider value={null}>
      <SegmentedControlRowContext.Provider value={ROW}>
        <View {...rest} style={[styles.row, style]}>
          {children}
        </View>
      </SegmentedControlRowContext.Provider>
    </BarItemContext.Provider>
  )
}
const ROW = { inRow: true }
ToolbarRow.displayName = "Toolbar.Row"

function slotGap(theme: Theme, placement: ToolbarPlacement) {
  // Material: 48dp targets side by side (40dp buttons 8 apart)
  if (theme.isAndroid) return 8
  return placement === "bottom" ? theme.length("--toolbar-bottom-item-gap", 12) : theme.length("--toolbar-top-item-gap", 10)
}

function barItem(theme: Theme, placement: ToolbarPlacement): BarItemStyle {
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

function IOSTitle({ title, large, start }: { title: ToolbarTitleProps; large: boolean; start: boolean }) {
  const theme = useTheme()
  const subtitle = title.subtitle != null && title.subtitle !== false
  const font = large
    ? { fontSize: theme.length("--toolbar-large-title-font-size", 34), lineHeight: theme.length("--toolbar-large-title-line-height", 41) }
    : subtitle
      ? { fontSize: theme.length("--toolbar-title-compact-font-size", 15), lineHeight: theme.length("--toolbar-title-compact-line-height", 20) }
      : { fontSize: theme.length("--toolbar-title-font-size", 17), lineHeight: theme.length("--toolbar-title-line-height", 22) }
  const sub = large
    ? { fontSize: theme.length("--toolbar-large-subtitle-font-size", 15), lineHeight: theme.length("--toolbar-large-subtitle-line-height", 20) }
    : { fontSize: theme.length("--toolbar-subtitle-font-size", 12), lineHeight: theme.length("--toolbar-subtitle-line-height", 16), marginTop: -2 }
  return (
    <View style={[styles.heading, { alignItems: start || large ? "flex-start" : "center", minHeight: large ? 0 : theme.length("--toolbar-top-item-size", 44) }]}>
      <Text accessibilityRole="header" numberOfLines={title.numberOfLines ?? 1} weight={large ? "bold" : "semibold"} align={start || large ? "left" : "center"} style={font}>
        {title.children}
      </Text>
      {subtitle ? (
        <Text numberOfLines={1} weight={large ? "regular" : "medium"} color={theme.colors.labelSecondary} style={sub}>
          {title.subtitle}
        </Text>
      ) : null}
    </View>
  )
}

function AndroidTitle({ title, large, center }: { title: ToolbarTitleProps; large: boolean; center: boolean }) {
  const subtitle = title.subtitle != null && title.subtitle !== false
  // Material 3 Expressive: small app bar Title L (subtitle Label M); large flexible Display S 36/44 (subtitle Title M)
  const font = large ? { fontSize: 36, lineHeight: 44 } : materialType.titleLarge
  const sub = large ? materialType.titleMedium : materialType.labelMedium
  return (
    <View style={[styles.heading, { alignItems: center && !large ? "center" : "flex-start" }]}>
      <Text accessibilityRole="header" numberOfLines={title.numberOfLines ?? 1} weight="regular" style={{ fontSize: font.fontSize, lineHeight: font.lineHeight }}>
        {title.children}
      </Text>
      {subtitle ? (
        <Text numberOfLines={1} color="secondary" weight={large ? "medium" : "medium"} style={{ fontSize: sub.fontSize, lineHeight: sub.lineHeight }}>
          {title.subtitle}
        </Text>
      ) : null}
    </View>
  )
}

/**
 * A bar of controls at the top or the bottom of a screen. On iOS 26 its items stand in glass on the content (44pt at
 * the top, 48 at the bottom), with an inline or a large title, after the Plex UI phone layer; on Android it is a
 * Material 3 top app bar (small, 64dp, or large flexible) or a docked toolbar. Parts: `Toolbar.Leading`,
 * `Toolbar.Title`, `Toolbar.Content`, `Toolbar.Group`, `Toolbar.Trailing`, `Toolbar.Row`, as in @plexui/ui.
 */
function ToolbarRoot({
  placement = "top",
  titleStyle = "inline",
  titleAlign: titleAlignProp,
  background,
  scrolled = false,
  safeArea = true,
  style,
  children,
  ...rest
}: ToolbarProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const titleAlign = titleAlignProp ?? (theme.isAndroid ? "start" : "center")
  const { leading, title, content, trailing, rows } = parts(children)
  const top = placement === "top"
  const large = top && titleStyle === "large"
  const start = titleAlign === "start" || !!content?.props.fill
  const item = barItem(theme, placement)
  const mode = background ?? (top ? "glass" : "soft")

  if (theme.isAndroid) {
    const fillColor = top ? (scrolled ? theme.material.surfaceContainer : theme.material.surface) : theme.material.surfaceContainer
    const centered = titleAlign === "center" && !content
    return (
      <ToolbarContext.Provider value={{ placement }}>
        <BarItemContext.Provider value={item}>
          <View
            accessibilityRole="toolbar"
            {...rest}
            style={[
              { backgroundColor: fillColor, paddingTop: top && safeArea ? insets.top : 0, paddingBottom: !top && safeArea ? insets.bottom : 0 },
              style,
            ]}
          >
            <View style={[styles.androidRow, { paddingHorizontal: top ? 4 : 16, justifyContent: top ? "flex-start" : "space-between" }]}>
              {leading ? <View style={styles.androidEdge}>{leading}</View> : null}
              {top && title && !large && centered ? (
                // Center-aligned app bar: the title centered on the bar, the actions at its ends
                <>
                  <View style={styles.grow} />
                  <View pointerEvents="box-none" style={styles.androidCentered}>
                    <AndroidTitle title={title.props} large={false} center />
                  </View>
                </>
              ) : top && title && !large ? (
                <View style={[styles.grow, { marginLeft: leading ? 4 : 12, marginRight: 4 }]}>
                  <AndroidTitle title={title.props} large={false} center={false} />
                </View>
              ) : content ? (
                <View style={[styles.grow, { alignItems: content.props.fill ? "stretch" : "center" }]}>{content}</View>
              ) : (
                <View style={styles.grow} />
              )}
              {trailing ? <View style={styles.androidEdge}>{trailing}</View> : null}
            </View>
            {large && title ? (
              <View style={styles.androidLarge}>
                <AndroidTitle title={title.props} large center={false} />
              </View>
            ) : null}
            {rows.length ? <View style={styles.androidRows}>{rows}</View> : null}
          </View>
        </BarItemContext.Provider>
      </ToolbarContext.Provider>
    )
  }

  const paddingTop = top ? (safeArea ? Math.max(theme.length("--toolbar-padding-bottom", 10), insets.top) : theme.length("--toolbar-padding-bottom", 10)) : theme.length("--toolbar-bottom-padding-top", 4)
  const bottomPadding = theme.length("--toolbar-bottom-padding-bottom", 16)
  // The items of a bottom bar stand 28 above the edge of a phone with a home indicator (the reference of the CSS)
  const paddingBottom = top ? theme.length("--toolbar-padding-bottom", 10) : safeArea ? Math.max(bottomPadding, insets.bottom - 6) : bottomPadding
  const gutter = top ? theme.length("--toolbar-gutter", 16) : theme.length("--toolbar-bottom-gutter", 28)
  const canvas = theme.colors.background
  const veil = withAlpha(canvas, parseFloat(String(theme.token("--page-bar-veil-opacity") ?? "55")) / 100)
  const backdrop = !scrolled || mode === "none" ? null : mode === "hard" ? (
    <BarBackdrop fill={canvas} line={theme.color("--page-bar-hard-line")} edge={top ? "bottom" : "top"} />
  ) : mode === "glass" ? (
    <BarBackdrop fill={veil} blur={6} line={theme.color("--page-bar-line")} edge={top ? "bottom" : "top"} />
  ) : (
    <BarBackdrop fill={veil} blur={theme.length("--page-bar-soft-blur", 10)} edge={top ? "bottom" : "top"} />
  )
  const sideStyle = start ? null : styles.side
  const middle = content ? (
    <View style={[content.props.fill ? styles.grow : styles.middle]}>{content}</View>
  ) : title && !large ? (
    <View style={[start ? styles.grow : styles.middle]}>
      <IOSTitle title={title.props} large={false} start={start} />
    </View>
  ) : (
    <View style={styles.grow} />
  )
  return (
    <ToolbarContext.Provider value={{ placement }}>
      <BarItemContext.Provider value={item}>
        <View accessibilityRole="toolbar" {...rest} style={[{ paddingTop, paddingBottom, paddingHorizontal: gutter }, style]}>
          {backdrop}
          <View style={[styles.iosRow, { minHeight: item.height, gap: start || content?.props.fill ? slotGap(theme, placement) : 0 }]}>
            <View style={[sideStyle, styles.sideStart]}>{leading}</View>
            {middle}
            <View style={[sideStyle, styles.sideEnd]}>{trailing}</View>
          </View>
          {large && title ? (
            <View style={{ marginTop: theme.length("--toolbar-large-title-gap", 13.3) }}>
              <IOSTitle title={title.props} large start />
            </View>
          ) : null}
          {rows.map((row) => (
            <View key={row.key} style={{ marginTop: theme.length("--toolbar-row-gap", 10) }}>
              {row}
            </View>
          ))}
        </View>
      </BarItemContext.Provider>
    </ToolbarContext.Provider>
  )
}
ToolbarRoot.displayName = "Toolbar"

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
  fill: { flex: 1, alignItems: "stretch" },
  // A row's control fills it when it is a block control, and stands at the leading edge otherwise
  row: { flexDirection: "column", alignItems: "stretch" },
  heading: { justifyContent: "center", minWidth: 0 },
  iosRow: { flexDirection: "row", alignItems: "center" },
  side: { flex: 1, flexBasis: 0 },
  sideStart: { flexDirection: "row", justifyContent: "flex-start" },
  sideEnd: { flexDirection: "row", justifyContent: "flex-end" },
  middle: { flexShrink: 1, alignItems: "center", minWidth: 0 },
  grow: { flex: 1, minWidth: 0 },
  androidRow: { height: 64, flexDirection: "row", alignItems: "center" },
  androidEdge: { paddingHorizontal: 4, flexDirection: "row", alignItems: "center" },
  androidCentered: { position: "absolute", top: 0, bottom: 0, left: 56, right: 56, justifyContent: "center" },
  androidLarge: { paddingHorizontal: 16, paddingBottom: 12 },
  androidRows: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
})
