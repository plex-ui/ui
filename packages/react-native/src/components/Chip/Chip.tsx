import { useState, type ReactNode } from "react"
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import CloseBold from "../../icons/plex/CloseBold"
import { spaceToggles } from "../../internal/a11y"
import { withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { Text } from "../Text/Text"

export type ChipProps = {
  children: ReactNode
  /** A filter chip: chosen or not. Leave it out for an action chip. */
  selected?: boolean
  defaultSelected?: boolean
  onSelectedChange?: (selected: boolean) => void
  /** An action chip's press. */
  onPress?: () => void
  /** A symbol before the label. */
  icon?: ReactNode
  /** An input chip: a cross at the end that calls this. */
  onRemove?: () => void
  /** @default "Remove" */
  removeLabel?: string
  disabled?: boolean
  testID?: string
  style?: StyleProp<ViewStyle>
}

/**
 * A compact choice or action. Android: a chip (a 32dp capsule filled with the text color at 5%, Regular 14; a
 * selected one in the Plex primary, as on iOS). iOS has no chip control: the filter capsules of iOS apps (a 34pt
 * capsule, 15/20 medium, the soft gray fill, the Plex primary when selected, as a selected Plex Button). The web has
 * no Chip; the props follow Toggle-like controls (`selected`, `onSelectedChange`) and Badge's `onRemove`.
 */
export function Chip({ children, selected: selectedProp, defaultSelected, onSelectedChange, onPress, icon, onRemove, removeLabel = "Remove", disabled = false, testID, style }: ChipProps) {
  const theme = useTheme()
  const [own, setOwn] = useState(defaultSelected ?? false)
  const filter = selectedProp !== undefined || defaultSelected !== undefined || onSelectedChange !== undefined
  const selected = filter ? (selectedProp ?? own) : false
  const press = () => {
    if (disabled) return
    if (filter) {
      if (selectedProp === undefined) setOwn(!selected)
      onSelectedChange?.(!selected)
    }
    onPress?.()
  }
  const android = theme.isAndroid
  const m = theme.material
  // Android dims a disabled chip to half, as its other controls
  const color = android
    ? selected
      ? theme.color("--color-text-primary-solid")
      : m.onSurface
    : selected
      ? theme.color("--color-text-primary-solid")
      : disabled
        ? theme.colors.textDisabled
        : theme.colors.text
  const fill = android
    ? selected
      ? theme.color("--color-background-primary-solid")
      : withAlpha(m.onSurface, 0.05)
    : selected
      ? // A disabled selected chip stays selected: its fill fades to 40%, so it still stands apart from an off one
        withAlpha(theme.color("--color-background-primary-solid"), disabled ? 0.4 : 1)
      : theme.color("--color-background-secondary-soft-alpha")
  const height = android ? 32 : 34
  const label = android ? { fontSize: 14, lineHeight: 18 } : { fontSize: 15, lineHeight: 20 }
  const leading = icon
  const iconSize = android ? 18 : 17
  const leadingColor = color
  // The chip is drawn 32 (34) tall inside a 48dp (44pt) touch target, as Compose's minimum interactive size and the
  // HIG ask: the target is the layout box, the chip a layer inside it, so every press in the target reaches it
  const target = android ? 48 : 44
  const inset = (target - height) / 2
  // A capsule, which stays one when a large text size makes it taller
  const radius = 999
  const [pressed, setPressed] = useState(false)
  const layer = (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { top: inset, bottom: inset, borderRadius: radius, backgroundColor: fill, borderCurve: "continuous" }]}>
      {/* Android's press: the list selector over the chip, 6% black and 5% white at night (the dark theme's); over a
          selected chip's solid fill its label's color at 12%, which shows on either scheme */}
      {android && pressed && !disabled ? (
        <View style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: selected ? withAlpha(color, 0.12) : theme.scheme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)" }]} />
      ) : null}
    </View>
  )
  const box = {
    // The label's own air inside the chip, then the target's outside it: 48 (44) at the regular size, and taller
    // with the text at a large font scale instead of cutting it (Compose's chips have a minimum height, not a height)
    minHeight: target,
    paddingVertical: inset + (height - label.lineHeight) / 2,
    // Android: 12 at the sides, 8 before an icon and 6 after it
    paddingLeft: leading != null ? (android ? 8 : 12) : android ? 12 : 14,
    paddingRight: onRemove ? 0 : android ? 12 : 14,
    gap: 6,
    opacity: !android && pressed ? 0.7 : 1,
  }
  const body = (
    <>
      {/* In a View: on the web the absolute layer paints over a bare (unpositioned) svg, never over a View */}
      {leading != null ? (
        <View>
          <IconDefaultsProvider size={iconSize} color={leadingColor}>
            {leading}
          </IconDefaultsProvider>
        </View>
      ) : null}
      <Text color={color} weight={android ? "regular" : "medium"} numberOfLines={1} style={{ fontSize: label.fontSize, lineHeight: label.lineHeight }}>
        {children}
      </Text>
    </>
  )
  const interactive = filter || !!onPress
  // Android dims a disabled chip, its fill with it, to half (as its other disabled controls)
  const dim = android && disabled ? styles.dim : null
  const handlers = {
    ...(filter ? spaceToggles(press) : {}),
    accessibilityRole: filter ? ("checkbox" as const) : ("button" as const),
    accessibilityState: { disabled, checked: filter ? selected : undefined },
    "aria-checked": filter ? selected : undefined,
    disabled,
    onPress: press,
    onPressIn: () => setPressed(true),
    onPressOut: () => setPressed(false),
  }
  // An input chip holds its cross beside the chip's own press, never a button inside a button; each takes the
  // target's full height
  if (onRemove) {
    return (
      <View testID={testID} style={[styles.chip, { minHeight: target }, dim, style]}>
        {layer}
        {interactive ? (
          <Pressable {...handlers} style={[styles.part, box]}>
            {body}
          </Pressable>
        ) : (
          <View style={[styles.part, box]}>{body}</View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={removeLabel}
          disabled={disabled}
          onPress={onRemove}
          style={[styles.part, { paddingLeft: android ? 4 : 6, paddingRight: android ? 8 : 10 }]}
        >
          <CloseBold size={android ? 18 : 14} color={color} />
        </Pressable>
      </View>
    )
  }
  if (!interactive) {
    return (
      <View testID={testID} style={[styles.chip, styles.part, box, dim, style]}>
        {layer}
        {body}
      </View>
    )
  }
  return (
    <Pressable {...handlers} testID={testID} style={[styles.chip, styles.part, box, dim, style]}>
      {layer}
      {body}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "stretch", alignSelf: "flex-start" },
  part: { flexDirection: "row", alignItems: "center" },
  dim: { opacity: 0.5 },
})
