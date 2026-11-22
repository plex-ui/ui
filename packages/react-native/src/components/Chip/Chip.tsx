import { useState, type ReactNode } from "react"
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import CheckMd from "../../icons/plex/CheckMd"
import CloseBold from "../../icons/plex/CloseBold"
import { spaceToggles } from "../../internal/a11y"
import { stateLayer, withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import { materialType } from "../../theme/typography"
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
 * A compact choice or action. Android: Material 3's chips (32dp, 8dp corners, a 1dp `outlineVariant` border, Label
 * L; a selected filter chip on `secondaryContainer` with a leading check). iOS has no chip control: the filter
 * capsules of iOS apps (a 34pt capsule, 15/20 medium, the soft gray fill, the Plex primary when selected, as a
 * selected Plex Button). The web has no Chip; the props follow Toggle-like controls (`selected`,
 * `onSelectedChange`) and Badge's `onRemove`.
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
  const off = withAlpha(m.onSurface, 0.38)
  // Compose's three chips: an assist chip (an action) labels in onSurface, a filter or input chip in onSurfaceVariant
  const assist = !filter && !onRemove
  const color = android
    ? disabled
      ? off
      : selected
        ? m.onSecondaryContainer
        : assist
          ? m.onSurface
          : m.onSurfaceVariant
    : disabled
      ? theme.colors.textDisabled
      : selected
        ? theme.color("--color-text-primary-solid")
        : theme.colors.text
  const fill = android
    ? selected
      ? disabled
        ? withAlpha(m.onSurface, 0.12)
        : m.secondaryContainer
      : "transparent"
    : selected
      ? theme.color("--color-background-primary-solid")
      : theme.color("--color-background-secondary-soft-alpha")
  const height = android ? 32 : 34
  const label = android ? materialType.labelLarge : { fontSize: 15, lineHeight: 20 }
  // Material's selected filter chip leads with a check where it has no symbol of its own
  const leading = android && selected && icon == null ? <CheckMd /> : icon
  const iconSize = android ? 18 : 17
  // The leading icon: primary on an assist or unselected filter chip, onSurfaceVariant on an unselected input chip
  // and primary on a selected one (InputChipTokens), the label's color on a selected filter chip
  const leadingColor = !android || disabled ? color : onRemove ? (selected ? m.primary : m.onSurfaceVariant) : selected ? color : m.primary
  // The chip is drawn 32 (34) tall inside a 48dp (44pt) touch target, as Compose's minimum interactive size and the
  // HIG ask: the target is the layout box, the chip a layer inside it, so every press in the target reaches it
  const target = android ? 48 : 44
  const inset = (target - height) / 2
  const radius = android ? 8 : height / 2
  const [pressed, setPressed] = useState(false)
  const outline = android && !selected ? { borderWidth: 1, borderColor: disabled ? withAlpha(m.onSurface, 0.12) : m.outlineVariant } : null
  const layer = (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { top: inset, bottom: inset, borderRadius: radius, backgroundColor: fill, borderCurve: "continuous" }, outline]}>
      {android && pressed && !disabled ? <View style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: withAlpha(color, stateLayer.pressed) }]} /> : null}
    </View>
  )
  const box = {
    minHeight: target,
    // Compose: 8 of padding and 8 of spacing around the label; an input chip pads 4 where it has no leading icon
    paddingLeft: leading != null ? (android ? 8 : 12) : android ? (onRemove ? 12 : 16) : 14,
    paddingRight: onRemove ? 0 : android ? 16 : 14,
    gap: android ? 8 : 6,
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
      <Text color={color} weight="medium" numberOfLines={1} style={{ fontSize: label.fontSize, lineHeight: label.lineHeight }}>
        {children}
      </Text>
    </>
  )
  const interactive = filter || !!onPress
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
      <View testID={testID} style={[styles.chip, { minHeight: target }, style]}>
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
          style={[styles.part, { paddingLeft: android ? 8 : 6, paddingRight: android ? 8 : 10 }]}
        >
          <CloseBold size={android ? 18 : 14} color={color} />
        </Pressable>
      </View>
    )
  }
  if (!interactive) {
    return (
      <View testID={testID} style={[styles.chip, styles.part, box, style]}>
        {layer}
        {body}
      </View>
    )
  }
  return (
    <Pressable {...handlers} testID={testID} style={[styles.chip, styles.part, box, style]}>
      {layer}
      {body}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "stretch", alignSelf: "flex-start" },
  part: { flexDirection: "row", alignItems: "center" },
})
