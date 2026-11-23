import type { ReactNode } from "react"
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import CloseBold from "../../icons/plex/CloseBold"
import { flattenChildren } from "../../internal/children"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { Text, TextColorProvider } from "../Text/Text"

export type BadgeColor = "secondary" | "success" | "danger" | "warning" | "info" | "discovery" | "caution"
export type BadgeVariant = "solid" | "soft" | "outline" | "counter"
export type BadgeSize = "sm" | "md" | "lg" | "xl"

export type BadgeProps = {
  children: ReactNode
  /**
   * The fill: `soft`, `solid` or `outline` in the color, or `counter`, a solid capsule of one size, as an unread count
   * (`size` and `pill` do not change it). @default "soft"
   */
  variant?: BadgeVariant
  /** 20, 22, 24 or 32 tall (36 on a phone for `xl`). @default "sm" */
  size?: BadgeSize
  /** A capsule. @default false */
  pill?: boolean
  /** @default "secondary" */
  color?: BadgeColor
  /** Adds a cross at the end that calls this when pressed. */
  onRemove?: () => void
  /** @default "Remove" */
  removeLabel?: string
  /** Shows the cross as a mark, for a badge inside a control that takes the press. */
  removable?: boolean
  testID?: string
  style?: StyleProp<ViewStyle>
}

/**
 * The counter (`variant="counter"`): a solid capsule 20.666 tall with 6.333 around a Medium 13 label, never
 * narrower than it is tall. The neutral badge is the accent, as an unread count; the others the solid fill of their color.
 */
const COUNTER = { height: 20.666, padding: 6.333, fontSize: 13 }

export function counterBadgeColors(theme: Theme, color: BadgeColor) {
  const tone = color === "secondary" ? "accent" : color
  return { background: theme.color(`--color-background-${tone}-solid`), text: theme.color(`--color-text-${tone}-solid`, "#FFFFFF"), border: undefined }
}

export function badgeColors(theme: Theme, variant: BadgeVariant, color: BadgeColor) {
  if (variant === "counter") return counterBadgeColors(theme, color)
  if (variant === "outline") return { background: "transparent", text: theme.color(`--color-text-${color}-outline`), border: theme.color(`--color-border-${color}-outline`) }
  if (variant === "solid") return { background: theme.color(`--color-background-${color}-solid`), text: theme.color(`--color-text-${color}-solid`), border: undefined }
  return { background: theme.color(`--color-background-${color}-soft-alpha`), text: theme.color(`--color-text-${color}-soft`), border: undefined }
}

/**
 * A short label of a status or a count, as @plexui/ui's Badge (`--badge-*`: the size, gutter, radius and semibold
 * type of each size; soft, solid and outline fills of the semantic colors). Material 3's badge is a dot or a count on
 * an icon (TabBar draws that), so Android draws the Plex badge too, in the same tokens. With
 * `variant="counter"` a badge is a counter, as an unread count: solid, a capsule, one size (`size` and `pill` aside).
 */
export function Badge({ children, variant = "soft", size = "sm", pill = false, color = "secondary", onRemove, removeLabel = "Remove", removable = false, testID, style }: BadgeProps) {
  const theme = useTheme()
  const counter = variant === "counter"
  const colors = badgeColors(theme, variant, color)
  const height = counter ? COUNTER.height : theme.length(`--badge-size-${size}`, 20)
  const fontSize = counter ? COUNTER.fontSize : theme.length(`--badge-font-size-${size}`, 12)
  const iconSize = counter ? COUNTER.fontSize : theme.length(`--badge-icon-font-size-${size}`, 12)
  const gutter = theme.length(`--badge-gutter-${size}`, 6)
  // A capsule stays one when a large text size grows the badge
  const radius = pill || counter ? 9999 : theme.length(`--badge-radius-${size}`, 4)
  const paddingHorizontal = counter ? COUNTER.padding : pill ? gutter * theme.length("--control-gutter-pill-scaling", 1.25) : gutter
  // The cross takes touches 44 (48 on Android) around it, the platform's least target
  const slop = Math.max(0, ((theme.isAndroid ? 48 : 44) - iconSize) / 2)
  const cross = onRemove ? (
    <Pressable accessibilityRole="button" accessibilityLabel={removeLabel} hitSlop={slop} onPress={onRemove} style={({ pressed }) => [styles.remove, pressed ? styles.pressed : null]}>
      <CloseBold size={iconSize} color={colors.text} />
    </Pressable>
  ) : removable ? (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.remove}>
      <CloseBold size={iconSize} color={colors.text} />
    </View>
  ) : null
  return (
    <View
      testID={testID}
      style={[
        styles.badge,
        // A least height: a large text size grows the badge rather than cutting its label
        { minHeight: height, minWidth: counter ? height : undefined, justifyContent: counter ? "center" : undefined, paddingHorizontal, borderRadius: radius, backgroundColor: colors.background },
        colors.border ? { borderWidth: 1, borderColor: colors.border } : null,
        style,
      ]}
    >
      <TextColorProvider value={colors.text}>
        <IconDefaultsProvider size={iconSize} color={colors.text}>
          {/* Text runs take the badge's type; a symbol beside them stays a symbol (`<Badge><Star />New</Badge>`) */}
          {flattenChildren(children).map((child, index) =>
            typeof child === "string" || typeof child === "number" ? (
              // A badge's label scales with the text size up to 130%: past that it would crowd what it labels
              <Text key={index} weight={counter ? "medium" : "semibold"} numberOfLines={1} maxFontSizeMultiplier={1.3} color={colors.text} style={{ fontSize, lineHeight: Math.round(fontSize * 1.34), flexShrink: 1 }}>
                {child}
              </Text>
            ) : (
              child
            ),
          )}
        </IconDefaultsProvider>
      </TextColorProvider>
      {cross}
    </View>
  )
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 4, maxWidth: "100%", borderCurve: "continuous" },
  remove: { marginEnd: -1, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.6 },
})
