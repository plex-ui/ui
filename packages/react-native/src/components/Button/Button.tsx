import { Children, createContext, Fragment, isValidElement, useContext, useEffect, useState, type ReactElement, type ReactNode } from "react"
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { Glass } from "../../internal/Glass"
import { stateLayer, withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { materialType } from "../../theme/typography"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { Text, TextColorProvider } from "../Text/Text"

export type ButtonColor = "primary" | "secondary" | "danger" | "success" | "info" | "discovery" | "caution" | "warning"
export type ButtonVariant = "solid" | "soft" | "outline" | "ghost"
export type ControlSize = "3xs" | "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl"

export type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  /** @default "primary" */
  color?: ButtonColor
  /** @default "solid" */
  variant?: ButtonVariant
  /**
   * Height step of the Plex UI scale. iOS takes the native sizes of the phone layer (small 28, medium 34, large 50);
   * Android the Material 3 sizes (XS 32 up to sm, S 40 at md and lg, M 56 from xl).
   * @default "md"
   */
  size?: ControlSize
  /** Kept for the API of @plexui/ui: phone buttons are capsules on iOS and round on Android, as their platforms draw them. */
  pill?: boolean
  /** Material 3 Expressive shape on Android: round (default) or square corners. */
  shape?: "round" | "square"
  /** The glass of iOS 26 for a neutral soft or ghost button. Android has no glass. */
  mobileMaterial?: "glass" | "flat"
  /** A button as wide and tall: an icon alone. */
  uniform?: boolean
  /** Takes the whole width. */
  block?: boolean
  selected?: boolean
  loading?: boolean
  disabled?: boolean
  /** Takes no presses and draws as it is (no disabled look), as @plexui/ui. @default loading */
  inert?: boolean
  /** The size of the icons in the button, from the control scale (`--control-icon-size-*`); defaults to the size's. */
  iconSize?: "sm" | "md" | "lg" | "xl" | "2xl"
  /** The gutter at the button's edges, from the control scale (`--control-gutter-*`); defaults to the size's. */
  gutterSize?: "3xs" | "2xs" | "xs" | "sm" | "md" | "lg" | "xl"
  /** A negative margin of the gutter on one side, so that the label lines up with the content around the button. */
  opticallyAlign?: "start" | "end"
  /** Icons and text; an icon element takes the label's color and the size of the button's icons. */
  children?: ReactNode
  style?: StyleProp<ViewStyle>
}

type Metrics = {
  height: number
  gutter: number
  fontSize: number
  lineHeight: number
  iconSize: number
  gap: number
  radius: number
  pressedRadius: number
  indicator: number
  weight: "regular" | "medium" | "semibold"
}

/**
 * What a bar (Toolbar, the header of a sheet) asks of the buttons in it: on iOS the bar's item size, its label type and
 * icon size, glass for the neutral soft and ghost buttons (the capsule of a Group carries one glass for several) and
 * the accent for a solid primary one, the prominent bar button of iOS 26; on Android the actions of a Material top
 * app bar.
 */
export type BarItemStyle = {
  height: number
  fontSize: number
  lineHeight: number
  weight: Metrics["weight"]
  prominentWeight: Metrics["weight"]
  iconSize: number
  gutter: number
  /** In the glass capsule of a Toolbar.Group: no glass of its own. */
  inGroup?: boolean
  /** A solid primary button is the bar's prominent one, in the accent. @default true */
  prominent?: boolean
}

export const BarItemContext = createContext<BarItemStyle | null>(null)

const MATERIAL_SIZE = (size: ControlSize) => (["3xs", "2xs", "xs", "sm"].includes(size) ? "XS" : size === "md" || size === "lg" ? "S" : "M")

export function buttonMetrics(theme: Theme, size: ControlSize, shape: "round" | "square" = "round", uniform = false): Metrics {
  if (theme.isAndroid) {
    // Material 3 Expressive button sizes (Compose Button*Tokens); an icon button draws its icon at 24 from S up
    const m = MATERIAL_SIZE(size)
    const height = m === "XS" ? 32 : m === "S" ? 40 : 56
    const type = m === "M" ? materialType.titleMedium : materialType.labelLarge
    const square = m === "M" ? 16 : 12
    return {
      height,
      gutter: m === "XS" ? 12 : m === "S" ? 16 : 24,
      fontSize: type.fontSize,
      lineHeight: type.lineHeight,
      iconSize: uniform ? (m === "XS" ? 20 : 24) : m === "M" ? 24 : 20,
      gap: 8,
      radius: shape === "round" ? height / 2 : square,
      pressedRadius: m === "M" ? 12 : 8,
      indicator: m === "M" ? 24 : 20,
      weight: "medium",
    }
  }
  const height = theme.length(`--button-size-${size}`, 34)
  const radius = theme.length("--button-touch-radius", 9999)
  return {
    height,
    gutter: theme.length(`--button-gutter-${size}`, 12),
    fontSize: theme.length(`--button-font-size-${size}`, 17),
    lineHeight: theme.length(`--button-line-height-${size}`, 22),
    iconSize: theme.length(`--button-icon-size-${size}`, 20),
    gap: theme.length("--button-touch-gap", 8),
    radius: Math.min(radius, height / 2),
    pressedRadius: Math.min(radius, height / 2),
    indicator: theme.length(`--button-indicator-size-${size}`, 20),
    weight: theme.length("--button-font-weight", 400) >= 590 ? "semibold" : theme.length("--button-font-weight", 400) >= 500 ? "medium" : "regular",
  }
}

type Colors = { background: string; pressed: string; text: string; border?: string }

export function buttonColors(theme: Theme, color: ButtonColor, variant: ButtonVariant, disabled: boolean, selected: boolean): Colors {
  const c = (name: string) => theme.color(`--color-${name}`)
  const m = theme.material
  if (disabled) {
    if (theme.isAndroid) {
      return {
        background: variant === "solid" || variant === "soft" ? withAlpha(m.onSurface, 0.1) : "transparent",
        pressed: "transparent",
        text: withAlpha(m.onSurfaceVariant, 0.38),
        border: variant === "outline" ? withAlpha(m.onSurface, 0.12) : undefined,
      }
    }
    return {
      background: variant === "solid" || variant === "soft" ? theme.color("--button-mobile-disabled-background") : "transparent",
      pressed: "transparent",
      text: theme.colors.textDisabled,
      border: variant === "outline" ? theme.colors.border : undefined,
    }
  }
  if (theme.isAndroid && color === "primary") {
    // Plex primary is the neutral ink: Material's roles where they are neutral
    switch (variant) {
      case "solid":
        return { background: c("background-primary-solid"), pressed: c("background-primary-solid"), text: c("text-primary-solid") }
      case "soft":
        return selected
          ? { background: c("background-primary-solid"), pressed: c("background-primary-solid"), text: c("text-primary-solid") }
          : { background: m.secondaryContainer, pressed: m.secondaryContainer, text: m.onSecondaryContainer }
      case "outline":
        return selected
          ? { background: m.inverseSurface, pressed: m.inverseSurface, text: m.inverseOnSurface }
          : { background: "transparent", pressed: "transparent", text: m.onSurfaceVariant, border: m.outlineVariant }
      case "ghost":
        return { background: selected ? m.secondaryContainer : "transparent", pressed: "transparent", text: m.onSurface }
    }
  }
  switch (variant) {
    case "solid":
      return { background: c(`background-${color}-solid`), pressed: c(`background-${color}-solid-active`), text: c(`text-${color}-solid`) }
    case "soft":
      return selected
        ? { background: c(`background-${color}-solid`), pressed: c(`background-${color}-solid-active`), text: c(`text-${color}-solid`) }
        : { background: c(`background-${color}-soft`), pressed: c(`background-${color}-soft-active`), text: c(`text-${color}-soft`) }
    case "outline":
      return {
        background: selected ? c(`background-${color}-outline-active`) : "transparent",
        pressed: c(`background-${color}-outline-active`),
        text: c(`text-${color}-outline`),
        border: theme.isAndroid ? m.outlineVariant : c(`border-${color}-outline`),
      }
    case "ghost":
      return {
        background: selected ? c(`background-${color}-ghost-active`) : "transparent",
        pressed: c(`background-${color}-ghost-active`),
        text: c(`text-${color}-ghost`),
      }
  }
}

/** The colors of a button in a bar: glass labels, the prominent accent, Material's app bar actions. */
function barColors(
  theme: Theme,
  colors: Colors,
  { bar, prominent, neutral, disabled, variant }: { bar: BarItemStyle | null; prominent: boolean; neutral: boolean; disabled: boolean; variant: ButtonVariant },
): Colors {
  if (!bar) return colors
  if (theme.isAndroid) {
    // Material top app bar: actions in onSurfaceVariant, the navigation icon in onSurface
    return neutral && variant === "ghost" && !disabled ? { ...colors, text: theme.material.onSurfaceVariant } : colors
  }
  if (prominent) {
    return disabled
      ? { background: theme.color("--toolbar-prominent-disabled-background"), pressed: "transparent", text: theme.color("--toolbar-prominent-disabled-color") }
      : {
          background: theme.color("--toolbar-prominent-background"),
          pressed: theme.color("--toolbar-prominent-background-active"),
          text: theme.color("--toolbar-prominent-color"),
        }
  }
  if (neutral) {
    const pressed = bar.inGroup ? theme.color("--toolbar-group-item-active") : theme.color("--mobile-glass-background-active")
    return { background: "transparent", pressed, text: disabled ? theme.colors.labelTertiary : colors.text }
  }
  return colors
}

/** On Android a pressed button shows Material's state layer: its label color at 10% (the native ripple on a device). */
export function useMaterialPress(theme: Theme) {
  return theme.isAndroid && Platform.OS === "android"
}

/** The children with fragments opened, as the DOM would lay them out: a fragment adds no box. */
function flatten(children: ReactNode, out: ReactNode[] = []): ReactNode[] {
  // toArray keys the elements
  for (const child of Children.toArray(children)) {
    if (isValidElement(child) && child.type === Fragment) flatten((child as ReactElement<{ children?: ReactNode }>).props.children, out)
    else out.push(child)
  }
  return out
}

/** Strings and numbers in a row make one label ("Pressed {count}"); an element (an icon) stands on its own. */
function renderChildren(children: ReactNode, metrics: Metrics) {
  const out: ReactNode[] = []
  let label: (string | number)[] = []
  const flush = () => {
    if (!label.length) return
    out.push(
      <Text key={`label-${out.length}`} numberOfLines={1} weight={metrics.weight} style={{ fontSize: metrics.fontSize, lineHeight: metrics.lineHeight }}>
        {label.join("")}
      </Text>,
    )
    label = []
  }
  flatten(children).forEach((child, index) => {
    if (typeof child === "string" || typeof child === "number") {
      label.push(child)
    } else if (isValidElement(child)) {
      flush()
      // A child of a fragment keeps the key it had there; one without gets its place
      out.push(child.key == null ? <Fragment key={`child-${index}`}>{child}</Fragment> : child)
    }
  })
  flush()
  return out
}

/**
 * A button after the platform: an iOS 26 capsule (the native sizes of the Plex UI phone layer, its colors and glass)
 * or a Material 3 Expressive button on Android (filled for solid, tonal for soft, outlined, text for ghost). Props
 * follow @plexui/ui.
 */
export function Button({
  color = "primary",
  variant = "solid",
  size = "md",
  shape = "round",
  mobileMaterial,
  uniform = false,
  block = false,
  selected = false,
  loading = false,
  disabled = false,
  inert: inertProp = loading,
  iconSize,
  gutterSize,
  opticallyAlign,
  children,
  style,
  onPressIn,
  onPressOut,
  accessibilityState,
  ...rest
}: ButtonProps) {
  const theme = useTheme()
  const bar = useContext(BarItemContext)
  const sized = buttonMetrics(theme, size, shape, uniform)
  const base: Metrics = {
    ...sized,
    iconSize: iconSize ? theme.length(`--control-icon-size-${iconSize}`, sized.iconSize) : sized.iconSize,
    gutter: gutterSize ? theme.length(`--control-gutter-${gutterSize}`, sized.gutter) : sized.gutter,
  }
  const neutral = (color === "primary" || color === "secondary") && (variant === "soft" || variant === "ghost")
  const prominent = !!bar && bar.prominent !== false && theme.isIOS && variant === "solid" && (color === "primary" || color === "info")
  const metrics: Metrics =
    bar && theme.isIOS
      ? {
          ...base,
          height: bar.height,
          gutter: gutterSize ? base.gutter : bar.gutter,
          fontSize: bar.fontSize,
          lineHeight: bar.lineHeight,
          weight: prominent ? bar.prominentWeight : bar.weight,
          iconSize: iconSize ? base.iconSize : bar.iconSize,
          radius: bar.height / 2,
          pressedRadius: bar.height / 2,
        }
      : base
  const colors = barColors(theme, buttonColors(theme, color, variant, disabled, selected), { bar, prominent, neutral, disabled, variant })
  // In a bar every neutral soft or ghost button is glass, as on iOS 26, unless it asks to stay flat
  const wantsGlass = bar ? mobileMaterial !== "flat" && neutral && !bar.inGroup : mobileMaterial === "glass" && (variant === "soft" || variant === "ghost") && !disabled
  const glass = theme.isIOS && wantsGlass
  const nativeRipple = useMaterialPress(theme)
  const [pressed, setPressed] = useState(false)
  const [radius] = useState(() => new Animated.Value(metrics.radius))
  useEffect(() => radius.setValue(metrics.radius), [radius, metrics.radius])
  const animateRadius = (to: number) => {
    if (!theme.isAndroid || metrics.pressedRadius === metrics.radius) return
    Animated.timing(radius, { toValue: to, duration: theme.reducedMotion ? 0 : 150, useNativeDriver: false }).start()
  }
  const handleIn = (event: GestureResponderEvent) => {
    setPressed(true)
    animateRadius(metrics.pressedRadius)
    onPressIn?.(event)
  }
  const handleOut = (event: GestureResponderEvent) => {
    setPressed(false)
    animateRadius(metrics.radius)
    onPressOut?.(event)
  }
  const inert = disabled || inertProp
  const background = pressed && theme.isIOS ? colors.pressed : colors.background
  const shadow = prominent && !disabled ? theme.token("--toolbar-prominent-shadow") : undefined
  const minTarget = theme.isAndroid ? 48 : 44
  const hitSlop = Math.max(0, (minTarget - metrics.height) / 2)
  // Button.module.css: the gutter, or for an icon alone the space beside its icon
  const inset = uniform ? (metrics.height - metrics.iconSize) / 2 : metrics.gutter
  const body: ViewStyle = {
    height: metrics.height,
    minWidth: uniform ? metrics.height : undefined,
    width: uniform ? metrics.height : undefined,
    paddingHorizontal: uniform ? 0 : metrics.gutter,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: metrics.gap,
    alignSelf: block ? "stretch" : "flex-start",
    // The glass draws its own fill: a background here would cover it
    ...(glass ? null : { backgroundColor: background }),
    ...(opticallyAlign === "start" ? { marginStart: -inset } : opticallyAlign === "end" ? { marginEnd: -inset } : null),
    borderWidth: colors.border ? (theme.isAndroid ? 1 : StyleSheet.hairlineWidth * 2) : 0,
    borderColor: colors.border,
    overflow: prominent ? "visible" : "hidden",
    borderCurve: "continuous",
    boxShadow: typeof shadow === "string" ? shadow : undefined,
  }
  const content = (
    <TextColorProvider value={colors.text}>
      <IconDefaultsProvider size={metrics.iconSize} color={colors.text}>
        <View style={[styles.row, { gap: metrics.gap, opacity: loading ? 0 : 1 }]}>{renderChildren(children, metrics)}</View>
        {loading ? <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.text} size={metrics.indicator > 20 ? "large" : "small"} /> : null}
      </IconDefaultsProvider>
    </TextColorProvider>
  )
  const layer =
    theme.isAndroid && !nativeRipple && pressed && !inert ? (
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(colors.text, stateLayer.pressed) }]} />
    ) : null
  const pressable = {
    accessibilityRole: "button" as const,
    accessibilityState: { disabled: inert, selected, busy: loading, ...accessibilityState },
    // react-native-web reads the ARIA props, not accessibilityState
    "aria-selected": selected,
    "aria-busy": loading,
    disabled: inert,
    hitSlop,
    onPressIn: handleIn,
    onPressOut: handleOut,
    ...rest,
  }
  if (glass) {
    return (
      <Pressable {...pressable} style={[{ alignSelf: block ? "stretch" : "flex-start" }, style]}>
        <Glass interactive radius={metrics.radius} fillToken={pressed ? "--mobile-glass-background-active" : undefined} style={[body, { borderRadius: metrics.radius }]}>
          {content}
        </Glass>
      </Pressable>
    )
  }
  // The pressable is the body: the native ripple is drawn and clipped by the view that has the (animated) corners
  return (
    <AnimatedPressable
      {...pressable}
      android_ripple={nativeRipple ? { color: withAlpha(colors.text, stateLayer.pressed), foreground: true } : undefined}
      style={[body, { borderRadius: theme.isAndroid ? radius : metrics.radius }, style]}
    >
      {layer}
      {content}
    </AnimatedPressable>
  )
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
})
