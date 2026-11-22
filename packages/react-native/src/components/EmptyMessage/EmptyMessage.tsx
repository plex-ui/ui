import { Children, createContext, useContext, type ReactNode } from "react"
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { materialType } from "../../theme/typography"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { Text } from "../Text/Text"

type Tone = "secondary" | "danger" | "warning"

export type EmptyMessageProps = {
  children: ReactNode
  /** `static` stands in the flow; `absolute` fills and centers in its parent; `none` hugs its content. @default "static" */
  fill?: "static" | "absolute" | "none"
  /** `sm` sets the description at 15/20, for a panel. @default "md" */
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
 * SwiftUI's ContentUnavailableView. Android: the same layout in Material's type (Title L, Body M, onSurfaceVariant).
 */
function EmptyMessageRoot({ children, fill = "static", size = "md", align = "center", testID, style }: EmptyMessageProps) {
  const theme = useTheme()
  return (
    <EmptyContext.Provider value={{ theme, size, align }}>
      <View
        testID={testID}
        style={[
          styles.root,
          { paddingHorizontal: theme.length("--empty-message-padding-inline", 32), alignItems: align === "center" ? "center" : "flex-start" },
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
  const gap = theme.length("--empty-message-icon-gap", 19)
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

function EmptyMessageTitle({ children, color }: { children: ReactNode; color?: Tone }) {
  const { theme, align } = useEmpty("EmptyMessage.Title")
  const type = theme.isAndroid ? materialType.titleLarge : { fontSize: theme.length("--empty-message-title-size", 20), lineHeight: theme.length("--empty-message-title-leading", 25) }
  return (
    <Text
      accessibilityRole="header"
      weight={theme.isAndroid ? "regular" : "bold"}
      color={color && color !== "secondary" ? toneColor(theme, color) : undefined}
      style={{ fontSize: type.fontSize, lineHeight: type.lineHeight, textAlign: align === "center" ? "center" : "left" }}
    >
      {children}
    </Text>
  )
}
EmptyMessageTitle.displayName = "EmptyMessage.Title"

function EmptyMessageDescription({ children }: { children: ReactNode }) {
  const { theme, size, align } = useEmpty("EmptyMessage.Description")
  const type = theme.isAndroid
    ? materialType.bodyMedium
    : size === "sm"
      ? { fontSize: theme.length("--empty-message-compact-description-size", 15), lineHeight: theme.length("--empty-message-compact-description-leading", 20) }
      : { fontSize: theme.length("--empty-message-description-size", 17), lineHeight: theme.length("--empty-message-description-leading", 25) }
  return (
    <Text
      color={theme.isAndroid ? "secondary" : theme.color("--empty-message-description-color", theme.colors.labelSecondary)}
      style={{ marginTop: theme.isAndroid ? 4 : 1, fontSize: type.fontSize, lineHeight: type.lineHeight, textAlign: align === "center" ? "center" : "left" }}
    >
      {children}
    </Text>
  )
}
EmptyMessageDescription.displayName = "EmptyMessage.Description"

function EmptyMessageActionRow({ children }: { children: ReactNode }) {
  const { theme, align } = useEmpty("EmptyMessage.ActionRow")
  return (
    <View
      style={[
        styles.actions,
        { marginTop: theme.isAndroid ? 24 : theme.length("--empty-message-action-spacing", 28), gap: theme.length("--empty-message-action-gap", 14) },
        align === "center" ? styles.centerRow : null,
      ]}
    >
      {/* Each action keeps its own width (a Button hugs its label) and stands centered or at the start */}
      {Children.map(children, (child) => (child == null ? null : <View style={{ alignSelf: align === "center" ? "center" : "flex-start" }}>{child}</View>))}
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
})
