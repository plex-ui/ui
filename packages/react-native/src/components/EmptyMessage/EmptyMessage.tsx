import { Children, cloneElement, createContext, isValidElement, useContext, type ReactNode } from "react"
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native"
import { space } from "../../internal/spacing"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { Button, type ButtonProps } from "../Button/Button"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { Text } from "../Text/Text"

type Tone = "secondary" | "danger" | "warning"

export type EmptyMessageProps = {
  children: ReactNode
  /** `static` stands in the flow; `absolute` fills and centers in its parent; `none` hugs its content. @default "static" */
  fill?: "static" | "absolute" | "none"
  /**
   * `sm` is the compact message of a panel, a card or an empty list, as the web's: a 32 badge 8 over a 14/20
   * semibold title (Title M on Android), the description 15/20 in the tertiary text, actions 12 under it and 8
   * apart, no side inset. @default "md"
   */
  size?: "sm" | "md"
  /** @default "center" */
  align?: "center" | "start"
  testID?: string
  style?: StyleProp<ViewStyle>
}

type Context = { theme: Theme; size: "sm" | "md"; align: "center" | "start" }
const EmptyContext = createContext<Context | null>(null)

function useEmpty(part: string) {
  const context = useContext(EmptyContext)
  if (!context) throw new Error(`${part} must be inside an EmptyMessage`)
  return context
}

const toneColor = (theme: Theme, tone: Tone) =>
  tone === "danger" ? theme.color("--color-text-danger") : tone === "warning" ? theme.color("--color-text-warning") : theme.isAndroid ? theme.material.onSurfaceVariant : theme.color("--empty-message-icon-secondary-color", theme.colors.labelSecondary)

/**
 * What a screen shows when it has nothing to show, as @plexui/ui's EmptyMessage with its parts (`.Icon`, `.Title`,
 * `.Description`, `.ActionRow`). iOS: the phone layer's (`--empty-message-*`: a 48 symbol 19 over the title, the
 * title 20/25 bold, the description 17/25 in the secondary label, actions 28 under it, 32 in from the sides), as
 * SwiftUI's ContentUnavailableView; `size="sm"` the web's compact message). Android: an empty view (46 in from the
 * sides, the picture 12 over a Medium 20 title, the description 14 gray 8 under it, and a button 16 under that across
 * the column, 28 more in: 74 from the edges, the big 48dp pill).
 */
function EmptyMessageRoot({ children, fill = "static", size = "md", align = "center", testID, style }: EmptyMessageProps) {
  const theme = useTheme()
  return (
    <EmptyContext.Provider value={{ theme, size, align }}>
      <View
        testID={testID}
        style={[
          styles.root,
          // The compact message keeps no side inset, as the web's; Android's empty view stands 46 in from the sides
          { paddingHorizontal: size === "sm" ? 0 : theme.isAndroid ? 46 : theme.length("--empty-message-padding-inline", 32), alignItems: align === "center" ? "center" : "flex-start" },
          fill === "absolute" ? [StyleSheet.absoluteFill, styles.center] : fill === "static" ? styles.static : null,
          style,
        ]}
      >
        {children}
      </View>
    </EmptyContext.Provider>
  )
}
EmptyMessageRoot.displayName = "EmptyMessage"

function EmptyMessageIcon({ children, color = "secondary", size }: { children: ReactNode; color?: Tone; size?: "sm" | "md" }) {
  const { theme, size: messageSize } = useEmpty("EmptyMessage.Icon")
  // A compact message sets its badge spacing(2) over the title
  // Android's empty view sets its picture 12 over the title
  const gap = messageSize === "sm" ? space(theme, 2) : theme.isAndroid ? 12 : theme.length("--empty-message-icon-gap", 19)
  // A compact icon stays a tinted 32 badge with a 20 symbol on every width (the bare 48 symbol is the default size's)
  if ((size ?? messageSize) === "sm") {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.badge, { marginBottom: gap, borderRadius: theme.length("--radius-md", 8), backgroundColor: theme.color(`--color-background-${color}-soft`) }]}
      >
        <IconDefaultsProvider size={20} color={theme.color(`--color-text-${color}-soft`)}>
          {children}
        </IconDefaultsProvider>
      </View>
    )
  }
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ marginBottom: gap }}>
      <IconDefaultsProvider size={theme.length("--empty-message-icon-size", 48)} color={toneColor(theme, color)}>
        {children}
      </IconDefaultsProvider>
    </View>
  )
}
EmptyMessageIcon.displayName = "EmptyMessage.Icon"

function EmptyMessageTitle({
  children,
  color,
  style,
}: {
  children: ReactNode
  color?: Tone
  /** Over the title's own type: a brand's display face at its size and line (`fontFamily`, `fontSize`, `lineHeight`). */
  style?: StyleProp<TextStyle>
}) {
  const { theme, size, align } = useEmpty("EmptyMessage.Title")
  const compact = size === "sm"
  // Android's empty view: the title Medium 20 (16 in the compact message)
  const type = theme.isAndroid
    ? compact
      ? { fontSize: 16, lineHeight: 20 }
      : { fontSize: 20, lineHeight: 24 }
    : compact
      ? { fontSize: theme.length("--font-text-sm-size", 14), lineHeight: theme.length("--font-text-sm-line-height", 20) }
      : { fontSize: theme.length("--empty-message-title-size", 20), lineHeight: theme.length("--empty-message-title-leading", 25) }
  return (
    <Text
      accessibilityRole="header"
      weight={theme.isAndroid ? "medium" : compact ? "semibold" : "bold"}
      color={color && color !== "secondary" ? toneColor(theme, color) : undefined}
      // `left` is the start: React Native turns it to the right in a right-to-left layout. `auto` took the alignment of
      // the page around it on the web, where a centered page left a start-aligned message centered
      style={[{ fontSize: type.fontSize, lineHeight: type.lineHeight, textAlign: align === "center" ? "center" : "left", marginBottom: compact ? space(theme, 1) : 0 }, style]}
    >
      {children}
    </Text>
  )
}
EmptyMessageTitle.displayName = "EmptyMessage.Title"

function EmptyMessageDescription({ children }: { children: ReactNode }) {
  const { theme, size, align } = useEmpty("EmptyMessage.Description")
  // Android's empty view: the description 14 in the gray text, 8 under the title
  const type = theme.isAndroid
    ? { fontSize: 14, lineHeight: 20 }
    : size === "sm"
      ? { fontSize: theme.length("--empty-message-compact-description-size", 15), lineHeight: theme.length("--empty-message-compact-description-leading", 20) }
      : { fontSize: theme.length("--empty-message-description-size", 17), lineHeight: theme.length("--empty-message-description-leading", 25) }
  const compact = size === "sm"
  return (
    <Text
      color={theme.isAndroid ? "secondary" : compact ? theme.colors.textTertiary : theme.color("--empty-message-description-color", theme.colors.labelSecondary)}
      // A compact title keeps the space under it (the web's), so a title alone keeps it too
      style={{ marginTop: compact ? 0 : theme.isAndroid ? 8 : 1, fontSize: type.fontSize, lineHeight: type.lineHeight, textAlign: align === "center" ? "center" : "left" }}
    >
      {children}
    </Text>
  )
}
EmptyMessageDescription.displayName = "EmptyMessage.Description"

function EmptyMessageActionRow({ children }: { children: ReactNode }) {
  const { theme, size, align } = useEmpty("EmptyMessage.ActionRow")
  // A compact message's actions stand spacing(3) under it and spacing(2) apart
  const compact = size === "sm"
  // Android's empty view: its button spans the column, 28 in from the text's sides (74 from the screen's), the big
  // 48dp pill. A Button that sets no width or size of its own takes them
  const wide = theme.isAndroid && !compact
  const action = (child: ReactNode) =>
    wide && isValidElement<ButtonProps>(child) && child.type === Button
      ? cloneElement(child, { block: child.props.block ?? true, size: child.props.size ?? "xl" })
      : child
  return (
    <View
      style={[
        styles.actions,
        {
          // Android's empty view sets its button 16 under the description
          marginTop: compact ? space(theme, 3) : theme.isAndroid ? 16 : theme.length("--empty-message-action-spacing", 28),
          gap: compact ? space(theme, 2) : theme.length("--empty-message-action-gap", 14),
        },
        align === "center" || wide ? styles.centerRow : null,
      ]}
    >
      {/* Each action keeps its own width (a Button hugs its label) and stands centered or at the start; on Android
          each spans the column */}
      {Children.map(children, (child) =>
        child == null ? null : <View style={wide ? styles.wideAction : { alignSelf: align === "center" ? "center" : "flex-start" }}>{action(child)}</View>,
      )}
    </View>
  )
}
EmptyMessageActionRow.displayName = "EmptyMessage.ActionRow"

export const EmptyMessage = Object.assign(EmptyMessageRoot, {
  Icon: EmptyMessageIcon,
  Title: EmptyMessageTitle,
  Description: EmptyMessageDescription,
  ActionRow: EmptyMessageActionRow,
})

/** The name of the pattern on the phone platforms; the same component as `EmptyMessage`. */
export const EmptyState = EmptyMessage

const styles = StyleSheet.create({
  root: { paddingVertical: 24 },
  // `static` fills the space it is given and centers in it, as the web's `flex: 1 0 auto`
  static: { alignSelf: "stretch", flexGrow: 1, justifyContent: "center" },
  badge: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  center: { justifyContent: "center" },
  actions: { flexDirection: "column", alignItems: "center" },
  centerRow: { alignSelf: "stretch" },
  wideAction: { alignSelf: "stretch", marginHorizontal: 28 },
})
