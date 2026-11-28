import { useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { Animated, StyleSheet, Text as NativeText, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native"
import { Pressable } from "../../internal/Pressable"
import CloseBold from "../../icons/plex/CloseBold"
import { flattenChildren } from "../../internal/children"
import { curves } from "../../internal/motion"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { Text, TextColorProvider, type TextProps } from "../Text/Text"

export type BadgeColor = "secondary" | "accent" | "success" | "danger" | "warning" | "info" | "discovery" | "caution"
export type BadgeVariant = "solid" | "soft" | "outline" | "counter"
export type BadgeSize = "sm" | "md" | "lg" | "xl"

export type BadgeProps = {
  children: ReactNode
  /**
   * The fill: `soft`, `solid` or `outline` in the color, or `counter`, a solid capsule of one size, as an unread count
   * (`size` and `pill` do not change it). On Android a counter of a whole number moves as its count changes, and a
   * count of 0 hides it. @default "soft"
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
  // The accent has a solid and a soft step and one text color (styles' accent tokens): soft on the soft fill, the
  // outline's text and line in that text color
  if (color === "accent") {
    const text = theme.color("--color-text-accent")
    if (variant === "solid") return { background: theme.color("--color-background-accent-solid"), text: theme.color("--color-text-accent-solid", "#FFFFFF"), border: undefined }
    if (variant === "outline") return { background: "transparent", text, border: text }
    return { background: theme.color("--color-background-accent-soft"), text, border: undefined }
  }
  if (variant === "outline") return { background: "transparent", text: theme.color(`--color-text-${color}-outline`), border: theme.color(`--color-border-${color}-outline`) }
  if (variant === "solid") return { background: theme.color(`--color-background-${color}-solid`), text: theme.color(`--color-text-${color}-solid`), border: undefined }
  return { background: theme.color(`--color-background-${color}-soft-alpha`), text: theme.color(`--color-text-${color}-soft`), border: undefined }
}

/**
 * A short label of a status or a count, as @plexui/ui's Badge (`--badge-*`: the size, gutter, radius and semibold
 * type of each size; soft, solid and outline fills of the semantic colors). A brand sets a badge of its own round it
 * (a date on a capsule): `--badge-background`, `--badge-color`, `--badge-font-family` (`mono` for its mono face),
 * `--badge-font-weight`, `--badge-text-transform`, `--badge-letter-spacing`, and the size's `--badge-size-*`,
 * `--badge-font-size-*`, `--badge-gutter-*`. Material 3's badge is a dot or a count on
 * an icon (TabBar draws that), so Android draws the Plex badge too, in the same tokens. With
 * `variant="counter"` a badge is a counter, as an unread count: solid, a capsule, one size (`size` and `pill` aside).
 * On Android a counter of a whole number grows in from 0, shrinks away at 0 and rolls its changed digits.
 */
export function Badge(props: BadgeProps) {
  const theme = useTheme()
  return props.variant === "counter" && theme.isAndroid ? <AndroidCounter {...props} /> : <BadgeView {...props} />
}

/** A counter's count: its label when that is a whole number ("12" or 12), or null ("99+", "New"). */
function countOf(children: ReactNode): string | null {
  const parts = flattenChildren(children)
  const only = parts.length === 1 ? parts[0] : null
  const text = typeof only === "string" || typeof only === "number" ? String(only).trim() : ""
  return /^\d+$/.test(text) ? text : null
}

const isZero = (count: string | null) => count != null && Number(count) === 0

/** How far a changed digit rolls: in from below and out above as the count rises, the other way as it falls. */
const ROLL = 17

/** A change of count: 430ms, the width and the digits over its first half. */
const CHANGE = { duration: 430, easing: curves.ease }
/** 0 to a count: the counter grows in from nothing, overshooting at 2. */
const APPEAR = { duration: 220, easing: curves.overshoot(2) }
/** A count to 0: the counter shrinks away, then is gone. */
const HIDE = { duration: 150, easing: curves.ease }

/**
 * The pulse of a change on its (eased) progress: up to 1.1 over the first half easing out, back over the second easing
 * in. Followed through these points, as the two halves take two curves.
 */
const PULSE_STEPS = Array.from({ length: 21 }, (_, index) => index / 20)
const PULSE = PULSE_STEPS.map((progress) => 1 + 0.1 * (progress <= 0.5 ? curves.easeOut(progress * 2) : curves.easeIn(2 - progress * 2)))

/** A counter's count on the move: the one drawn, the one rolling out (and which way), and its progress. */
type CountMotion = { count: string; from: string | null; up: boolean; change: Animated.Value; scale: Animated.AnimatedMultiplication }

/**
 * How a counter moves from one label to the next: at once for a label that is not a count (or with reduced motion), else
 * it hides at 0, appears from 0, or rolls from one count to another.
 */
function changeOf(from: string | null, to: string | null, reducedMotion: boolean) {
  if (from == null || to == null || reducedMotion) return "instant"
  if (isZero(to)) return "hide"
  if (isZero(from)) return "appear"
  return "roll"
}

/** Android's counter: a whole-number count moves as it changes; any other label is drawn as it is. */
function AndroidCounter(props: BadgeProps) {
  const theme = useTheme()
  const count = countOf(props.children)
  const zero = isZero(count)
  const [presence] = useState(() => new Animated.Value(zero ? 0 : 1))
  const [change] = useState(() => new Animated.Value(1))
  // The last change of label (`from` the one before); the count drawn: the old one while it shrinks away, none once a 0
  // has hidden the counter; the count rolling out
  const [step, setStep] = useState({ count, from: count })
  const [shown, setShown] = useState<string | null>(zero ? null : count)
  const [roll, setRoll] = useState<{ from: string; up: boolean } | null>(null)
  if (step.count !== count) {
    setStep({ count, from: step.count })
    const kind = changeOf(step.count, count, theme.reducedMotion)
    // A hiding counter keeps its old count as it shrinks
    if (kind !== "hide") setShown(zero ? null : count)
    setRoll(kind === "roll" && step.count != null ? { from: step.count, up: Number(count) > Number(step.count) } : null)
  }
  const moved = useRef(step)
  // Before the paint, so a new count never shows a frame at rest before it moves
  useLayoutEffect(() => {
    if (moved.current === step) return
    moved.current = step
    const kind = changeOf(step.from, step.count, theme.reducedMotion)
    if (kind === "instant") {
      presence.setValue(isZero(step.count) ? 0 : 1)
      change.setValue(1)
    } else if (kind === "hide") {
      Animated.timing(presence, { toValue: 0, ...HIDE, useNativeDriver: false }).start(({ finished }) => {
        if (finished) setShown(null)
      })
    } else if (kind === "appear") {
      // From where it stands, should it be still shrinking away
      change.setValue(1)
      Animated.timing(presence, { toValue: 1, ...APPEAR, useNativeDriver: false }).start()
    } else {
      change.setValue(0)
      Animated.timing(change, { toValue: 1, ...CHANGE, useNativeDriver: false }).start(({ finished }) => {
        if (finished) setRoll(null)
      })
    }
  }, [step, theme.reducedMotion, presence, change])
  if (count == null) return <BadgeView {...props} />
  if (shown == null) return null
  const pulse = change.interpolate({ inputRange: PULSE_STEPS, outputRange: PULSE })
  return <BadgeView {...props} motion={{ count: shown, from: roll?.from ?? null, up: roll?.up ?? true, change, scale: Animated.multiply(presence, pulse) }} />
}

/** A brand's badge weight, named or numeric (400, 500, 600, 700), as the face's weights. */
function badgeWeight(weight: unknown): "regular" | "medium" | "semibold" | "bold" {
  if (weight === "regular" || weight === "medium" || weight === "semibold" || weight === "bold") return weight
  const n = typeof weight === "number" ? weight : typeof weight === "string" ? Number(weight) : NaN
  if (!Number.isFinite(n)) return "semibold"
  return n >= 700 ? "bold" : n >= 590 ? "semibold" : n >= 500 ? "medium" : "regular"
}

function BadgeView({
  children,
  variant = "soft",
  size = "sm",
  pill = false,
  color = "secondary",
  onRemove,
  removeLabel = "Remove",
  removable = false,
  testID,
  style,
  motion,
}: BadgeProps & { motion?: CountMotion }) {
  const theme = useTheme()
  const counter = variant === "counter"
  const own = badgeColors(theme, variant, color)
  // A brand's badge (a date on a capsule): its fill and words round the badge (`--badge-background`, `--badge-color`)
  const colors = {
    ...own,
    background: counter ? own.background : theme.color("--badge-background", own.background),
    text: counter ? own.text : theme.color("--badge-color", own.text),
  }
  // and its face: `--badge-font-family` (a family, or `mono` for the brand's mono), `--badge-text-transform`,
  // `--badge-letter-spacing`, `--badge-font-weight`
  const family = theme.token("--badge-font-family")
  // `mono` goes through Text's own mono face (its weights and zero tracking); a family is set as it is
  const mono = !counter && typeof family === "string" && family.trim() === "mono"
  const face = typeof family === "string" && family.trim() && !mono ? { fontFamily: family.trim().replace(/^["']|["']$/g, "") } : null
  const transform = theme.token("--badge-text-transform")
  const tracking = theme.token("--badge-letter-spacing") != null ? theme.length("--badge-letter-spacing") : undefined
  const weight = theme.token("--badge-font-weight")
  const height = counter ? COUNTER.height : theme.length(`--badge-size-${size}`, 20)
  const fontSize = counter ? COUNTER.fontSize : theme.length(`--badge-font-size-${size}`, 12)
  const iconSize = counter ? COUNTER.fontSize : theme.length(`--badge-icon-font-size-${size}`, 12)
  const gutter = theme.length(`--badge-gutter-${size}`, 6)
  // A capsule stays one when a large text size grows the badge
  const radius = pill || counter ? 9999 : theme.length(`--badge-radius-${size}`, 4)
  const paddingHorizontal = counter ? COUNTER.padding : pill ? gutter * theme.length("--control-gutter-pill-scaling", 1.25) : gutter
  // The cross takes touches 44 (48 on Android) around it, the platform's least target
  const slop = Math.max(0, ((theme.isAndroid ? 48 : 44) - iconSize) / 2)
  // A badge's label scales with the text size up to 130%: past that it would crowd what it labels
  const label: TextProps = {
    weight: counter ? "medium" : badgeWeight(weight),
    mono,
    numberOfLines: 1,
    maxFontSizeMultiplier: 1.3,
    color: colors.text,
    style: [
      { fontSize, lineHeight: Math.round(fontSize * 1.34), flexShrink: 1 },
      // A family of the brand's own is set with its weight: Text gives a weight as a family of its own where the fonts
      // come one per weight, which this family replaces
      counter || !face ? null : { ...face, fontWeight: ({ regular: "400", medium: "500", semibold: "600", bold: "700" } as const)[badgeWeight(weight)] },
      !counter && (transform === "uppercase" || transform === "lowercase" || transform === "capitalize") ? { textTransform: transform } : null,
      !counter && tracking != null ? { letterSpacing: tracking } : null,
    ],
  }
  const cross = onRemove ? (
    <Pressable accessibilityRole="button" accessibilityLabel={removeLabel} hitSlop={slop} onPress={onRemove} style={({ pressed }) => [styles.remove, pressed ? styles.pressed : null]}>
      <CloseBold size={iconSize} color={colors.text} />
    </Pressable>
  ) : removable ? (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.remove}>
      <CloseBold size={iconSize} color={colors.text} />
    </View>
  ) : null
  const Root = motion ? Animated.View : View
  return (
    <Root
      testID={testID}
      style={[
        styles.badge,
        // A least height: a large text size grows the badge rather than cutting its label
        { minHeight: height, minWidth: counter ? height : undefined, justifyContent: counter ? "center" : undefined, paddingHorizontal, borderRadius: radius, backgroundColor: colors.background },
        colors.border ? { borderWidth: 1, borderColor: colors.border } : null,
        // Around its center, as it grows in, pulses and shrinks away
        motion ? { transform: [{ scale: motion.scale }] } : null,
        style,
      ]}
    >
      <TextColorProvider value={colors.text}>
        <IconDefaultsProvider size={iconSize} color={colors.text}>
          {motion ? (
            <RollingCount motion={motion} label={label} />
          ) : (
            /* Text runs take the badge's type; a symbol beside them stays a symbol (`<Badge><Star />New</Badge>`) */
            flattenChildren(children).map((child, index) =>
              typeof child === "string" || typeof child === "number" ? (
                <Text key={index} {...label}>
                  {child}
                </Text>
              ) : (
                child
              ),
            )
          )}
        </IconDefaultsProvider>
      </TextColorProvider>
      {cross}
    </Root>
  )
}

/** The characters of a count, those `hidden` keeping their place unseen. */
function spell(count: string, hidden: (index: number) => boolean) {
  return [...count].map((digit, index) => (
    <NativeText key={index} style={hidden(index) ? styles.unseen : null}>
      {digit}
    </NativeText>
  ))
}

/**
 * A count, and a change of it: over the first half of the change the label's width moves from the old count's to the
 * new one's, and the digits that changed roll (in from below and out above as the count rises, the other way as it
 * falls) and fade, while those that stayed stand still. A count of another length rolls whole.
 */
function RollingCount({ motion, label }: { motion: CountMotion; label: TextProps }) {
  const { count, from, up, change } = motion
  // The counts' widths as laid out: the one drawn, and while it rolls in the old one's to start from
  const [widths, setWidths] = useState<Record<string, number>>({})
  const measure = (of: string) => (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width
    setWidths((known) => (known[of] === width ? known : { ...(from != null && known[from] != null ? { [from]: known[from] } : null), [of]: width }))
  }
  if (from == null) {
    return (
      <Text {...label} onLayout={measure(count)}>
        {count}
      </Text>
    )
  }
  const same = [...count].map((digit, index) => from.length === count.length && from[index] === digit)
  const half = change.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] })
  const fromWidth = widths[from]
  const toWidth = widths[count]
  const width = fromWidth != null && toWidth != null ? change.interpolate({ inputRange: [0, 0.5, 1], outputRange: [fromWidth, toWidth, toWidth] }) : fromWidth
  return (
    <Animated.View style={[styles.roll, { width }]}>
      {/* The new count, unseen, holds the label's height (and is what a screen reader reads) */}
      <Text {...label} style={[label.style, styles.holder]}>
        {count}
      </Text>
      <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[styles.layer, { opacity: half, transform: [{ translateY: half.interpolate({ inputRange: [0, 1], outputRange: [up ? ROLL : -ROLL, 0] }) }] }]}
        >
          <Text {...label} onLayout={measure(count)}>
            {spell(count, (index) => same[index])}
          </Text>
        </Animated.View>
        {same.some(Boolean) ? (
          <View style={styles.layer}>
            <Text {...label}>{spell(count, (index) => !same[index])}</Text>
          </View>
        ) : null}
        <Animated.View
          style={[
            styles.layer,
            {
              opacity: half.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              transform: [{ translateY: half.interpolate({ inputRange: [0, 1], outputRange: [0, up ? -ROLL : ROLL] }) }],
            },
          ]}
        >
          <Text {...label}>{spell(from, (index) => !!same[index])}</Text>
        </Animated.View>
      </View>
    </Animated.View>
  )
}

/** A count's layers reach this far past the label each side, so a wider count is never cut to the label's width. */
const SPREAD = 100

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 4, maxWidth: "100%", borderCurve: "continuous" },
  remove: { marginEnd: -1, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.6 },
  roll: { alignItems: "center", justifyContent: "center" },
  holder: { opacity: 0 },
  layer: { position: "absolute", top: 0, bottom: 0, start: -SPREAD, end: -SPREAD, alignItems: "center", justifyContent: "center" },
  unseen: { color: "transparent" },
})
