import { createContext, Fragment, isValidElement, useContext, useEffect, useRef, useState, type ReactNode } from "react"
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
import { flattenChildren } from "../../internal/children"
import { Glass } from "../../internal/Glass"
import { useAndroidGlass } from "../../internal/BarBackdrop"
import { barShadow, stateLayer, withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
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
   * Android our steps around a 48dp button (32 up to sm, 40 at md and lg, the big 48 from xl).
   * @default "md"
   */
  size?: ControlSize
  /** Kept for the API of @plexui/ui: phone buttons are capsules on iOS and round on Android, as their platforms draw them. */
  pill?: boolean
  /** The shape on Android: a pill (default), as newer Android screens draw a button, or 8dp corners. */
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
  /** A selected (toggle) button's resting corners (the same as at rest on both platforms today). */
  selectedRadius: number
  indicator: number
  weight: "regular" | "medium" | "semibold"
}

/**
 * What a bar (Toolbar, the header of a sheet) asks of the buttons in it: on iOS the bar's item size, its label type and
 * icon size, glass for the neutral soft and ghost buttons (the capsule of a Group carries one glass for several) and
 * the accent for a solid primary one, the prominent bar button of iOS 26; on Android the glass circles and capsules
 * of an Android bar.
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
  /** The navigation side of a top bar (its leading items). */
  leading?: boolean
  /** Content stands under the bar (a top bar scrolled, a bottom bar with more below): its glass casts the raised shadow. */
  raised?: boolean
  /** The color of the screen under the bar: Android's see-through glass is solved against it. */
  canvas?: string
  /**
   * An opaque Android bar: its icons stand plain in their 48dp targets, with no circle of their own, and its prominent
   * action is the accent's ink, as Android's classic bars draw them.
   */
  plain?: boolean
}

export const BarItemContext = createContext<BarItemStyle | null>(null)

/**
 * A Toolbar's search field: a field in a bar's slot or row takes the bar's item height and the look of its buttons,
 * on iOS their glass with the toolbar's search tokens (Toolbar.module.css), on Android the glass of the bar's
 * search field. Null outside a bar.
 */
export const BarFieldContext = createContext<{
  height: number
  raised: boolean
  /** In a Toolbar.Row under the controls, not in the row of the controls (the Android search field under its bar). */
  row?: boolean
  /** The color of the screen under the bar. */
  canvas?: string
} | null>(null)

/** The control icon size a button size falls back to (Button.module.css). */
const CONTROL_ICON: Record<ControlSize, string> = { "3xs": "xs", "2xs": "sm", xs: "sm", sm: "md", md: "md", lg: "md", xl: "md", "2xl": "lg", "3xl": "lg" }

/**
 * The button steps on Android: a small one (32dp), the common one (40) and the big one of a screen (48). The Android
 * look shows only the big one (48dp, 44 in one empty view): the two under it are ours.
 */
const ANDROID_SIZE = (size: ControlSize) => (["3xs", "2xs", "xs", "sm"].includes(size) ? "XS" : size === "md" || size === "lg" ? "S" : "M")

export function buttonMetrics(theme: Theme, size: ControlSize, shape: "round" | "square" = "round", uniform = false): Metrics {
  if (theme.isAndroid) {
    // Android's buttons: the big one 48dp with a 14 Medium label, a pill in the redesigned screens (round) or 8dp
    // corners (square); the steps under it keep the label (14 at every step) and the shape. No shape morphs on a
    // press or a selection, as the Android look has none
    const step = ANDROID_SIZE(size)
    const height = step === "XS" ? 32 : step === "S" ? 40 : 48
    const corner = shape === "round" ? height / 2 : step === "XS" ? 6 : 8
    return {
      height,
      gutter: step === "XS" ? 12 : step === "S" ? 16 : 20,
      fontSize: 14,
      lineHeight: 20,
      iconSize: uniform ? (step === "XS" ? 18 : step === "S" ? 20 : 24) : step === "XS" ? 16 : 20,
      gap: step === "XS" ? 4 : 6,
      radius: corner,
      pressedRadius: corner,
      selectedRadius: corner,
      indicator: step === "M" ? 24 : 18,
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
    // Button.module.css: a size's own icon token where it has one (sm, 2xl and 3xl have none), else the control's
    iconSize: theme.length(`--button-icon-size-${size}`, theme.length(`--control-icon-size-${CONTROL_ICON[size]}`, 20)),
    gap: theme.length("--button-touch-gap", 8),
    radius: Math.min(radius, height / 2),
    pressedRadius: Math.min(radius, height / 2),
    selectedRadius: Math.min(radius, height / 2),
    indicator: theme.length(`--button-indicator-size-${size}`, 20),
    weight: theme.length("--button-font-weight", 400) >= 590 ? "semibold" : theme.length("--button-font-weight", 400) >= 500 ? "medium" : "regular",
  }
}

type Colors = {
  background: string
  /** The fill while pressed (iOS). */
  pressed: string
  text: string
  /** The label while pressed (iOS 27.2 lightens it toward white). */
  pressedText?: string
  border?: string
}

/** iOS 27.2's press: a color lightened toward white, 30% in light and 22% in dark (Button.module.css, phone). */
function lighten(theme: Theme, color: string): string {
  if (color === "transparent") return color
  const value = theme.value(`color-mix(in srgb, ${color}, #ffffff ${theme.scheme === "dark" ? 22 : 30}%)`)
  return typeof value === "string" ? value : color
}

/**
 * A button's press on iOS, as the phone CSS ports iOS 27.2: the label lightens; a solid fill lightens with it, a soft
 * or outline fill fades to 70%, and a ghost draws none. A glass button and a bar's keep their own (the caller).
 */
function iosPress(theme: Theme, variant: ButtonVariant, colors: Colors): Colors {
  const pressed = variant === "solid" ? lighten(theme, colors.background) : variant === "ghost" ? colors.background : withAlpha(colors.background, 0.7)
  return { ...colors, pressed, pressedText: lighten(theme, colors.text) }
}

export function buttonColors(theme: Theme, color: ButtonColor, variant: ButtonVariant, disabled: boolean, selected: boolean, uniform = false): Colors {
  const c = (name: string) => theme.color(`--color-${name}`)
  if (disabled) {
    if (theme.isAndroid) {
      // Android dims a disabled button's label to half and keeps its fill
      const enabled = buttonColors(theme, color, variant, false, selected, uniform)
      return { ...enabled, pressed: enabled.background, text: withAlpha(enabled.text, 0.5) }
    }
    // The phone CSS: the tertiary label in every style (iOS 27's disabled content-area button), the fill of a gray
    // button behind a solid or soft one
    return {
      background: variant === "solid" || variant === "soft" ? theme.color("--button-mobile-disabled-background") : "transparent",
      pressed: "transparent",
      text: theme.colors.labelTertiary,
      border: variant === "outline" ? theme.colors.border : undefined,
    }
  }
  const colors = ((): Colors => {
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
          border: c(`border-${color}-outline`),
        }
      case "ghost":
        return {
          background: selected ? c(`background-${color}-ghost-active`) : "transparent",
          pressed: c(`background-${color}-ghost-active`),
          text: c(`text-${color}-ghost`),
        }
    }
  })()
  return theme.isIOS ? iosPress(theme, variant, colors) : colors
}

/** The colors of a button in a bar: glass labels, the prominent accent, the bar's circles on Android. */
function barColors(
  theme: Theme,
  colors: Colors,
  { bar, prominent, neutral, disabled, selected, flat }: { bar: BarItemStyle | null; prominent: boolean; neutral: boolean; disabled: boolean; selected: boolean; flat: boolean },
): Colors {
  if (!bar) return colors
  if (theme.isAndroid && bar.plain) {
    // An opaque bar's items are plain: the glyph or label in the text color, the prominent one in the accent
    const ink = disabled ? withAlpha(theme.material.onSurface, 0.38) : prominent ? theme.material.primary : theme.material.onSurface
    return neutral || prominent ? { background: "transparent", pressed: "transparent", text: ink } : colors
  }
  if (theme.isAndroid) {
    // The bar's prominent action is in the accent, as iOS sets it
    // in the accent capsule: not the neutral ink of a solid primary button elsewhere
    if (prominent && !disabled) return { ...colors, background: theme.material.primary, pressed: theme.material.primary, text: theme.material.onPrimary }
    // Android's bar buttons: the glyph in the text color on the card of the circle (drawn by Button) or of a group;
    // a disabled prominent action goes back to the card, its glyph dimmed
    if ((neutral && !selected && (bar.inGroup || !flat)) || (prominent && disabled)) {
      return { background: "transparent", pressed: "transparent", text: disabled ? withAlpha(theme.material.onSurface, 0.38) : theme.material.onSurface }
    }
    return colors
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
  // A selected button keeps its fill, and so does a flat one standing on its own: only glass and a group's capsule
  // replace the fill
  if (neutral && !selected && (bar.inGroup || !flat)) {
    const pressed = bar.inGroup ? theme.color("--toolbar-group-item-active") : theme.color("--mobile-glass-background-active")
    return { background: "transparent", pressed, text: disabled ? theme.colors.labelTertiary : colors.text }
  }
  return colors
}

/** On Android a pressed button shows a layer of its label color at 10% (the native ripple on a device). */
export function useMaterialPress(theme: Theme) {
  return theme.isAndroid && Platform.OS === "android"
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
  flattenChildren(children).forEach((child, index) => {
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
 * or the Android button (a pill, 14 Medium, the Plex colors; a disabled one keeps its fill and dims its label to
 * half). Props follow @plexui/ui.
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
    // Android draws a bar's icons at 24dp whatever size the iOS glyph asks for
    iconSize: iconSize && !(theme.isAndroid && bar) ? theme.length(`--control-icon-size-${iconSize}`, sized.iconSize) : sized.iconSize,
    gutter: gutterSize ? theme.length(`--control-gutter-${gutterSize}`, sized.gutter) : sized.gutter,
  }
  const neutral = (color === "primary" || color === "secondary") && (variant === "soft" || variant === "ghost")
  // A solid primary button is a bar's prominent action, in the accent on both platforms; iOS also sets its label
  // weight, shadow and capsule
  const accentAction = !!bar && bar.prominent !== false && variant === "solid" && (color === "primary" || color === "info")
  const prominent = accentAction && theme.isIOS
  // A bar sets its buttons' size on both platforms: iOS 26's glass items, the bar circles on Android
  const metrics: Metrics =
    bar
      ? {
          ...base,
          height: bar.height,
          gutter: gutterSize ? base.gutter : bar.gutter,
          fontSize: bar.fontSize,
          lineHeight: bar.lineHeight,
          weight: prominent ? bar.prominentWeight : bar.weight,
          // A bar draws its glyphs at the toolbar's size, a small one (`iconSize="sm"`, a plus) at its own (Toolbar.module.css)
          iconSize: iconSize === "sm" && theme.isIOS ? theme.length("--toolbar-icon-size-sm", 23.56) : bar.iconSize,
          radius: bar.height / 2,
          pressedRadius: bar.height / 2,
        }
      : {
          ...base,
          // touch.css sets a filled, tinted or outlined label Medium (510) and a plain one Regular, as iOS 27.2 sets
          // its buttons on glass and its plain ones; the token alone gives the Regular of the plain button
          weight: theme.isIOS && variant !== "ghost" ? "medium" : base.weight,
        }
  const colors = barColors(theme, buttonColors(theme, color, variant, disabled, selected, uniform), { bar, prominent: accentAction, neutral, disabled, selected, flat: mobileMaterial === "flat" })
  // In a bar every neutral soft or ghost button is glass, as on iOS 26, unless it asks to stay flat or is selected.
  // A disabled glass button keeps its glass, as the phone CSS's
  const wantsGlass = bar ? mobileMaterial !== "flat" && neutral && !selected && !bar.inGroup : mobileMaterial === "glass" && neutral
  const glass = theme.isIOS && wantsGlass
  // On Android the same button stands on a glass of its own, as the Android bar circles: a see-through card with a
  // rim and a soft shadow (the glass of a plain bar)
  const card = theme.isAndroid && !!bar && !bar.plain && (wantsGlass || (accentAction && disabled && !bar.inGroup))
  const androidGlass = useAndroidGlass("bar", bar?.canvas)
  if (glass && !bar) {
    // The Liquid Glass text button of the iOS 27 kit: Medium (`--button-glass-font-weight`), 17/22 at md and lg
    const glassWeight = theme.length("--button-glass-font-weight", 510)
    metrics.weight = glassWeight >= 590 ? "semibold" : glassWeight >= 500 ? "medium" : "regular"
    if (size === "md" || size === "lg") {
      metrics.fontSize = theme.length("--button-glass-font-size", metrics.fontSize)
      metrics.lineHeight = theme.length("--button-glass-line-height", metrics.lineHeight)
    }
  }
  const nativeRipple = useMaterialPress(theme)
  const [pressed, setPressed] = useState(false)
  // The corners at rest: a selected Android button has morphed to its checked shape
  const resting = theme.isAndroid && selected ? metrics.selectedRadius : metrics.radius
  const [radius] = useState(() => new Animated.Value(resting))
  const animateRadius = (to: number) => {
    if (!theme.isAndroid) return
    Animated.timing(radius, { toValue: to, duration: theme.reducedMotion ? 0 : 150, useNativeDriver: false }).start()
  }
  // A change of selection or size sets the corners at once
  const wasSelected = useRef(selected)
  useEffect(() => {
    const morph = theme.isAndroid && wasSelected.current !== selected
    wasSelected.current = selected
    if (morph) Animated.timing(radius, { toValue: resting, duration: theme.reducedMotion ? 0 : 150, useNativeDriver: false }).start()
    else radius.setValue(resting)
  }, [radius, resting, selected, theme.isAndroid, theme.reducedMotion])
  const handleIn = (event: GestureResponderEvent) => {
    setPressed(true)
    if (metrics.pressedRadius !== resting) animateRadius(metrics.pressedRadius)
    onPressIn?.(event)
  }
  const handleOut = (event: GestureResponderEvent) => {
    setPressed(false)
    if (metrics.pressedRadius !== resting) animateRadius(resting)
    onPressOut?.(event)
  }
  const inert = disabled || inertProp
  const background = pressed && theme.isIOS ? colors.pressed : colors.background
  // A glass button keeps its own press: only its glass changes
  const text = pressed && !inert && theme.isIOS && !glass && colors.pressedText ? colors.pressedText : colors.text
  const shadow =
    prominent && !disabled
      ? theme.token("--toolbar-prominent-shadow")
      : theme.isAndroid && bar && !bar.plain && accentAction && !disabled
        ? barShadow(theme.scheme)
        : undefined
  const minTarget = theme.isAndroid ? 48 : 44
  const hitSlop = Math.max(0, (minTarget - metrics.height) / 2)
  // Button.module.css: the gutter, or for an icon alone the space beside its icon
  const inset = uniform ? (metrics.height - metrics.iconSize) / 2 : metrics.gutter
  // An icon in a group's capsule takes the group's 38dp slot, a circle of its own the bar's height
  const width = uniform ? (theme.isAndroid && bar?.inGroup ? 38 : metrics.height) : undefined
  // Android's press on a bar's icon: its borderless ripple, a 40dp circle (20dp radius) centered on the icon, a little
  // wider than a group's slot; a label in a bar takes the press in its own shape
  const dot = theme.isAndroid && bar && uniform && width ? 40 : 0
  const body: ViewStyle = {
    // A least height, not a fixed one: a label at a large text size grows the button rather than being cut
    minHeight: metrics.height,
    minWidth: width,
    width,
    paddingHorizontal: uniform ? 0 : metrics.gutter,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: metrics.gap,
    alignSelf: block ? "stretch" : "flex-start",
    // The glass draws its own fill: a background here would cover it
    // An Android bar's glass (with its blur on the web) is laid over this style
    ...(glass ? null : { backgroundColor: background }),
    ...(opticallyAlign === "start" ? { marginStart: -inset } : opticallyAlign === "end" ? { marginEnd: -inset } : null),
    borderWidth: colors.border ? StyleSheet.hairlineWidth * 2 : 0,
    borderColor: colors.border,
    // The press circle of a group's icon reaches past its slot
    overflow: prominent || (dot && bar?.inGroup) ? "visible" : "hidden",
    borderCurve: "continuous",
    boxShadow: typeof shadow === "string" ? shadow : undefined,
  }
  const content = (
    <TextColorProvider value={text}>
      <IconDefaultsProvider size={metrics.iconSize} color={text}>
        <View style={[styles.row, { gap: metrics.gap, opacity: loading ? 0 : 1 }]}>{renderChildren(children, metrics)}</View>
        {loading ? <ActivityIndicator style={StyleSheet.absoluteFill} color={text} size={metrics.indicator > 20 ? "large" : "small"} /> : null}
      </IconDefaultsProvider>
    </TextColorProvider>
  )
  // Android's press in a bar is its ink at 7% (#121A1D21); elsewhere Material's pressed state layer
  const pressLayer = withAlpha(colors.text, theme.isAndroid && bar ? 0.07 : stateLayer.pressed)
  const layer =
    theme.isAndroid && !nativeRipple && pressed && !inert ? (
      <View
        pointerEvents="none"
        style={[
          dot && width
            ? { position: "absolute", width: dot, height: dot, borderRadius: dot / 2, top: (metrics.height - dot) / 2, start: (width - dot) / 2 }
            : StyleSheet.absoluteFill,
          { backgroundColor: pressLayer },
        ]}
      />
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
        <Glass interactive={!inert} elevation={bar?.raised ? "raised" : "regular"} radius={metrics.radius} fillToken={pressed && !inert ? "--mobile-glass-background-active" : undefined} style={[body, { borderRadius: metrics.radius }]}>
          {content}
        </Glass>
      </Pressable>
    )
  }
  // The pressable is the body: the native ripple is drawn and clipped by the view that has the (animated) corners
  return (
    <AnimatedPressable
      {...pressable}
      android_ripple={
        nativeRipple ? { color: pressLayer, foreground: true, ...(dot ? { borderless: true, radius: dot / 2 } : null) } : undefined
      }
      style={[body, card ? androidGlass : null, { borderRadius: theme.isAndroid ? radius : metrics.radius }, style]}
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
