import { useEffect, useState, type ReactNode } from "react"
import { Animated, Easing, Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { Pressable } from "../../internal/Pressable"
import ChevronDownSm from "../../icons/plex/ChevronDownSm"
import CloseBold from "../../icons/plex/CloseBold"
import XCircleFilled from "../../icons/plex/XCircleFilled"
import { spaceToggles } from "../../internal/a11y"
import { Glass } from "../../internal/Glass"
import { withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { MaterialArrowDropDown } from "../Icon/material"
import { Text, textStyle } from "../Text/Text"

export type ChipProps = {
  /** The label. Leave it out with an `icon` for a chip of the symbol alone, a circle named by `accessibilityLabel`. */
  children?: ReactNode
  /** A filter chip: chosen or not. Leave it out for an action chip. */
  selected?: boolean
  defaultSelected?: boolean
  onSelectedChange?: (selected: boolean) => void
  /** An action chip's press. */
  onPress?: () => void
  /** A symbol before the label. */
  icon?: ReactNode
  /** A symbol after the label. */
  trailingIcon?: ReactNode
  /**
   * The chip opens a menu (a filter that picks among options): a chevron after the label (iOS `chevron.down`, Material
   * `arrow_drop_down`) unless `trailingIcon` is given, and `aria-haspopup` for a screen reader. `true` is a menu;
   * `"listbox"` and `"dialog"` name what it opens.
   */
  menu?: boolean | "menu" | "listbox" | "dialog"
  /** Whether the chip's menu is open (`aria-expanded`). */
  expanded?: boolean
  accessibilityLabel?: string
  /**
   * iOS: `tag`, a capsule of the gray fill 40pt tall (a tag cloud in a sheet, as Maps' Filters), or `glass`, a glass
   * capsule 44pt tall (a filter in a row over content, as Maps' filters under its search). Android draws its chip with
   * either. @default "tag"
   */
  appearance?: "tag" | "glass"
  /** An input chip: called when the reader takes the value back (a cross on Android; see `removeStyle` on iOS). */
  onRemove?: () => void
  /** The remove action's name, for screen readers. @default "Remove" */
  removeLabel?: string
  /**
   * How an input chip is removed on iOS. `token`, as Apple's tokens (search tokens in Mail, Photos and Files; Mail's
   * recipients): no cross; a press selects the chip in the accent (and lets the last chosen token go) and a second press, or Delete on a
   * keyboard on the web, removes
   * it; VoiceOver offers `removeLabel` as an action. `button`: a cross after the label in the field's clear button
   * (xmark.circle.fill, 17pt in the tertiary label, a 44pt target). Android keeps Material's 18dp cross with either.
   * @default "token"
   */
  removeStyle?: "token" | "button"
  disabled?: boolean
  testID?: string
  style?: StyleProp<ViewStyle>
}

/**
 * A compact choice or action. Android: a chip (a 32dp capsule filled with the text color at 5%, Regular 14; a
 * selected one in the Plex primary). iOS has no chip control: the filter capsules of iOS 26 apps (Maps), measured on
 * an iPhone: a `tag` 40pt tall in the gray fill, or a `glass` capsule 44pt tall, the label 17/22 Regular; a selected
 * one in the app's accent (its tint) with a white label. The web has
 * no Chip; the props follow Toggle-like controls (`selected`, `onSelectedChange`) and Badge's `onRemove`.
 */
/** The chosen token's way to let go, so that choosing another lets it go */
let disarmToken: (() => void) | null = null

export function Chip({
  children,
  selected: selectedProp,
  defaultSelected,
  onSelectedChange,
  onPress,
  icon,
  trailingIcon,
  menu,
  expanded,
  accessibilityLabel,
  appearance = "tag",
  onRemove,
  removeLabel = "Remove",
  removeStyle = "token",
  disabled = false,
  testID,
  style,
}: ChipProps) {
  const theme = useTheme()
  const [own, setOwn] = useState(defaultSelected ?? false)
  // iOS's token: an input chip with no cross, chosen by a first press and removed by a second (or by Delete); it is
  // never a filter as well
  const token = !theme.isAndroid && onRemove != null && removeStyle === "token"
  const filter = !token && (selectedProp !== undefined || defaultSelected !== undefined || onSelectedChange !== undefined)
  const [armed, setArmedState] = useState(false)
  // One token is chosen at a time, as in a token field: choosing one lets the last one go (a tap on a native view
  // never moves focus, so a blur alone cannot)
  const [disarm] = useState(() => () => setArmedState(false))
  const setArmed = (on: boolean) => {
    if (on) {
      if (disarmToken !== disarm) disarmToken?.()
      disarmToken = disarm
    } else if (disarmToken === disarm) {
      disarmToken = null
    }
    setArmedState(on)
  }
  useEffect(
    () => () => {
      if (disarmToken === disarm) disarmToken = null
    },
    [disarm],
  )
  const selected = filter ? (selectedProp ?? own) : token && armed
  const press = () => {
    if (disabled) return
    if (token) {
      if (armed) {
        setArmed(false)
        onRemove?.()
        return
      }
      setArmed(true)
    }
    if (filter) {
      if (selectedProp === undefined) setOwn(!selected)
      onSelectedChange?.(!selected)
    }
    onPress?.()
  }
  const android = theme.isAndroid
  const glass = !android && appearance === "glass"
  const m = theme.material
  // Android: the label and the fill of either state, which a selection blends between
  const androidColor = { off: m.onSurface, on: theme.color("--color-text-primary-solid") }
  const androidFill = { off: withAlpha(m.onSurface, 0.05), on: theme.color("--color-background-primary-solid") }
  // Android dims a disabled chip to half, as its other controls
  const color = android
    ? selected
      ? androidColor.on
      : androidColor.off
    : selected
      ? theme.color("--color-text-accent-solid", "#FFFFFF")
      : disabled
        ? theme.colors.textDisabled
        : theme.colors.text
  const fill = android
    ? selected
      ? androidFill.on
      : androidFill.off
    : selected
      ? // The app's accent, as iOS tints a chosen filter; a disabled selected chip fades to 40%, so it still stands
        // apart from an off one
        withAlpha(theme.colors.accent, disabled ? 0.4 : 1)
      : glass
        ? "transparent"
        : theme.color("--color-background-secondary-soft-alpha")
  // Android blends the fill and the label from one state to the other in 120ms, linear; iOS changes at once
  const [blend] = useState(() => new Animated.Value(selected ? 1 : 0))
  const blends = android && !theme.reducedMotion
  useEffect(() => {
    const to = selected ? 1 : 0
    if (!blends) {
      blend.stopAnimation()
      blend.setValue(to)
      return
    }
    const animation = Animated.timing(blend, { toValue: to, duration: 120, easing: Easing.linear, useNativeDriver: false })
    animation.start()
    return () => animation.stop()
  }, [blend, blends, selected])
  const fillPaint = blends ? blend.interpolate({ inputRange: [0, 1], outputRange: [androidFill.off, androidFill.on] }) : fill
  const labelPaint = blends ? blend.interpolate({ inputRange: [0, 1], outputRange: [androidColor.off, androidColor.on] }) : color
  const height = android ? 32 : glass ? 44 : 40
  const label = android ? { fontSize: 14, lineHeight: 18 } : { fontSize: 17, lineHeight: 22 }
  const leading = icon
  // iOS: a 17pt symbol draws about 20 (the label's size)
  const iconSize = android ? 18 : 20
  // A menu chip's chevron: Material's 18dp arrow_drop_down, iOS's small chevron.down at the label's weight
  const trailing = trailingIcon ?? (menu ? android ? <MaterialArrowDropDown size={18} /> : <ChevronDownSm size={16} /> : null)
  const leadingColor = color
  // A symbol alone (Maps' filter button before its chips): a circle as tall as the chip, named by accessibilityLabel
  const symbolOnly = leading != null && (children == null || children === "") && trailing == null && !onRemove
  // An input chip's cross stands in a target of its own after the chip's press: on iOS the field's clear button
  const cross = onRemove != null && !token
  const clearSize = 17 * 1.2
  // The chip is drawn 32 (34) tall inside a 48dp (44pt) touch target, as Compose's minimum interactive size and the
  // HIG ask: the target is the layout box, the chip a layer inside it, so every press in the target reaches it
  const target = android ? 48 : 44
  const inset = (target - height) / 2
  // A capsule, which stays one when a large text size makes it taller
  const radius = 999
  const [pressed, setPressed] = useState(false)
  // iOS's glass filter: a glass capsule (its rim and sheen), filled with the accent once chosen
  const glassLayer =
    glass && !selected ? <Glass pointerEvents="none" radius={radius} style={[StyleSheet.absoluteFill, { top: inset, bottom: inset }]} /> : null
  const layer = glassLayer ?? (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { top: inset, bottom: inset, borderRadius: radius, backgroundColor: fillPaint, borderCurve: "continuous" }]}>
      {/* Android's press: the list selector over the chip, 6% black and 5% white at night (the dark theme's); over a
          selected chip's solid fill its label's color at 12%, which shows on either scheme */}
      {android && pressed && !disabled ? (
        <View style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: selected ? withAlpha(color, 0.12) : theme.scheme === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)" }]} />
      ) : null}
    </Animated.View>
  )
  const box = {
    // The label's own air inside the chip, then the target's outside it: 48 (44) at the regular size, and taller
    // with the text at a large font scale instead of cutting it (Compose's chips have a minimum height, not a height)
    minHeight: target,
    paddingVertical: inset + (height - label.lineHeight) / 2,
    // Android: 12 at the sides, 8 before an icon and 6 after it
    paddingLeft: symbolOnly ? (height - iconSize) / 2 : leading != null ? (android ? 8 : 12) : android ? 12 : 16,
    // Android: 8 after a trailing icon (Compose's FilterChip), iOS 12
    paddingRight: symbolOnly ? (height - iconSize) / 2 : cross ? 0 : trailing != null ? (android ? 8 : 12) : android ? 12 : 16,
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
      {symbolOnly ? null : android ? (
        // Text's own face and tracking, in a color that blends
        <Animated.Text
          numberOfLines={1}
          selectable={false}
          style={[textStyle(theme, { weight: "regular" }), { fontSize: label.fontSize, lineHeight: label.lineHeight, letterSpacing: theme.tracking(label.fontSize), color: labelPaint }]}
        >
          {children}
        </Animated.Text>
      ) : (
        <Text color={color} weight="regular" numberOfLines={1} selectable={false} style={{ fontSize: label.fontSize, lineHeight: label.lineHeight }}>
          {children}
        </Text>
      )}
      {trailing != null ? (
        <View>
          <IconDefaultsProvider size={iconSize} color={leadingColor}>
            {trailing}
          </IconDefaultsProvider>
        </View>
      ) : null}
    </>
  )
  const interactive = filter || !!onPress || token
  // Android dims a disabled chip, its fill with it, to half (as its other disabled controls)
  const dim = android && disabled ? styles.dim : null
  const handlers = {
    ...(filter ? spaceToggles(press) : {}),
    // A menu chip is a button that opens its menu, even when it shows a chosen filter
    accessibilityRole: filter && !menu ? ("checkbox" as const) : ("button" as const),
    accessibilityLabel,
    accessibilityState: {
      disabled,
      checked: filter && !menu ? selected : undefined,
      // A chosen token says so before the next press removes it
      selected: token ? armed : filter && menu && Platform.OS !== "web" ? selected : undefined,
      expanded,
    },
    "aria-checked": filter && !menu ? selected : undefined,
    // react-native-web drops `selected` on a button: the web reads a chosen token as pressed
    "aria-pressed": token && Platform.OS === "web" ? armed : undefined,
    "aria-haspopup": menu ? (menu === true ? ("menu" as const) : menu) : undefined,
    "aria-expanded": menu ? expanded : undefined,
    disabled,
    onPress: press,
    // A token: VoiceOver's action and a keyboard's Delete remove it; leaving it lets the selection go
    ...(token
      ? {
          accessibilityActions: [{ name: "delete", label: removeLabel }],
          onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) => {
            if (event.nativeEvent.actionName === "delete" && !disabled) onRemove?.()
          },
          onBlur: () => armed && setArmed(false),
          onKeyDown: (event: { nativeEvent: { key?: string } }) => {
            if ((event.nativeEvent.key === "Backspace" || event.nativeEvent.key === "Delete") && !disabled) onRemove?.()
          },
          "aria-keyshortcuts": "Delete Backspace",
        }
      : {}),
    onPressIn: () => setPressed(true),
    onPressOut: () => setPressed(false),
  }
  // An input chip holds its cross beside the chip's own press, never a button inside a button; each takes the
  // target's full height
  if (cross) {
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
          style={[styles.part, android ? { paddingLeft: 4, paddingRight: 8 } : { width: 44, justifyContent: "center" }]}
        >
          {android ? <CloseBold size={18} color={color} /> : <XCircleFilled size={clearSize} color={theme.color("--mobile-label-tertiary")} />}
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
