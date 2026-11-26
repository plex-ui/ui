import { useEffect, useLayoutEffect, useState } from "react"
import { Animated, Platform, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type TextStyle, type ViewStyle } from "react-native"
import { curves } from "../../internal/motion"
import { cssEasing, nativeDriver, useTransitionValue } from "../../internal/transition"
import { useTheme } from "../../theme/ThemeProvider"
import { Text, textStyle, type TextProps } from "../Text/Text"

export type RollingNumberProps = Omit<TextProps, "children"> & {
  /** The number shown. A new value rolls each changed digit to it. */
  value: number
  /** The locale the number is written in, as `Intl.NumberFormat` takes it. @default "en-US" */
  locales?: Intl.LocalesArgument
  /** How the number is written: currency, percent, fraction digits, grouping, as `Intl.NumberFormat` takes it. */
  format?: Intl.NumberFormatOptions
  /** The style of the row of characters. */
  containerStyle?: StyleProp<ViewStyle>
  /** How long a change takes, in ms. @default `--rolling-number-duration` (600) on iOS, 320 on Android */
  duration?: number
}

type Character = { character: string; digit: number | null; key: string }

/** The parts of a written number, or, where the engine has no `formatToParts`, its characters read as one integer. */
function partsOf(formatter: Intl.NumberFormat, value: number, glyphs: string[]): Intl.NumberFormatPart[] {
  if (typeof formatter.formatToParts === "function") return formatter.formatToParts(value)
  return Array.from(formatter.format(value)).map((character) => ({ type: glyphs.includes(character) ? "integer" : "literal", value: character }) as Intl.NumberFormatPart)
}

/**
 * A written number's characters, each keyed by its place around the decimal separator, so a digit keeps its reel
 * when the number grows or its fraction gets longer; digits are the locale's own (Arabic-Indic, Bengali…).
 */
export const rollingNumberParts = (value: number, locales: Intl.LocalesArgument = "en-US", format?: Intl.NumberFormatOptions) => {
  const formatter = new Intl.NumberFormat(locales, format)
  const { locale, numberingSystem } = formatter.resolvedOptions()
  const digitFormatter = new Intl.NumberFormat(locale, { numberingSystem, useGrouping: false })
  const glyphs = Array.from({ length: 10 }, (_, digit) => digitFormatter.format(digit))
  const parts = partsOf(formatter, value, glyphs)
  let integers = parts.reduce((count, part) => count + (part.type === "integer" ? Array.from(part.value).length : 0), 0)
  let fractions = 0
  const seen: Record<string, number> = {}
  const characters: Character[] = parts.flatMap((part) =>
    Array.from(part.value).map((character) => {
      const glyph = glyphs.indexOf(character)
      const digit = (part.type === "integer" || part.type === "fraction") && glyph >= 0 ? glyph : null
      let key: string
      if (part.type === "integer") key = `i${integers--}`
      else if (part.type === "fraction") key = `f${++fractions}`
      else if (part.type === "group") key = `g${integers}`
      else {
        seen[part.type] = (seen[part.type] ?? 0) + 1
        key = `${part.type}${seen[part.type]}-${character}`
      }
      return { character, digit, key }
    }),
  )
  return { text: parts.map((part) => part.value).join(""), glyphs, characters }
}

/**
 * A number whose digits roll to a new value, as an odometer, and @plexui/ui's RollingNumber: for a total, a balance, a
 * count or a KPI that changes while it is watched. It takes the props of `Text` for its type and color, in tabular
 * figures. iOS, as the web: each changed digit's reel of 0 to 9 turns to it in `--rolling-number-duration` (600ms) on
 * `--rolling-number-ease`. Android, the Plex Android look's animated text: a changed character fades out and away by
 * 0.3 of the font size while the new one comes in, in 320ms (ease-out quint), up for a larger number. With reduced
 * motion it changes at once. A screen reader reads the written number.
 */
export function RollingNumber({ value, locales, format, containerStyle, duration, style, size, variant, weight, mono, testID, accessibilityLabel, ...text }: RollingNumberProps) {
  const theme = useTheme()
  const { text: written, glyphs, characters } = rollingNumberParts(value, locales, format)
  const flat = StyleSheet.flatten(style) as TextStyle | undefined
  const base = textStyle(theme, { variant, size, weight, mono })
  const lineHeight = flat?.lineHeight ?? base.lineHeight ?? 20
  const fontSize = flat?.fontSize ?? base.fontSize ?? 16
  // The direction a change moves on Android: up for a larger number
  const [last, setLast] = useState({ value, up: true })
  if (last.value !== value) setLast({ value, up: value > last.value })
  const glyphProps: TextProps = { ...text, size, variant, weight, mono, tabularNums: true, style }
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? written}
      testID={testID}
      // The digits keep left to right in a right-to-left layout, as they are written (the web takes it as `dir`)
      {...(Platform.OS === "web" ? { dir: "ltr" } : null)}
      style={[styles.row, styles.ltr, containerStyle]}
    >
      {characters.map(({ character, digit, key }) =>
        theme.isAndroid ? (
          <Changing key={key} character={character} up={last.up} lift={0.3 * fontSize} reduced={theme.reducedMotion} duration={duration ?? 320} text={glyphProps} />
        ) : digit === null ? (
          <Text key={key} {...glyphProps}>
            {character}
          </Text>
        ) : (
          <Reel key={key} digit={digit} character={character} glyphs={glyphs} lineHeight={lineHeight} duration={duration} text={glyphProps} />
        ),
      )}
    </View>
  )
}

/** iOS's reel: the digit itself, hidden, keeps the width and height; a column of 0 to 9 turns over it. */
function Reel({ digit, character, glyphs, lineHeight, duration, text }: { digit: number; character: string; glyphs: string[]; lineHeight: number; duration?: number; text: TextProps }) {
  const theme = useTheme()
  const [line, setLine] = useState(lineHeight)
  const position = useTransitionValue(digit, {
    duration: duration ?? theme.duration("--rolling-number-duration", 600),
    easing: cssEasing(theme.token("--rolling-number-ease"), curves.easeInOut),
    native: true,
    reducedMotion: theme.reducedMotion,
  })
  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height
    if (next > 0) setLine((old) => (old === next ? old : next))
  }
  return (
    <View style={styles.digit}>
      <Text {...text} onLayout={onLayout} style={[text.style, styles.ghost]}>
        {character}
      </Text>
      <Animated.View
        style={[styles.reel, { transform: [{ translateY: position.interpolate({ inputRange: [0, 9], outputRange: [0, -9 * line] }) }] }]}
      >
        {glyphs.map((glyph) => (
          <Text key={glyph} {...text} style={[text.style, { height: line }]}>
            {glyph}
          </Text>
        ))}
      </Animated.View>
    </View>
  )
}

/** Android's animated text: a new character comes in as the old one leaves, both fading and moving by `lift`. */
function Changing({ character, up, lift, reduced, duration, text }: { character: string; up: boolean; lift: number; reduced: boolean; duration: number; text: TextProps }) {
  const [pair, setPair] = useState({ old: null as string | null, now: character, up })
  if (pair.now !== character) setPair({ old: pair.now, now: character, up })
  const [progress] = useState(() => new Animated.Value(1))
  useLayoutEffect(() => {
    if (pair.old == null) return
    progress.setValue(reduced ? 1 : 0)
  }, [pair, progress, reduced])
  useEffect(() => {
    if (pair.old == null || reduced) return
    const animation = Animated.timing(progress, { toValue: 1, duration, easing: curves.easeOutQuint, useNativeDriver: nativeDriver, isInteraction: false })
    animation.start(({ finished }) => {
      if (finished) setPair((current) => (current === pair ? { ...current, old: null } : current))
    })
    return () => animation.stop()
  }, [duration, pair, progress, reduced])
  const direction = pair.up ? 1 : -1
  return (
    <View>
      <Animated.View
        style={
          pair.old == null
            ? null
            : { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [direction * lift, 0] }) }] }
        }
      >
        <Text {...text}>{pair.now}</Text>
      </Animated.View>
      {pair.old == null || reduced ? null : (
        <Animated.View
          style={[
            styles.leaving,
            {
              opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
              transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -direction * lift] }) }],
            },
          ]}
        >
          <Text {...text}>{pair.old}</Text>
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start" },
  // The web takes dir="ltr" (react-native-web has no direction style, and checks every style it is given here)
  ltr: Platform.OS === "web" ? {} : { direction: "ltr" },
  // Clips the reel to one line
  digit: { overflow: "hidden" },
  ghost: { opacity: 0 },
  reel: { position: "absolute", top: 0, start: 0, end: 0, alignItems: "center" },
  leaving: { position: "absolute", top: 0, start: 0 },
})
