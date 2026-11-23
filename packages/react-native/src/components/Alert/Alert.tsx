import { cloneElement, isValidElement, useState, type ReactElement, type ReactNode } from "react"
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import CheckCircle from "../../icons/plex/CheckCircle"
import InfoCircle from "../../icons/plex/InfoCircle"
import Warning from "../../icons/plex/Warning"
import X from "../../icons/plex/X"
import { flattenChildren, isRenderable } from "../../internal/children"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { Button, buttonColors, type ButtonProps } from "../Button/Button"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { Text, TextColorProvider } from "../Text/Text"

export type AlertColor = "primary" | "danger" | "success" | "info" | "discovery" | "caution" | "warning"
export type AlertVariant = "solid" | "soft" | "outline"
export type AlertMobileActions = "capsules" | "own"

export type AlertProps = {
  /** @default "primary" */
  color?: AlertColor
  /** On a phone a soft or outline alert is gray, only its icon in the color; a solid one keeps its color. @default "outline" */
  variant?: AlertVariant
  /** The alert's title. */
  title?: ReactNode
  /** Its description. */
  description?: ReactNode
  /** Buttons for the alert's actions, under the message. */
  actions?: ReactNode
  /**
   * `capsules`: each action a capsule as wide as half the alert at least, side by side (an iOS tip's buttons); `own`:
   * the buttons as given, starting where the text starts, for an alert inside a block of buttons of its own.
   * @default "capsules"
   */
  mobileActions?: AlertMobileActions
  /** An icon in place of the one of the color; `false` shows none. */
  indicator?: ReactNode | false
  /** Shows a close button in the alert's corner, which calls this. */
  onDismiss?: () => void
  /** @default "Dismiss" */
  dismissLabel?: string
  /** A full-width strip across the top or bottom of a screen: square corners. @default false */
  banner?: boolean
  testID?: string
  style?: StyleProp<ViewStyle>
  /** The style of the actions' row. */
  actionsStyle?: StyleProp<ViewStyle>
}

/** The icon of a color, as the web chooses it: a warning for warning, caution and danger, a check for success. */
function DefaultIndicator({ color }: { color: AlertColor }) {
  if (color === "warning" || color === "caution" || color === "danger") return <Warning />
  if (color === "success") return <CheckCircle />
  return <InfoCircle />
}

/** The icon's color on a gray alert: the color's text, lighter in the dark where the text would read under 3:1. */
function tintOf(theme: Theme, color: AlertColor): string {
  const dark = theme.scheme === "dark"
  switch (color) {
    case "primary":
      return theme.color("--mobile-label-secondary", theme.colors.textSecondary)
    case "warning":
      return theme.color(dark ? "--orange-300" : "--color-text-warning")
    case "danger":
      return theme.color(dark ? "--red-300" : "--color-text-danger")
    case "discovery":
      return theme.color(dark ? "--purple-200" : "--color-text-discovery")
    default:
      return theme.color(`--color-text-${color}`)
  }
}

/** The colors of an alert on a phone (Alert.module.css, `max-width: 767px`). */
export function alertColors(theme: Theme, color: AlertColor, variant: AlertVariant) {
  if (variant === "solid") {
    const text = theme.color(`--color-text-${color}-solid`)
    return { background: theme.color(`--color-background-${color}-solid`), title: text, description: text, icon: text }
  }
  return {
    background: theme.color("--alert-phone-background", theme.color("--color-background-secondary-soft-alpha")),
    title: theme.colors.text,
    // The secondary label at its native 60%, 70% in the dark
    description: theme.color("--alert-phone-description-color", theme.color(theme.scheme === "dark" ? "--alpha-70" : "--alpha-60")),
    icon: theme.color("--alert-phone-indicator-color", tintOf(theme, color)),
  }
}

/**
 * The phone's numbers of each platform. iOS: an inline tip of TipKit as Alert.module.css draws it at 767px and below
 * (26 corners, 17/16 padding, a 22 symbol drawn at 26.4 6 in, the text at 56, 18 above the actions, 50pt capsules 8
 * apart, a 26 close circle in a 44 target 5 from the corner). Android: the same card in the Plex Android look (16dp
 * corners as its cards, 16 padding, a 24dp icon 16 from the text, Title M and Body M, 40dp buttons, the close glyph
 * 24dp in a 48dp target).
 */
function metricsOf(theme: Theme) {
  if (theme.isAndroid) {
    return { radius: 16, paddingTop: 16, paddingBottom: 16, paddingBottomActions: 16, paddingX: 16, glyph: 24, iconBox: 24, iconStart: 0, iconEnd: 0, gap: 16, rowGap: 16, close: { target: 48, circle: 0, icon: 24, offset: 4, room: 32 }, capsule: "lg" as const }
  }
  const glyph = 22
  return {
    radius: 26,
    paddingTop: 17,
    paddingBottom: 17,
    paddingBottomActions: 16,
    paddingX: 16,
    glyph,
    // A Plex icon draws its circle 20 of its 24: the icon is 26.4 so that its circle is TipKit's 22
    iconBox: (glyph * 24) / 20,
    iconStart: 6,
    iconEnd: 4,
    gap: 8,
    rowGap: 18,
    close: { target: 44, circle: 26, icon: 19, offset: 5, room: 34 },
    capsule: "xl" as const,
  }
}

/**
 * An inline message (a notice, a warning), as @plexui/ui's Alert on a phone: the shape and text of an iOS tip
 * (TipKit), the system's message inside a screen. A soft or outline alert is gray with the icon in its color, a solid
 * one keeps its color; the actions stand under the message as capsules side by side; `onDismiss` puts a close button
 * in the corner. Neither platform has an inline alert of its own: Android draws the same card in its own sizes. A
 * danger alert is announced as an `alert`.
 */
export function Alert({
  color = "primary",
  variant = "outline",
  title,
  description,
  actions,
  mobileActions = "capsules",
  indicator,
  onDismiss,
  dismissLabel = "Dismiss",
  banner = false,
  testID,
  style,
  actionsStyle,
}: AlertProps) {
  const theme = useTheme()
  const android = theme.isAndroid
  const m = metricsOf(theme)
  const colors = alertColors(theme, color, variant)
  const [actionsWidth, setActionsWidth] = useState(0)
  const hasTitle = isRenderable(title)
  const hasDescription = isRenderable(description)
  const hasIndicator = indicator !== false
  const items = flattenChildren(actions).filter(isRenderable)
  const hasActions = items.length > 0
  const own = mobileActions === "own"
  const dismissible = onDismiss != null
  // The first line of text stands on the middle of the icon: TipKit's 5 above and below a 22 symbol on iOS; on
  // Android the icon sits on the title's 24 line, or 2 above a description's 20
  const firstLine = hasTitle ? (android ? 24 : 22) : 20
  const iconMargin = android ? { top: (firstLine - m.glyph) / 2, bottom: 0 } : hasTitle && hasDescription ? { top: 0, bottom: 10 } : { top: 5, bottom: 5 }
  const messageAlign: ViewStyle = android
    ? {}
    : hasTitle && !hasDescription
      ? { alignSelf: "center" }
      : !hasTitle && hasIndicator
        ? { marginTop: 5 + m.glyph / 2 - 10 }
        : {}
  // The first line stops short of the close button
  const closeRoom = dismissible ? { paddingEnd: m.close.room } : null
  // Capsules share the row, each at least half of it; `own` buttons keep their size and start under the text
  const half = actionsWidth > 0 ? (actionsWidth - 8) / 2 : undefined
  const actionItems = items.map((item, index) => {
    if (own || !isValidElement(item) || item.type !== Button) return item
    const button = item as ReactElement<ButtonProps>
    return cloneElement(button, {
      key: button.key ?? index,
      size: m.capsule,
      pill: true,
      style: [button.props.style, styles.capsule, { minWidth: half }],
    })
  })
  const textStart = hasIndicator ? m.iconStart + m.glyph + m.iconEnd + m.gap : android ? 0 : 6
  return (
    <View
      testID={testID}
      role={color === "danger" ? "alert" : undefined}
      style={[
        styles.alert,
        {
          columnGap: m.gap,
          rowGap: m.rowGap,
          paddingTop: m.paddingTop,
          paddingBottom: hasActions ? m.paddingBottomActions : m.paddingBottom,
          paddingHorizontal: m.paddingX,
          borderRadius: banner ? 0 : m.radius,
          backgroundColor: colors.background,
        },
        style,
      ]}
    >
      {hasIndicator ? (
        <View
          style={[
            styles.indicator,
            { paddingStart: m.iconStart, paddingEnd: m.iconEnd, marginTop: iconMargin.top, marginBottom: iconMargin.bottom, minHeight: m.glyph, minWidth: m.glyph },
          ]}
        >
          <IconDefaultsProvider size={m.iconBox} color={colors.icon}>
            {/* The icon overhangs its place by its inset on each side, so the text stays at its column */}
            <View style={{ width: m.glyph, height: m.glyph, alignItems: "center", justifyContent: "center" }}>
              <View style={{ margin: (m.glyph - m.iconBox) / 2 }}>{indicator ?? <DefaultIndicator color={color} />}</View>
            </View>
          </IconDefaultsProvider>
        </View>
      ) : null}
      <View style={[styles.message, { paddingStart: hasIndicator || android ? 0 : 6 }, messageAlign]}>
        {hasTitle ? (
          <Text variant="headline" color={colors.title} style={closeRoom}>
            {title}
          </Text>
        ) : null}
        {hasDescription ? (
          <TextColorProvider value={colors.description}>
            <Text
              variant="subheadline"
              color={colors.description}
              style={[hasTitle ? (android ? styles.androidDescription : styles.description) : closeRoom]}
            >
              {description}
            </Text>
          </TextColorProvider>
        ) : null}
      </View>
      {hasActions ? (
        <View
          onLayout={(event) => setActionsWidth(event.nativeEvent.layout.width)}
          style={[styles.actions, { paddingStart: own ? textStart : 0 }, actionsStyle]}
        >
          {actionItems}
        </View>
      ) : null}
      {dismissible ? <CloseButton onPress={onDismiss} label={dismissLabel} close={m.close} /> : null}
    </View>
  )
}

/**
 * The close button of a phone alert: on iOS a 26 circle of a soft secondary button with a 19 cross, in a 44 target 5
 * from the corner (Alert.module.css); on Android the cross alone, 24dp in a 48dp target, in the secondary ink.
 */
function CloseButton({ onPress, label, close }: { onPress: () => void; label: string; close: ReturnType<typeof metricsOf>["close"] }) {
  const theme = useTheme()
  const colors = buttonColors(theme, "secondary", "soft", false, false)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.close, { width: close.target, height: close.target, top: close.offset, end: close.offset }]}
    >
      {({ pressed }) =>
        close.circle > 0 ? (
          <View style={{ width: close.circle, height: close.circle, borderRadius: close.circle / 2, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? colors.pressed : colors.background }}>
            <X size={close.icon} color={pressed && colors.pressedText ? colors.pressedText : colors.text} />
          </View>
        ) : (
          <X size={close.icon} color={theme.colors.labelSecondary} style={pressed ? styles.pressed : undefined} />
        )
      }
    </Pressable>
  )
}

const styles = StyleSheet.create({
  alert: { position: "relative", flexDirection: "row", flexWrap: "wrap", alignItems: "flex-start", alignSelf: "stretch", borderCurve: "continuous" },
  indicator: { flexShrink: 0, alignItems: "center", justifyContent: "center" },
  message: { flex: 1, minWidth: 0 },
  description: { marginTop: 2, marginBottom: 4 },
  androidDescription: { marginTop: 2 },
  actions: { flexBasis: "100%", flexGrow: 1, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  capsule: { flexGrow: 1, flexShrink: 0, flexBasis: "auto", maxWidth: "100%" },
  close: { position: "absolute", alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.6 },
})
