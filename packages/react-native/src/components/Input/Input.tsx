import { createContext, useCallback, useContext, useEffect, useRef, useState, type ComponentRef, type ReactNode, type Ref } from "react"
import {
  Animated,
  Easing,
  PixelRatio,
  Platform,
  Pressable,
  StyleSheet,
  Text as NativeText,
  TextInput,
  View,
  processColor,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type ViewProps,
  type ViewStyle,
} from "react-native"
import XCircleFilled from "../../icons/plex/XCircleFilled"
import { useAndroidGlass } from "../../internal/BarBackdrop"
import { FieldStack, FloatLabelContext } from "../../internal/fieldStack"
import { Glass } from "../../internal/Glass"
import { useRTL } from "../../internal/direction"
import { springTo, stiffSpring } from "../../internal/motion"
import { RowEndContext } from "../../internal/row"
import { androidGray, barShadow, barSurface, withAlpha, dangerText, stateLayer } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { BarFieldContext, type ControlSize } from "../Button/Button"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { MaterialCancel, MaterialClose } from "../Icon/material"

export type InputVariant = "outline" | "soft" | "ghost"

export type InputProps = Omit<TextInputProps, "editable" | "style"> & {
  /**
   * On Android `outline` is the outlined field, `soft` a field filled with the text color at 5%, `ghost` a card's
   * bare field; a `soft` field with a `startAdornment` (a magnifier) and no label is the Android search field, a 40dp
   * pill. @default "outline"
   */
  variant?: InputVariant
  /** @default "md" (44pt on a phone, as every phone control) */
  size?: ControlSize
  disabled?: boolean
  invalid?: boolean
  /** Shows a clear button while the field has a value; called when it is pressed. */
  onClear?: () => void
  startAdornment?: ReactNode
  endAdornment?: ReactNode
  /** A capsule. */
  pill?: boolean
  style?: StyleProp<ViewStyle>
  testID?: string
}

type FrameState = { focused: boolean; filled: boolean; disabled: boolean; invalid: boolean }

/**
 * The line around (outlined) or under (filled) an Android field. Drawn as a layer over the field, not as the field's
 * border, so the field keeps its height and its content does not move when the line thickens on focus (Compose draws it
 * inside the container the same way).
 */
export type FieldFrame = { outlined: boolean; color: string; width: number; radius: number }

/**
 * The phone layer's field at each size: Input.module.css's size table under touch.css's phone rules, which give every
 * size 17pt text and a 14pt gutter (11 beside a start adornment, `html [data-slot="input"]`, scoped rules with no root
 * token) and give 3xs to xs the height and gap of sm, as 22 to 26pt could not hold the 17pt text.
 */
const IOS_FIELD: Record<ControlSize, { height: ControlSize; radius: "sm" | "md" | "lg" | "xl"; gap: "md" | "lg"; adornmentOffset: number }> = {
  "3xs": { height: "sm", radius: "sm", gap: "md", adornmentOffset: -1 },
  "2xs": { height: "sm", radius: "sm", gap: "md", adornmentOffset: -1 },
  xs: { height: "sm", radius: "sm", gap: "md", adornmentOffset: -1 },
  sm: { height: "sm", radius: "sm", gap: "md", adornmentOffset: -1 },
  md: { height: "md", radius: "md", gap: "md", adornmentOffset: -2 },
  lg: { height: "lg", radius: "lg", gap: "md", adornmentOffset: -2 },
  xl: { height: "xl", radius: "xl", gap: "lg", adornmentOffset: -2 },
  "2xl": { height: "2xl", radius: "xl", gap: "lg", adornmentOffset: -4 },
  "3xl": { height: "3xl", radius: "xl", gap: "lg", adornmentOffset: -4 },
}
/** The kit's own values of the tokens the table reads, for a theme without them. */
const IOS_RADIUS = { sm: 6, md: 8, lg: 10, xl: 12 }
const IOS_GAP = { md: 8, lg: 10 }

/** Android's outlined line with focus: 1.5dp (the reference's focused field). */
const FOCUS_LINE = 1.5

/** Android's idle outlined line: 0.5dp, at least 2 device pixels (1 on a 1x screen). */
function hairline() {
  const ratio = PixelRatio.get()
  return Math.max(Math.min(2, ratio) / ratio, 0.5)
}

/** Android's field motion: the label's float, the line's width and the colors, a spring of stiffness 500 with no bounce. */
const FIELD_SPRING = stiffSpring(500)

/** A color's channels as Animated.Color springs them; undefined for one React Native cannot read. */
function rgbaOf(color: string) {
  const value = processColor(color)
  if (typeof value !== "number") return undefined
  const argb = value >>> 0
  return { r: (argb >>> 16) & 255, g: (argb >>> 8) & 255, b: argb & 255, a: (argb >>> 24) / 255 }
}

/**
 * A color that springs to each new `color` at `stiffness` with no bounce, every channel on the same spring, so a change
 * on the way carries on from where it stands. At once when `instant` (reduced motion, or a color nothing draws).
 */
export function useSpringColor(color: string, stiffness: number, instant: boolean) {
  const [value] = useState(() => new Animated.Color(color))
  useEffect(() => {
    const to = rgbaOf(color)
    if (instant || !to) value.setValue(color)
    else Animated.spring(value, { toValue: to, ...stiffSpring(stiffness), useNativeDriver: false }).start()
  }, [color, stiffness, instant, value])
  return value
}

/** The look of a field on this platform: its box, text and colors. Shared by Input, TextField and Select. */
export function fieldLook(
  theme: Theme,
  {
    variant,
    size,
    pill,
    startAdornment = false,
    bar = null,
    label = false,
    search = false,
  }: {
    variant: InputVariant
    size: ControlSize
    pill: boolean
    startAdornment?: boolean
    bar?: { height: number; raised: boolean; row?: boolean } | null
    /** Android: the field has a floating label, so it is 56dp tall. */
    label?: boolean
    /** Android: the pill search field (40dp) of a screen or a sheet; a bar's own field, in or under it, is `bar`. */
    search?: boolean
  },
  state: FrameState,
) {
  if (theme.isAndroid) {
    const m = theme.material
    if (search) {
      // Android's search field: a 40dp pill of the text color at 5% (7% in dark mode), a 24dp
      // magnifier 12dp in and the text 48dp in, Regular 15, the hint at 50%, the icons at 60%, the caret in the accent
      const off = withAlpha(m.onSurface, 0.38)
      const icon = state.disabled ? off : withAlpha(m.onSurface, 0.6)
      return {
        box: { minHeight: 40, borderRadius: 20, backgroundColor: withAlpha(m.onSurface, theme.scheme === "dark" ? 0.07 : 0.05) } as ViewStyle,
        glass: false,
        frame: null as FieldFrame | null,
        gap: 12,
        text: { fontSize: 15, lineHeight: 20, color: state.disabled ? off : m.onSurface },
        placeholder: withAlpha(m.onSurface, 0.5),
        icon,
        trailingIcon: icon,
        caret: m.primary,
        iconSize: 24,
        clearSize: 24,
        clearTarget: 48,
        adornmentOffset: 0,
        height: 40,
        gutter: 12,
      }
    }
    if (bar) {
      // A Toolbar's search field, in its bar or in a row under it, as Android draws the bar's search: a capsule at the
      // bar's 46dp (drawn in the glass of its circles by InputField), the text Regular 18 from 18dp in, the hint a
      // field's (#A8A8A8 on white: the text at 38%), the caret in the text color, no magnifier of its own
      const off = withAlpha(m.onSurface, 0.38)
      return {
        box: { minHeight: bar.height, borderRadius: bar.height / 2, backgroundColor: barSurface(m, theme.scheme), boxShadow: barShadow(theme.scheme) } as ViewStyle,
        glass: false,
        frame: null as FieldFrame | null,
        gap: 10,
        text: { fontSize: 18, lineHeight: 24, color: state.disabled ? off : m.onSurface },
        placeholder: withAlpha(m.onSurface, 0.38),
        icon: state.disabled ? off : m.onSurfaceVariant,
        trailingIcon: state.disabled ? off : m.onSurface,
        caret: m.onSurface,
        iconSize: 24,
        clearSize: 24,
        clearTarget: bar.height,
        adornmentOffset: 0,
        height: bar.height,
        gutter: 18,
      }
    }
    // Android's fields: `outline` is the outlined field (radius 8, a hairline in a light gray that thickens to 1.5dp in
    // the accent on focus, the label floating on the top line, the text 16), `soft` a field filled with the text color
    // at 5% (the chips' and sheets' search fields), `ghost` the bare field of a card (the text 17, 22 in). The hint is
    // a light gray (#A8A8A8, #7D7D7D at night); a field is 50dp (a row's height), 56 with a label; disabled dims it to
    // 50%. Focused, the line and the label take the accent, its lighter text in dark mode (#6EB2EF)
    const outlined = variant === "outline"
    const ghost = variant === "ghost"
    const accent = state.invalid ? dangerText(theme) : state.focused ? focusAccent(theme) : null
    const height = label ? 56 : 50
    const radius = pill ? height / 2 : 8
    // The idle line: a hairline in a light gray (#DBDBDB), the text at 24% in dark mode
    const idle = androidGray(theme, "fieldLine")
    const frame: FieldFrame | null = outlined
      ? { outlined: true, color: accent ?? idle, width: state.focused && !state.disabled ? FOCUS_LINE : hairline(), radius }
      : state.invalid
        ? // A field with no line of its own shows an error as Android's underline does: 2dp in the error color
          ghost
          ? { outlined: false, color: dangerText(theme), width: 2, radius: 0 }
          : { outlined: true, color: dangerText(theme), width: FOCUS_LINE, radius }
        : null
    const box: ViewStyle = {
      minHeight: height,
      borderRadius: ghost ? 0 : radius,
      backgroundColor: variant === "soft" ? withAlpha(m.onSurface, 0.05) : "transparent",
      opacity: state.disabled ? 0.5 : 1,
    }
    const hint = androidGray(theme, "hint")
    return {
      box,
      glass: false,
      frame,
      gap: 12,
      text: { fontSize: outlined ? 16 : 17, lineHeight: 20, color: m.onSurface },
      placeholder: hint,
      icon: m.onSurfaceVariant,
      trailingIcon: state.invalid ? dangerText(theme) : m.onSurfaceVariant,
      // A card's bare field takes the caret in the text color (a card's edit row), the others the accent
      caret: state.invalid ? dangerText(theme) : ghost ? m.onSurface : m.primary,
      iconSize: 24,
      clearSize: 24,
      // A 48dp touch slot for a trailing icon
      clearTarget: 48,
      adornmentOffset: 0,
      height,
      // A card's bare field stands 22dp in, as a card's input row; the others 14
      gutter: ghost ? 22 : 14,
    }
  }
  if (bar) {
    // A Toolbar's search field (Toolbar.module.css, iOS 26 kit Search Top and Bottom): the bar's item height, the
    // glass of its buttons, the bar's magnifier in the label color, its text Regular at the bar's label size
    const gutter = theme.length("--toolbar-search-gutter", 10.54)
    return {
      box: {
        minHeight: bar.height,
        borderRadius: bar.height / 2,
        paddingHorizontal: gutter,
        borderCurve: "continuous",
        opacity: state.disabled ? 0.5 : 1,
      } as ViewStyle,
      glass: true,
      gap: theme.length("--toolbar-search-icon-gap", 6.43),
      text: {
        fontSize: theme.length("--toolbar-label-font-size", 17),
        lineHeight: theme.length("--toolbar-label-line-height", 22),
        color: theme.color("--input-text-color", theme.colors.text),
      },
      placeholder: theme.color("--toolbar-search-placeholder-color", theme.colors.textTertiary),
      icon: theme.color("--color-text", theme.colors.text),
      frame: null as FieldFrame | null,
      trailingIcon: theme.color("--mobile-label-secondary"),
      caret: theme.color("--color-background-accent-solid"),
      iconSize: theme.length("--toolbar-search-icon-size", 23.75),
      clearSize: 17 * 1.2,
      clearTarget: theme.length("--input-clear-target-size", 44),
      adornmentOffset: 0,
      height: bar.height,
      gutter,
    }
  }
  const row = IOS_FIELD[size] ?? IOS_FIELD.md
  const height = theme.length(`--control-size-${row.height}`, 44)
  const radius = pill ? height / 2 : theme.length(`--control-radius-${row.radius}`, IOS_RADIUS[row.radius])
  const gutter = startAdornment ? 11 : 14
  const border =
    variant === "outline"
      ? state.invalid
        ? theme.color("--input-border-color-invalid")
        : state.focused
          ? theme.color("--input-outline-border-color-focus")
          : theme.color("--input-outline-border-color")
      : state.invalid
        ? theme.color("--input-border-color-invalid")
        : "transparent"
  return {
    glass: false,
    box: {
      minHeight: height,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: border,
      backgroundColor: variant === "soft" ? theme.color("--input-soft-background-color") : "transparent",
      // The CSS draws the line inside the box (an inset shadow); a border takes its 1 from the gutter
      paddingHorizontal: gutter - 1,
      borderCurve: "continuous",
      opacity: state.disabled ? 0.5 : 1,
    } as ViewStyle,
    gap: theme.length(`--input-gap-${row.gap}`, IOS_GAP[row.gap]),
    text: { fontSize: 17, lineHeight: 22, color: theme.color("--input-text-color", theme.colors.text) },
    // iOS's placeholder is the tertiary label (UIColor.placeholderText, the ink at 25%), as in a form row
    placeholder: theme.colors.labelTertiary,
    icon: theme.color("--mobile-label-secondary"),
    frame: null as FieldFrame | null,
    trailingIcon: theme.color("--mobile-label-secondary"),
    caret: theme.color("--color-background-accent-solid"),
    iconSize: 20,
    // xmark.circle.fill's 17pt circle: XCircleFilled draws its circle 20 of 24, so the glyph is 17 x 1.2
    clearSize: 17 * 1.2,
    clearTarget: theme.length("--input-clear-target-size", 44),
    /** How far an adornment reaches into the gutter (`--input-adornment-offset` of the size table). */
    adornmentOffset: row.adornmentOffset,
    height,
    gutter,
  }
}

/**
 * Draws a field's frame. An outlined field whose label has floated is cut where the label sits on the line, as
 * Compose's `outlineCutout`. The outline shows through three windows that do not overlap (a translucent disabled
 * line would darken where two did), each a clipped copy of the outline aligned with the field: before the cut (full
 * height), after it below the top line, and after it on the top line. So the cut animates with the label, needs no
 * fill behind the label, and keeps a pill's round ends. The windows are placed by `start` / `end`, so the cut
 * follows the label to the right in a right-to-left layout. `motion` moves the line's color and width.
 */
export function FieldOutline({
  frame,
  cut,
  motion,
}: {
  frame: FieldFrame | null
  cut?: { start: Animated.AnimatedInterpolation<number> | number; width: Animated.AnimatedInterpolation<number> | number } | null
  motion?: FrameMotion | null
}) {
  if (!frame) return null
  if (!frame.outlined) return <View pointerEvents="none" style={[styles.underline, { height: frame.width, backgroundColor: frame.color }]} />
  const line = { borderWidth: motion?.width ?? frame.width, borderColor: motion?.color ?? frame.color, borderRadius: frame.radius }
  if (!cut) return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, line]} />
  // Yoga rounds each view's offset from its parent on its own: a window at 10.5px (4dp at 2.625) and its copy at
  // -10.5px round to 11 and -10, a 1px step in the bottom line. On whole pixels the copies line up.
  const depth = PixelRatio.roundToNearestPixel(CUT_DEPTH)
  const start = typeof cut.start === "number" ? PixelRatio.roundToNearestPixel(cut.start) : cut.start
  const end = typeof start === "number" && typeof cut.width === "number" ? start + PixelRatio.roundToNearestPixel(cut.width) : Animated.add(start, cut.width)
  const back = typeof end === "number" ? -end : Animated.multiply(end, -1)
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.window, { start: 0, width: start, top: 0, bottom: 0 }]}>
        <Animated.View style={[styles.copy, line, { start: 0, end: FAR, top: 0, bottom: 0 }]} />
      </Animated.View>
      <Animated.View style={[styles.window, { start, end: 0, top: depth, bottom: 0 }]}>
        <Animated.View style={[styles.copy, line, { start: typeof start === "number" ? -start : Animated.multiply(start, -1), end: 0, top: -depth, bottom: 0 }]} />
      </Animated.View>
      <Animated.View style={[styles.window, { start: end, end: 0, top: 0, height: depth }]}>
        {/* Only its top line and the start of its corner show: it may run past the field's bottom */}
        <Animated.View style={[styles.copy, line, { start: back, end: 0, top: 0, bottom: FAR }]} />
      </Animated.View>
    </View>
  )
}

/** Hands a node to a caller's ref, a callback or an object. */
function passRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node)
  else if (ref) (ref as { current: T | null }).current = node
}

/** The accent of a focused Android field: the accent blue, lighter in dark mode (the Plex accent text). */
function focusAccent(theme: Theme): string {
  return theme.scheme === "dark" ? theme.colors.textAccent : theme.material.primary
}

/** Android's ease-out quint, cubic-bezier(0.23, 1, 0.32, 1) (the easeOutQuint curve). */
const EASE_OUT_QUINT = Easing.bezier(0.23, 1, 0.32, 1)

/**
 * Android's clear button of a search field, a 24dp cross kept in place and shown while the field has text. In a
 * bar's search it fades in, grows from 0 and turns from 45° over 180ms, decelerating; in a screen's search field it
 * fades in, grows from 0.4 and turns from 90° over 380ms, ease-out quint. At once with reduced motion. Hidden, its
 * place is the field's: a tap there sets the caret in the field.
 */
function AndroidClear({
  visible,
  kind,
  color,
  target,
  style,
  onPress,
  onHiddenPress,
}: {
  visible: boolean
  kind: "bar" | "field"
  color: string
  target: number
  style?: StyleProp<ViewStyle>
  onPress: () => void
  onHiddenPress: () => void
}) {
  const theme = useTheme()
  const [shown] = useState(() => new Animated.Value(visible ? 1 : 0))
  useEffect(() => {
    const bar = kind === "bar"
    Animated.timing(shown, {
      toValue: visible ? 1 : 0,
      duration: theme.reducedMotion ? 0 : bar ? 180 : 380,
      easing: bar ? Easing.out(Easing.quad) : EASE_OUT_QUINT,
      useNativeDriver: false,
    }).start()
  }, [visible, kind, shown, theme.reducedMotion])
  const scale = kind === "bar" ? shown : shown.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] })
  const rotate = shown.interpolate({ inputRange: [0, 1], outputRange: [kind === "bar" ? "45deg" : "90deg", "0deg"] })
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Clear"
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
      aria-hidden={visible ? undefined : true}
      focusable={visible}
      onPress={visible ? onPress : onHiddenPress}
      style={[styles.clear, styles.clearStretch, { width: target, minHeight: target }, style]}
    >
      <Animated.View style={{ opacity: shown, transform: [{ scale }, { rotate }] }}>
        <MaterialClose size={24} color={color} />
      </Animated.View>
    </Pressable>
  )
}

/** Android's floating label: 16 at rest, scaled to 0.75 once it floats. */
const LABEL = { rest: { fontSize: 16, lineHeight: 20 }, floated: { fontSize: 12, lineHeight: 16 } }

/** A clipped copy of the outline reaches this far past its window, so only its own edges show. */
const FAR = -2000
/** The cut removes the top line only: deeper than the 2dp focused line (then snapped to the pixel grid). */
const CUT_DEPTH = 4

/** The line's color and width on the move, for FieldOutline. */
export type FrameMotion = { color: Animated.Color; width: Animated.AnimatedInterpolation<number> }

/** The float's progress at which the cut's edges are worked out: they move on curves, followed through these points. */
const CUT_STEPS = Array.from({ length: 11 }, (_, index) => index / 10)

/**
 * The cut in the top line around a label that floats to `at`, `width` wide once floated. It opens from about the label's
 * middle, both edges moving apart (the start 4 past the label's half, the end 10 past it), and ends 5 either side of
 * the label. On the way the label is still larger (4/3 at rest), so the edges keep to its size.
 */
function labelCut(float: Animated.Value, at: number, width: number) {
  const edges = CUT_STEPS.map((progress) => {
    const size = width * (1 + (1 - progress) / 3)
    const start = PixelRatio.roundToNearestPixel(at - 1 + (size * (1 - progress)) / 2 - 4 * progress)
    const end = PixelRatio.roundToNearestPixel(at - 5 + (size * (1 + progress)) / 2 + 10 * progress)
    // Closed until the edges have passed each other
    return { start, width: Math.max(0, end - start) }
  })
  return {
    start: float.interpolate({ inputRange: CUT_STEPS, outputRange: edges.map((edge) => edge.start) }),
    width: float.interpolate({ inputRange: CUT_STEPS, outputRange: edges.map((edge) => edge.width) }),
  }
}

/** A single-line text field: Plex UI's Input. iOS 26 draws a 44pt field in 17pt type, Android an outlined field. */
export function Input(props: InputProps) {
  return <InputField {...props} />
}

/** Where an adornment stands, for the button in it. */
type AdornmentPlace = { side: "start" | "end"; row: boolean }
const AdornmentContext = createContext<AdornmentPlace | null>(null)

export type InputAdornmentButtonProps = Omit<PressableProps, "children" | "style"> & {
  /** The icon, an element of `@plexui/react-native/icons`: it takes the button's color and size. */
  children: ReactNode
  /** Names the button for screen readers; an icon alone has no name. */
  accessibilityLabel: string
  /** A toggle's state (a password's visibility), read as selected. */
  selected?: boolean
  style?: StyleProp<ViewStyle>
}

/**
 * A button in a field's adornment (a password's eye), as the web's `Input.AdornmentButton`: the icon in the tertiary
 * text on its 44pt target. iOS: at a row's end a 19pt glyph whose ink keeps the row's edge, its target reaching past
 * it and over the row's line; in a field the target stands at the field's edge. Android: a 24dp icon in the
 * field's icon color on a 48dp target, as Android's field icons.
 */
export function InputAdornmentButton({ children, accessibilityLabel, selected, disabled, style, ...rest }: InputAdornmentButtonProps) {
  const theme = useTheme()
  const place = useContext(AdornmentContext)
  const end = place?.side !== "start"
  const android = theme.isAndroid
  const target = android ? 48 : theme.length("--control-size-lg", 44)
  const glyph = android ? 24 : place?.row ? 19 : 20
  const reach = -(target - glyph) / 2
  const line = theme.length("--field-row-label-line-height", 22)
  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled: disabled ?? undefined }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.adornmentButton,
        { width: target, height: target, opacity: pressed && !android ? 0.5 : disabled ? 0.5 : 1 },
        end ? { marginEnd: reach } : { marginStart: reach },
        place?.row && !android ? { marginVertical: (line - target) / 2 } : null,
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          {/* Android's icon button: a 40dp circle of the icon's color at the pressed state's 10% */}
          {android && pressed && !disabled ? (
            <View pointerEvents="none" style={[styles.adornmentPressed, { backgroundColor: withAlpha(theme.material.onSurfaceVariant, stateLayer.pressed) }]} />
          ) : null}
          <IconDefaultsProvider size={glyph} color={android ? theme.material.onSurfaceVariant : theme.colors.textTertiary}>
            {children}
          </IconDefaultsProvider>
        </>
      )}
    </Pressable>
  )
}

Input.AdornmentButton = InputAdornmentButton

/**
 * `shift` moves the field sideways (TextField's shake on an error). With `multiline` (a Textarea) `rows` sets the
 * least height in lines, and `autoResize` grows the field with its text up to `maxRows` (else it stays at `rows` and
 * scrolls).
 */
export type FieldExtras = {
  label?: ReactNode
  required?: boolean
  shift?: Animated.Value
  rows?: number
  maxRows?: number
  autoResize?: boolean
  /** Android, at a row's end: the value stands at the end, as a value row's and the web's ghost row value (a Field row's
   * Input, an InputGroup's value before its unit); in a List with `columns` it still starts its column. */
  valueAtEnd?: boolean
}

/** The field itself; TextField passes it a floating label on Android. */
export function InputField({
  variant = "outline",
  size = "md",
  disabled = false,
  invalid = false,
  onClear,
  startAdornment,
  endAdornment,
  pill = false,
  style,
  testID,
  label: ownLabel,
  required: ownRequired,
  shift: ownShift,
  rows,
  maxRows,
  autoResize = false,
  valueAtEnd = false,
  value,
  defaultValue,
  onChangeText,
  onFocus,
  onBlur,
  readOnly: readOnlyProp,
  placeholderTextColor,
  selectionColor,
  cursorColor,
  ...rest
}: InputProps & FieldExtras) {
  const theme = useTheme()
  // A Field's label, floated in the field on Android (FloatLabelContext); the field's own wins
  const floatLabel = useContext(FloatLabelContext)
  const label = ownLabel ?? floatLabel?.label
  const required = ownRequired ?? floatLabel?.required
  const shift = ownShift ?? floatLabel?.shift
  const [focused, setFocused] = useState(false)
  const [own, setOwn] = useState(defaultValue ?? "")
  const text = value ?? own
  const filled = text.length > 0
  // A read-only field shows no clear button, as on the web
  const readOnly = readOnlyProp === true
  // React Native takes `readOnly` over `editable` when both are set: one locked state feeds both, so
  // `readOnly={false}` cannot unlock a disabled field
  const locked = disabled || readOnly
  const barField = useContext(BarFieldContext)
  // At an iOS row's end the field is the row's value, as the web's field in a `[data-row]`: it fills the room after the
  // label, with no frame (the row's error marks it invalid), its text at the end and the placeholder in the tertiary label
  // (on Android it fills the room too, keeping its own field look)
  const rowEnd = useContext(RowEndContext)
  const fillsRow = rowEnd != null && !barField
  const inRow = fillsRow && !theme.isAndroid
  // A line of its own under a row's label, or alone in the row (the web's vertical or label-hidden `Field row`): the
  // bare value on both platforms, from the row's text start; in a List with `columns` the value starts its column
  const stacked = fillsRow && rowEnd?.stacked === true
  const bare = inRow || stacked
  const startAligned = stacked || rowEnd?.align === "start"
  const multiline = rest.multiline === true
  // The row's value stands at its end: the right, or the left in a right-to-left row (a phone turns "right" over
  // itself, the web does not)
  const { ref: textBox, rtl } = useRTL<ComponentRef<typeof View>>()
  // The field's own handle, and a caller's ref passed through
  const input = useRef<ComponentRef<typeof TextInput> | null>(null)
  const callerRef = (rest as { ref?: Ref<ComponentRef<typeof TextInput>> }).ref
  const setInput = useCallback(
    (node: ComponentRef<typeof TextInput> | null) => {
      input.current = node
      passRef(callerRef, node)
    },
    [callerRef],
  )
  useEffect(() => {
    if (!fillsRow || rowEnd == null) return
    rowEnd.fill(true)
    return () => rowEnd.fill(false)
  }, [fillsRow, rowEnd])
  // Android's search field: a filled field with a magnifier and no label, on a screen or a sheet; a field in a bar,
  // in its own row or in a row under it, is the search of its bar
  const search = theme.isAndroid && !barField && variant === "soft" && !!startAdornment && label == null
  const barSearch = theme.isAndroid && !!barField
  const androidGlass = useAndroidGlass("bar", barField?.canvas)
  const fieldLookOf = fieldLook(
    theme,
    { variant, size, pill, startAdornment: !!startAdornment, bar: barField, label: label != null, search },
    { focused, filled, disabled, invalid },
  )
  const look = barSearch
    ? { ...fieldLookOf, box: { ...fieldLookOf.box, ...androidGlass } as ViewStyle }
    : bare
    ? {
        ...fieldLookOf,
        box: { minHeight: theme.isAndroid ? fieldLookOf.text.lineHeight : theme.length("--field-row-label-line-height", 22), opacity: disabled ? 0.5 : 1 } as ViewStyle,
        frame: null,
        placeholder: theme.isAndroid ? fieldLookOf.placeholder : theme.colors.labelTertiary,
        text: { ...fieldLookOf.text, color: theme.colors.text },
        adornmentOffset: 0,
        gutter: 0,
      }
    : fieldLookOf
  const floating = theme.isAndroid && label != null && !barField
  const outlined = variant === "outline"
  const [float] = useState(() => new Animated.Value(filled ? 1 : 0))
  const up = focused || filled
  useEffect(() => {
    // Android's label moves on a spring of stiffness 500 with no bounce (critically damped)
    const motion = theme.reducedMotion
      ? Animated.timing(float, { toValue: up ? 1 : 0, duration: 0, useNativeDriver: false })
      : Animated.spring(float, { toValue: up ? 1 : 0, ...FIELD_SPRING, overshootClamping: true, useNativeDriver: false })
    motion.start()
  }, [up, float, theme.reducedMotion])
  // Android's outlined line thickens with the focus and takes its color (the accent, the error color) on the label's
  // spring; the color springs from wherever it stands, so the error's red blends in on a spring of its own
  const lined = theme.isAndroid && outlined && look.frame?.outlined === true
  const thick = focused && !disabled
  const [line] = useState(() => new Animated.Value(thick ? 1 : 0))
  useEffect(() => springTo(line, thick ? 1 : 0, FIELD_SPRING, theme.reducedMotion), [thick, line, theme.reducedMotion])
  const lineColor = useSpringColor(look.frame?.color ?? "transparent", FIELD_SPRING.stiffness, !lined || theme.reducedMotion)
  const lineMotion: FrameMotion | null = lined ? { color: lineColor, width: line.interpolate({ inputRange: [0, 1], outputRange: [hairline(), FOCUS_LINE] }) } : null
  // Android's label is in the hint color at rest and in the accent while the field has focus, springing between them
  const labelColor = invalid ? dangerText(theme) : focused ? focusAccent(theme) : look.placeholder
  const labelTint = useSpringColor(labelColor, FIELD_SPRING.stiffness, !floating || theme.reducedMotion)
  const showClear = !!onClear && filled && !disabled && !readOnly
  // Android's search fields keep their clear button in place and show it with the text
  const androidClear = (search || barSearch) && !!onClear && !disabled && !readOnly
  // A 24dp icon stands 12 in, the text 12 past it (48 in); otherwise the text is 14 in (the outlined field), 21 in a
  // card's bare field, or 20 in a bar's search field. Android's search field keeps its text 48 from the end
  // (at a row's end the row sets the edge: a bare field keeps 14)
  // A ghost value that starts a row's column, or (Android) stands at the row's end, has the row's insets for its own
  const flush = fillsRow && variant === "ghost" && (rowEnd?.align === "start" || (theme.isAndroid && valueAtEnd))
  const edge = barField && !search ? 20 : stacked || flush ? 0 : fillsRow && variant === "ghost" ? 14 : look.gutter
  const endEdge = search ? 48 : edge
  const sides: ViewStyle | null = theme.isAndroid
    ? stacked
      ? { paddingStart: 0, paddingEnd: 0 }
      : { paddingStart: startAdornment ? 12 : edge, paddingEnd: endAdornment || showClear || androidClear ? 12 : endEdge }
    : null
  const textStart = theme.isAndroid ? (startAdornment ? 48 : edge) : 0
  // Above and below the text: a label floated inside a filled field (8 to 24) sets the text under it; Android centres
  // a line in the field's height; iOS keeps 10 in its border (11 from the edge); a bare value none
  const padding = bare
    ? { top: 0, bottom: 0 }
    : floating && !outlined
      ? { top: 26, bottom: 10 }
      : theme.isAndroid
        ? { top: (look.height - look.text.lineHeight) / 2, bottom: (look.height - look.text.lineHeight) / 2 }
        : { top: 10, bottom: 10 }
  // A Textarea's lines: `rows` at least; with `autoResize` as many as its text takes (a hidden copy of the text, as
  // wide as the field's, measures them), up to `maxRows` (the larger of `rows` and 10, as the web's)
  const minLines = Math.max(1, Math.round(rows ?? 1))
  const maxLines = Math.max(minLines, Math.round(maxRows ?? Math.max(minLines, 10)))
  const [measured, setMeasured] = useState(0)
  const lines = multiline && autoResize && measured > 0 ? Math.min(maxLines, Math.max(minLines, Math.round(measured / look.text.lineHeight))) : minLines
  // An outlined label floats to the text's start over the line (past a pill's round end), the cut 5 around it
  const floatedStart = pill ? look.height / 2 : 14
  const [labelWidth, setLabelWidth] = useState(0)
  // At rest the label stands where the text would
  const labelRest = (look.height - LABEL.rest.lineHeight) / 2
  const cut = floating && outlined && look.frame ? labelCut(float, floatedStart, labelWidth) : null
  // The clear button's own box is its touch target (44pt, 48dp): Android centers the 24dp icon in it where the 24dp
  // slot stood (12 over either side); iOS stands its circle half the field's height from the end, concentric with a
  // round end (Input.module.css), or keeps its box beside an end adornment
  const clearMargin: ViewStyle = theme.isAndroid
    ? { marginHorizontal: -(look.clearTarget - look.clearSize) / 2 }
    : { marginEnd: endAdornment ? theme.length("--input-clear-target-offset", 0) : look.height / 2 - look.clearTarget / 2 - look.gutter }
  // An adornment stands in a View of its own, centered on the field: a Button in it keeps its own `alignSelf`
  // ("flex-start", for a column) to that View, not to the field's row, where it would rise to the top of a field taller
  // than itself (an IconButton's 40dp in a 50dp field)
  const adornment = (node: ReactNode, side: "start" | "end") => (
    <View style={look.adornmentOffset ? (side === "start" ? { marginStart: look.adornmentOffset } : { marginEnd: look.adornmentOffset }) : null}>
      <AdornmentContext.Provider value={side === "start" ? (inRow ? ROW_START : FIELD_START) : inRow ? ROW_END : FIELD_END}>{node}</AdornmentContext.Provider>
    </View>
  )
  const labelText = (
    <>
      {label}
      {required ? " *" : ""}
    </>
  )
  return (
    <FieldBox
      glass={look.glass}
      raised={!!barField?.raised}
      radius={look.height / 2}
      shift={shift}
      style={[styles.box, look.box, { gap: look.gap }, multiline ? styles.boxTop : null, sides, style]}
      testID={testID}
    >
      {theme.isAndroid ? <FieldOutline frame={look.frame} cut={cut} motion={lineMotion} /> : null}
      {startAdornment ? (
        <IconDefaultsProvider size={look.iconSize} color={look.icon}>
          {adornment(startAdornment, "start")}
        </IconDefaultsProvider>
      ) : null}
      <View ref={textBox} style={styles.grow}>
        {floating ? (
          <>
            {outlined ? (
              // The floated label's width, in the visible label's own type (React Native's Text: no Plex tracking)
              <NativeText
                aria-hidden
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                numberOfLines={1}
                onLayout={(event) => setLabelWidth(event.nativeEvent.layout.width)}
                style={[styles.measure, { fontSize: LABEL.floated.fontSize, lineHeight: LABEL.floated.lineHeight, ...theme.font("regular") }]}
              >
                {labelText}
              </NativeText>
            ) : null}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.floating,
                outlined
                  ? {
                      top: float.interpolate({ inputRange: [0, 1], outputRange: [labelRest, -LABEL.floated.lineHeight / 2] }),
                      start: float.interpolate({ inputRange: [0, 1], outputRange: [0, floatedStart - textStart] }),
                    }
                  : { top: float.interpolate({ inputRange: [0, 1], outputRange: [labelRest, 8] }) },
              ]}
            >
              <Animated.Text
                style={{
                  color: labelTint,
                  fontSize: float.interpolate({ inputRange: [0, 1], outputRange: [LABEL.rest.fontSize, LABEL.floated.fontSize] }),
                  lineHeight: float.interpolate({ inputRange: [0, 1], outputRange: [LABEL.rest.lineHeight, LABEL.floated.lineHeight] }),
                  ...theme.font("regular"),
                }}
                numberOfLines={1}
              >
                {labelText}
              </Animated.Text>
            </Animated.View>
          </>
        ) : null}
        {multiline && autoResize ? (
          <NativeText
            aria-hidden
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            onLayout={(event) => setMeasured(event.nativeEvent.layout.height)}
            style={[styles.mirror, look.text, theme.font("regular")]}
          >
            {/* A last empty line keeps its height: Text drops a trailing line break */}
            {`${text || rest.placeholder || " "}\u200b`}
          </NativeText>
        ) : null}
        <TextInput
          {...rest}
          ref={setInput}
          accessibilityLabel={rest.accessibilityLabel ?? (typeof label === "string" ? label : undefined)}
          accessibilityState={disabled ? { ...rest.accessibilityState, disabled: true } : rest.accessibilityState}
          aria-disabled={disabled || rest["aria-disabled"] || undefined}
          aria-invalid={invalid || undefined}
          aria-required={required || undefined}
          value={text}
          onChangeText={(next) => {
            // A disabled field takes no text, whatever reaches it (a paste, an autofill)
            if (locked) return
            if (value === undefined) setOwn(next)
            onChangeText?.(next)
          }}
          onFocus={(event) => {
            setFocused(true)
            onFocus?.(event)
          }}
          onBlur={(event) => {
            setFocused(false)
            onBlur?.(event)
          }}
          editable={!locked}
          readOnly={locked}
          placeholder={floating && !up ? undefined : rest.placeholder}
          // A caller's own colors win over the platform's
          placeholderTextColor={placeholderTextColor ?? look.placeholder}
          selectionColor={selectionColor ?? look.caret}
          cursorColor={cursorColor ?? look.caret}
          style={[
            styles.input,
            look.text,
            theme.font("regular"),
            // A label floated inside the field (8 to 24) sets the text under it
            { paddingTop: padding.top, paddingBottom: padding.bottom },
            (inRow && !startAligned) || (fillsRow && valueAtEnd && !startAligned) ? { textAlign: Platform.OS === "web" && rtl ? "left" : "right" } : null,
            // A value in a row that the person cannot edit is the secondary label, as the web's phone rows (iOS's
            // values of a row that only informs)
            fillsRow && readOnly && !disabled ? { color: theme.colors.labelSecondary } : null,
            multiline ? { height: lines * look.text.lineHeight + padding.top + padding.bottom, textAlignVertical: "top" } : null,
          ]}
        />
      </View>
      {androidClear ? (
        <AndroidClear
          visible={filled}
          kind={barSearch ? "bar" : "field"}
          color={look.trailingIcon}
          target={look.clearTarget}
          style={clearMargin}
          onPress={() => {
            if (value === undefined) setOwn("")
            onChangeText?.("")
            onClear?.()
          }}
          onHiddenPress={() => {
            if (!locked) input.current?.focus()
          }}
        />
      ) : showClear ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear"
          onPress={() => {
            if (value === undefined) setOwn("")
            onChangeText?.("")
            onClear()
          }}
          style={[styles.clear, { width: look.clearTarget, minHeight: look.clearTarget }, theme.isAndroid ? styles.clearStretch : null, clearMargin]}
        >
          {theme.isAndroid ? <MaterialCancel size={look.clearSize} color={look.trailingIcon} /> : <XCircleFilled size={look.clearSize} color={theme.color("--mobile-label-tertiary")} />}
        </Pressable>
      ) : null}
      {endAdornment ? (
        <IconDefaultsProvider size={look.iconSize} color={look.trailingIcon}>
          {adornment(endAdornment, "end")}
        </IconDefaultsProvider>
      ) : null}
    </FieldBox>
  )
}

/**
 * The field's box: a View, or for a bar's search field the glass of the bar's buttons. With `shift` it moves sideways
 * (a caller's own transform wins).
 */
function FieldBox({ glass, raised, radius, shift, style, ...rest }: ViewProps & { glass: boolean; raised: boolean; radius: number; shift?: Animated.Value }) {
  if (glass) return <Glass radius={radius} elevation={raised ? "raised" : "regular"} style={style} {...rest} />
  return shift ? <Animated.View style={[{ transform: [{ translateX: shift }] }, style]} {...rest} /> : <View style={style} {...rest} />
}

/** React Native Web's description link, which React Native's own types leave out. */
type DescribedBy = { "aria-describedby"?: string }

export type TextFieldProps = InputProps & {
  /** The field's name: over the field on iOS, floating inside it on Android. */
  label: ReactNode
  /** Help under the field. */
  description?: ReactNode
  /** Shown under the field in place of the description, and marks it invalid. */
  errorMessage?: ReactNode
  required?: boolean
}

/**
 * A labelled text field: Plex UI's Field around an Input. iOS sets the label over the field (15/20 medium) and the
 * description or error under it (15/20, 4pt below, `--mobile-field-error-*`); Android is the outlined field with its
 * floating label (on the line of an outlined field) and the help under it (14, 14dp in).
 */
export function TextField({ label, description, errorMessage, required, invalid, ...input }: TextFieldProps) {
  const theme = useTheme()
  return (
    <FieldStack
      label={label}
      required={required}
      description={description}
      errorMessage={errorMessage}
      invalid={invalid}
      disabled={input.disabled}
      floating={theme.isAndroid}
      describedBy={(input as DescribedBy)["aria-describedby"]}
      hint={input.accessibilityHint}
    >
      {({ described, invalid: bad, shake }) =>
        theme.isAndroid ? (
          <InputField {...input} {...described} label={label} required={required} invalid={bad} shift={shake} />
        ) : (
          <InputField
            {...input}
            {...described}
            accessibilityLabel={input.accessibilityLabel ?? (typeof label === "string" ? label : undefined)}
            required={required}
            invalid={bad}
          />
        )
      }
    </FieldStack>
  )
}

const FIELD_START: AdornmentPlace = { side: "start", row: false }
const FIELD_END: AdornmentPlace = { side: "end", row: false }
const ROW_START: AdornmentPlace = { side: "start", row: true }
const ROW_END: AdornmentPlace = { side: "end", row: true }

const styles = StyleSheet.create({
  adornmentButton: { alignItems: "center", justifyContent: "center" },
  // Centered in the 48dp target
  adornmentPressed: { position: "absolute", top: 4, start: 4, width: 40, height: 40, borderRadius: 20 },
  box: { flexDirection: "row", alignItems: "center", alignSelf: "stretch" },
  // A field of several lines keeps its adornments on its first line
  boxTop: { alignItems: "flex-start" },
  grow: { flex: 1, minWidth: 0, justifyContent: "center" },
  // On the web a zero width leaves Chrome's `auto` focus ring drawn round the text: the field shows its focus itself
  input: { margin: 0, padding: 0, outlineWidth: 0, outlineStyle: "none" as "solid", minWidth: 0 },
  floating: { position: "absolute", start: 0, maxWidth: "100%", flexDirection: "row" },
  measure: { position: "absolute", start: 0, top: 0, opacity: 0 },
  // As wide as the text, out of the flow and unseen
  mirror: { position: "absolute", start: 0, end: 0, top: 0, opacity: 0 },
  underline: { position: "absolute", left: 0, right: 0, bottom: 0 },
  window: { position: "absolute", overflow: "hidden" },
  copy: { position: "absolute" },
  clear: { alignItems: "center", justifyContent: "center" },
  clearStretch: { alignSelf: "stretch" },
})
