import { createContext, Fragment, isValidElement, useContext, useEffect, useState, type ReactNode } from "react"
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import Svg, { Circle } from "react-native-svg"
import { flattenChildren } from "../../internal/children"
import { Glass } from "../../internal/Glass"
import { useAndroidGlass } from "../../internal/BarBackdrop"
import { useRipple } from "../../internal/ripple"
import { curves } from "../../internal/motion"
import { accentText, barShadow, controlHighlight, dangerText, stateLayer, withAlpha } from "../../theme/material"
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
  /** A bottom bar's item (Android: a confirm there keeps its circle, not a top bar's text pill). */
  bottom?: boolean
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

/**
 * A ghost Button in a List: in its `header` it is the list header's text action, in a `row` (a Button among a List's
 * rows) the row is the button, as the web's ghost Button in a FieldGroup's header or in a `[data-row]`. Null elsewhere.
 */
export type ListAction = "header" | "row"
export const ListActionContext = createContext<ListAction | null>(null)

/** The control icon size a button size falls back to (Button.module.css). */
const CONTROL_ICON: Record<ControlSize, string> = { "3xs": "xs", "2xs": "sm", xs: "sm", sm: "md", md: "md", lg: "md", xl: "md", "2xl": "lg", "3xl": "lg" }

/**
 * The button steps on Android: a small one (32dp), the common one (40) and the big one of a screen (48). The Android
 * look shows only the big one (48dp, 44 in one empty view): the two under it are ours.
 */
const ANDROID_SIZE = (size: ControlSize) => (["3xs", "2xs", "xs", "sm"].includes(size) ? "XS" : size === "md" || size === "lg" ? "S" : "M")

export function buttonMetrics(theme: Theme, size: ControlSize, shape: "round" | "square" = "round", uniform = false): Metrics {
  if (theme.isAndroid) {
    // Android's buttons: the big one 48dp with a 15 Medium label, a pill in the redesigned screens (round) or 8dp
    // corners (square); the steps under it keep the shape and a 14 label. No shape morphs on a press or a selection,
    // as the Android look has none
    const step = ANDROID_SIZE(size)
    const height = step === "XS" ? 32 : step === "S" ? 40 : 48
    const corner = shape === "round" ? height / 2 : step === "XS" ? 6 : 8
    return {
      height,
      gutter: step === "XS" ? 12 : step === "S" ? 16 : 20,
      fontSize: step === "M" ? 15 : 14,
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

/** Android's list selector, the press of a filled button: black at 0x0F of 255, white at 0x0D at night. */
const listSelector = (scheme: Theme["scheme"]) => (scheme === "dark" ? "rgba(255, 255, 255, 0.051)" : "rgba(0, 0, 0, 0.059)")

/** Material's standard curve, on which the spinner's arc surges. */
const standard = Easing.bezier(0.4, 0, 0.2, 1)
/**
 * Android's spinner over one 5400ms cycle: the arc's head turns 1520° and makes four surges of 250°, 667ms each,
 * 1350ms apart; its tail turns 20° behind the head's steady turn and makes the same surges 667ms later.
 */
const SPIN = { cycle: 5400, turn: 1520, lag: 20, surge: 250, surgeTime: 667, surgeEvery: 1350, surges: 4 }
/** The spinner's 2.25dp stroke runs on a circle 18dp across plus half the stroke, as Android lays its drawable out. */
const SPINNER_STROKE = 2.25
const SPINNER_RING = 18 + SPINNER_STROKE / 2
const SPINNER_BOX = SPINNER_RING + SPINNER_STROKE
const SPINNER_LENGTH = Math.PI * SPINNER_RING

/** The spinner at `t` ms into its cycle: how far its tail has turned and how long its arc is, in degrees. */
function spinnerAt(t: number) {
  const surges = (delay: number) => {
    let total = 0
    for (let index = 0; index < SPIN.surges; index++) {
      const from = delay + index * SPIN.surgeEvery
      total += standard(Math.min(1, Math.max(0, (t - from) / SPIN.surgeTime))) * SPIN.surge
    }
    return total
  }
  const head = (t / SPIN.cycle) * SPIN.turn + surges(0)
  // The tail stands still until the head is 20° on
  const lagTime = (SPIN.lag * SPIN.cycle) / SPIN.turn
  const tail = Math.max(0, (t - lagTime) / (SPIN.cycle - lagTime)) * (SPIN.turn - SPIN.lag) + surges(SPIN.surgeTime)
  return { tail, arc: head - tail }
}

/**
 * Android's loading spinner: the arc's start and its length run on one clock that loops every 5.4s. The arc is redrawn
 * from the clock on each frame (an animated SVG prop does not reach the element on the web).
 */
function Spinner({ color }: { color: string }) {
  const [t, setT] = useState(0)
  useEffect(() => {
    const time = new Animated.Value(0)
    const id = time.addListener(({ value }) => setT(value))
    const loop = Animated.loop(Animated.timing(time, { toValue: SPIN.cycle, duration: SPIN.cycle, easing: Easing.linear, useNativeDriver: false }))
    loop.start()
    return () => {
      loop.stop()
      time.removeListener(id)
    }
  }, [])
  const { tail, arc } = spinnerAt(t)
  return (
    // The circle's stroke starts at 3 o'clock and runs clockwise, as Android's arcs
    <View style={{ width: SPINNER_BOX, height: SPINNER_BOX, transform: [{ rotate: `${tail}deg` }] }}>
      <Svg width={SPINNER_BOX} height={SPINNER_BOX}>
        <Circle
          cx={SPINNER_BOX / 2}
          cy={SPINNER_BOX / 2}
          r={SPINNER_RING / 2}
          fill="none"
          stroke={color}
          strokeWidth={SPINNER_STROKE}
          strokeLinecap="round"
          // One dash as long as the arc, the rest of the circle a gap
          strokeDasharray={[SPINNER_LENGTH, SPINNER_LENGTH]}
          strokeDashoffset={SPINNER_LENGTH * (1 - arc / 360)}
        />
      </Svg>
    </View>
  )
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
 * half). Props follow @plexui/ui. A ghost Button in a List's header or among its rows is drawn as the list's text action
 * (`ListActionContext`).
 */
export function Button(props: ButtonProps) {
  const list = useContext(ListActionContext)
  const bar = useContext(BarItemContext)
  if (list != null && bar == null && props.variant === "ghost") return <ListActionButton {...props} place={list} />
  return <ButtonBody {...props} />
}

/**
 * A ghost Button as a List draws an action. In a row (iOS 27.2's button cell): the row's 17/22 Regular words where a
 * row's label starts, tinted (the accent for `primary`, `secondary` and `info`, red for `danger`), an icon after them at
 * the row's trailing edge, the row's press fill, no chevron; on Android a 50dp row with the 16sp words 20 in, in the
 * accent or the error color, pressed in the list selector. In a header: iOS's list header action, tinted 17/22 text on
 * the title's line with a 44pt target; Android's 14sp Medium in the accent on the header's line. `style` reaches the
 * row (`justifyContent: "center"` centres the words, as the web's `data-align="center"`).
 */
function ListActionButton({
  place,
  color = "primary",
  disabled = false,
  loading = false,
  inert: inertProp = loading,
  children,
  style,
  onPressIn,
  onPressOut,
  accessibilityState,
  ...rest
}: ButtonProps & { place: ListAction }) {
  const theme = useTheme()
  const android = theme.isAndroid
  const [pressed, setPressed] = useState(false)
  const inert = disabled || inertProp
  const row = place === "row"
  const tinted = color === "primary" || color === "secondary" || color === "info"
  const base =
    color === "danger"
      ? android
        ? dangerText(theme)
        : theme.color("--color-text-danger")
      : tinted
        ? android
          ? accentText(theme)
          : // The web's phone rows tint an action with the info text (#0169cc, blue-200 in the dark)
            theme.color("--color-text-info", theme.colors.accent)
        : buttonColors(theme, color, "ghost", false, false).text
  const ink = disabled ? (android ? withAlpha(base, 0.5) : theme.colors.labelTertiary) : !row && pressed && !android ? lighten(theme, base) : base
  // Android: a row's words 16/20, a header's 15/20 Medium (the web's FieldGroup header action)
  const type = android
    ? row
      ? { fontSize: 16, lineHeight: 20 }
      : { fontSize: 15, lineHeight: 20 }
    : row
      ? { fontSize: theme.length("--field-row-label-font-size", 17), lineHeight: theme.length("--field-row-label-line-height", 22) }
      : { fontSize: theme.length("--field-group-title-font-size", 17), lineHeight: theme.length("--field-group-title-line-height", 22) }
  const parts = flattenChildren(children)
  // Words and then an icon: the words take the room, so the icon ends the row
  const trailingIcon = row && parts.length > 1 && isValidElement(parts[parts.length - 1])
  const content = parts.map((part, index) =>
    typeof part === "string" || typeof part === "number" ? (
      <Text key={`label-${index}`} weight={android && !row ? "medium" : "regular"} numberOfLines={row ? undefined : 1} style={[type, trailingIcon && index < parts.length - 1 ? styles.grow : null]}>
        {part}
      </Text>
    ) : (
      <Fragment key={`part-${index}`}>{part}</Fragment>
    ),
  )
  const fill = row && pressed && !inert ? (android ? controlHighlight(theme.scheme) : theme.color("--field-row-press-background")) : undefined
  // The header's words stand on the title's line: their target reaches over and under it to 44 (48 on Android)
  const reach = row ? 0 : Math.max(0, ((android ? 48 : 44) - type.lineHeight) / 2)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inert, busy: loading, ...accessibilityState }}
      aria-busy={loading}
      disabled={inert}
      hitSlop={row ? undefined : { top: reach, bottom: reach, left: 8, right: 8 }}
      onPressIn={(event) => {
        setPressed(true)
        onPressIn?.(event)
      }}
      onPressOut={(event) => {
        setPressed(false)
        onPressOut?.(event)
      }}
      {...rest}
      style={[
        styles.row,
        row
          ? { alignSelf: "stretch", justifyContent: "flex-start", minHeight: android ? 50 : theme.length("--field-row-min-height", 52), paddingHorizontal: android ? 21 : theme.length("--list-row-inset", 20), gap: 8 }
          : { flexShrink: 0, gap: 4 },
        fill ? { backgroundColor: fill } : null,
        !row && android && pressed && !inert ? { opacity: 0.6 } : null,
        style,
      ]}
    >
      <TextColorProvider value={ink}>
        {/* A row's symbol is 24 (`--field-row-icon-symbol-size`), as the arrow of a link that leaves the app */}
        <IconDefaultsProvider size={android ? 24 : row ? theme.length("--field-row-icon-symbol-size", 24) : theme.length("--control-icon-size-md", 20)} color={ink}>
          {loading ? <ActivityIndicator color={ink} size="small" /> : content}
        </IconDefaultsProvider>
      </TextColorProvider>
    </Pressable>
  )
}

function ButtonBody({
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
  const android = theme.isAndroid
  const still = theme.reducedMotion
  const [pressed, setPressed] = useState(false)
  // The corners: a selected Android button keeps its checked shape. The radii at rest, pressed and selected are the
  // same on both platforms, so the corners never morph
  const corners = android && selected ? metrics.selectedRadius : metrics.radius
  // An icon in a group's capsule takes the group's 38dp slot, a circle of its own the bar's height
  const width = uniform ? (android && bar?.inGroup ? 38 : metrics.height) : undefined
  // Android's press on a bar's icon: its borderless ripple, a 40dp circle (20dp radius) centered on the icon, inside
  // a 46dp glass circle and a little wider than a group's slot (the reference's selector of mask 1, radius 20); a label
  // in a bar ripples in its own pill
  const dot = android && bar && uniform && width ? 40 : 0
  // Android's press of a button standing on its own (a bar's have none): it shrinks to 0.98 in 80ms on the default
  // curve and comes back on release in 350ms on an overshoot of 1.2, just past its size and back
  const scales = android && !bar
  const [scale] = useState(() => new Animated.Value(1))
  const scaleTo = (down: boolean) => {
    if (!scales) return
    scale.stopAnimation()
    if (still) return scale.setValue(down ? 0.98 : 1)
    Animated.timing(
      scale,
      down
        ? { toValue: 0.98, duration: 80, easing: curves.accelerateDecelerate, useNativeDriver: false }
        : { toValue: 1, duration: 350, easing: curves.overshoot(1.2), useNativeDriver: false },
    ).start()
  }
  // Android's press in a bar: the list selector on its glass circles and pills, the content color at 20% on an accent
  // one, the ink at 7% (#121A1D21) in a plain bar; a filled button's is the list selector; any other's Material's
  // pressed state layer of its label
  const pressLayer =
    android && bar
      ? bar.plain
        ? withAlpha(colors.text, 0.07)
        : accentAction
          ? withAlpha(colors.text, 0.2)
          : listSelector(theme.scheme)
      : android && variant === "solid"
        ? listSelector(theme.scheme)
        : withAlpha(colors.text, stateLayer.pressed)
  // Android's press: the ripple from the touch point, the platform's on a device and drawn here on the web, in the
  // button's shape (its corners clip it) or a bar's bare icon's 40dp circle
  const ripple = useRipple(
    pressLayer,
    android && !nativeRipple,
    still,
    dot && width ? { width: dot, height: dot, borderRadius: dot / 2, top: (metrics.height - dot) / 2, start: (width - dot) / 2 } : undefined,
  )
  const handleIn = (event: GestureResponderEvent) => {
    setPressed(true)
    scaleTo(true)
    if (android && !nativeRipple && !(disabled || inertProp)) ripple.start(event)
    onPressIn?.(event)
  }
  const handleOut = (event: GestureResponderEvent) => {
    setPressed(false)
    scaleTo(false)
    ripple.end()
    onPressOut?.(event)
  }
  const inert = disabled || inertProp
  const background = pressed && theme.isIOS ? colors.pressed : colors.background
  // A glass button keeps its own press: only its glass changes
  const text = pressed && !inert && theme.isIOS && !glass && colors.pressedText ? colors.pressedText : colors.text
  // Android fades a button on its own between enabled and disabled in 300ms on its default curve: its fill stays and
  // its label goes to half, so the label keeps its enabled color under an opacity. A bar's buttons change at once
  const fades = android && !bar
  const ink = fades && disabled ? buttonColors(theme, color, variant, false, selected, uniform).text : text
  const [dim] = useState(() => new Animated.Value(fades && disabled ? 0.5 : 1))
  useEffect(() => {
    const to = fades && disabled ? 0.5 : 1
    if (still || !fades) {
      dim.stopAnimation()
      dim.setValue(to)
      return
    }
    const animation = Animated.timing(dim, { toValue: to, duration: 300, easing: curves.accelerateDecelerate, useNativeDriver: false })
    animation.start()
    return () => animation.stop()
  }, [dim, disabled, fades, still])
  // Android's loading, both ways in 320ms on an ease-out quint: the label rises 24dp, flattens to 60% toward the
  // button's top and fades out, as the spinner rises 24dp into its place and fades in
  const [swap] = useState(() => new Animated.Value(loading ? 1 : 0))
  // The spinner stays while it leaves
  const [leaving, setLeaving] = useState(false)
  const [wasLoading, setWasLoading] = useState(loading)
  if (wasLoading !== loading) {
    setWasLoading(loading)
    setLeaving(!loading && android && !still)
  }
  useEffect(() => {
    const to = loading ? 1 : 0
    if (!android || still) {
      swap.stopAnimation()
      swap.setValue(to)
      return
    }
    const animation = Animated.timing(swap, { toValue: to, duration: 320, easing: curves.easeOutQuint, useNativeDriver: false })
    animation.start(({ finished }) => {
      if (finished && !loading) setLeaving(false)
    })
    return () => animation.stop()
  }, [android, loading, still, swap])
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
  // The label scales from the button's top edge: on Android its row spans the button's height
  const labelMotion = android
    ? {
        opacity: Animated.multiply(dim, swap.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })),
        transform: [{ translateY: swap.interpolate({ inputRange: [0, 1], outputRange: [0, -24] }) }, { scaleY: swap.interpolate({ inputRange: [0, 1], outputRange: [1, 0.6] }) }],
      }
    : { opacity: loading ? 0 : 1 }
  const spinner = android ? (
    loading || leaving ? (
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.row, { opacity: swap, transform: [{ translateY: swap.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }]}>
        <Spinner color={ink} />
      </Animated.View>
    ) : null
  ) : loading ? (
    <ActivityIndicator style={StyleSheet.absoluteFill} color={text} size={metrics.indicator > 20 ? "large" : "small"} />
  ) : null
  const content = (
    <TextColorProvider value={ink}>
      <IconDefaultsProvider size={metrics.iconSize} color={ink}>
        <Animated.View style={[styles.row, android ? styles.fromTop : null, { gap: metrics.gap }, labelMotion]}>{renderChildren(children, metrics)}</Animated.View>
        {spinner}
      </IconDefaultsProvider>
    </TextColorProvider>
  )
  const layer = ripple.layer
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
      style={[body, card ? androidGlass : null, { borderRadius: corners }, scales ? { transform: [{ scale }] } : null, style]}
    >
      {layer}
      {content}
    </AnimatedPressable>
  )
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  fromTop: { alignSelf: "stretch", transformOrigin: "top" },
  grow: { flexGrow: 1, flexShrink: 1 },
})
