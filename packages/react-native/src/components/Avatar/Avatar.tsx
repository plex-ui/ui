import { Children, isValidElement, useId, useState, type ComponentType, type ReactNode } from "react"
import { Animated, Easing, Platform, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native"
import { Pressable } from "../../internal/Pressable"
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import type { IconProps } from "../Icon/createIcon"
import { Text } from "../Text/Text"

export type AvatarColor = "primary" | "secondary" | "success" | "info" | "discovery" | "danger"

/** The fill of an avatar. */
export type AvatarVariant = "soft" | "solid" | "gradient"

export type AvatarProps = {
  /** The person's name: its first letter is the placeholder, and it names an avatar that is a button. */
  name?: string
  /** A picture over the placeholder; when it fails to load, the placeholder stays. */
  imageUrl?: string
  /** A picture as an Image source (a `require()`d asset, `{ uri }`), as `Card.Media` takes it; it wins over `imageUrl`. */
  source?: ImageSourcePropType
  /**
   * @default "secondary". A `gradient` avatar in the secondary color takes one of the seven gradients from its name,
   * the same each time; the other colors take the nearest gradient
   */
  color?: AvatarColor
  /**
   * The fill: `soft` or `solid` in the color, or `gradient`, a top-to-bottom gradient of one of seven colors with up to
   * two white initials (a count keeps the soft fill). @default "soft"
   */
  variant?: AvatarVariant
  /** Width and height. @default 28 (`--avatar-size`) */
  size?: number
  /** A symbol instead of the initial. */
  Icon?: ComponentType<IconProps>
  /** Shows `+N` for the people a group does not show. */
  overflowCount?: number
  /** Makes the avatar a button named by `name`. */
  onPress?: () => void
  accessibilityLabel?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

const initialOf = (name: string) => (Array.from(name.trim())[0] ?? "").toUpperCase()

/** Two letters: the first of the first word and the first of the last one, so "Anna Kim" is AK and "Maya" M. */
function twoInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ""
  const first = initialOf(words[0]!)
  return words.length > 1 ? first + initialOf(words[words.length - 1]!) : first
}

/** The seven gradients: the top and the bottom of each, red, orange, violet, green, cyan, blue, pink. */
const GRADIENTS: readonly (readonly [string, string])[] = [
  ["#FF845E", "#D45246"],
  ["#FEBB5B", "#F68136"],
  ["#B694F9", "#6C61DF"],
  ["#9AD164", "#46BA43"],
  ["#5BCBE3", "#359AD4"],
  ["#5CAFFA", "#408ACF"],
  ["#FF8AAC", "#D95574"],
]
/** A color the avatar was given, as the nearest gradient; the secondary default goes by the name. */
const GRADIENT_OF: Partial<Record<AvatarColor, number>> = { danger: 0, discovery: 2, success: 3, info: 5, primary: 5 }

/** One of the seven for a name, the same each time. */
function gradientFor(name: string, color: AvatarColor) {
  const fixed = GRADIENT_OF[color]
  if (fixed != null) return GRADIENTS[fixed]!
  let hash = 0
  for (const char of name.trim()) hash = (hash * 31 + char.codePointAt(0)!) >>> 0
  return GRADIENTS[hash % GRADIENTS.length]!
}

/**
 * `+N` as the web writes it (Intl's short compact notation: 999, 1k, 12k, 1m). A Hermes build without compact
 * notation gives the digits back, or throws: the same short form is then written out by hand.
 */
function overflowText(count: number) {
  try {
    const text = new Intl.NumberFormat("en", { notation: "compact", compactDisplay: "short", maximumFractionDigits: 0 }).format(count).toLowerCase()
    if (/^\d+[kmbt]?$/.test(text) && (count < 1000 || /[kmbt]$/.test(text))) return text
  } catch {
    // Falls through to the manual form
  }
  const units = ["", "k", "m", "b", "t"]
  let value = Math.round(count)
  let unit = 0
  while (value >= 999.5 && unit < units.length - 1) {
    value /= 1000
    unit++
  }
  return `${Math.round(value)}${units[unit]}`
}

export function avatarColors(theme: Theme, color: AvatarColor, variant: "soft" | "solid") {
  return {
    background: theme.color(`--color-background-${color}-${variant}`),
    text: theme.color(`--color-text-${color}-${variant}`),
  }
}

/**
 * A person or an entity in a circle: a picture over an initial (or a symbol, or `+N`) on a soft or solid fill, as
 * @plexui/ui's Avatar (`--avatar-*`: the initial at half the size, semibold; a picture with a hairline border of
 * `--avatar-image-border-color`). iOS and Android draw it alike: neither platform has an avatar of its own. With
 * `variant="gradient"` it is a gradient of one of seven colors from top to bottom with up to two white initials,
 * Medium at 18/50 of the circle.
 */
export function Avatar({ name, imageUrl, source: sourceProp, color = "secondary", variant = "soft", size: sizeProp, Icon, overflowCount, onPress, accessibilityLabel, testID, style }: AvatarProps) {
  const theme = useTheme()
  const [failed, setFailed] = useState(false)
  const source: ImageSourcePropType | undefined = sourceProp ?? (imageUrl ? { uri: imageUrl } : undefined)
  // A new picture gets its own try, even one that failed before
  const pictureKey = sourceKey(source)
  const [shown, setShown] = useState(pictureKey)
  if (shown !== pictureKey) {
    setShown(pictureKey)
    setFailed(false)
  }
  const size = sizeProp ?? theme.length("--avatar-size", 28)
  const label = overflowCount ? overflowText(overflowCount) : null
  // The gradient draws a person, not a count: `+N` keeps the Plex fill
  const gradient = variant === "gradient" && !label
  const fill = gradient ? gradientFor(name ?? "", color) : null
  const colors = fill ? { background: "transparent", text: "#FFFFFF" } : avatarColors(theme, color, variant === "gradient" ? "soft" : variant)
  const gradientId = `avatar${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`
  const scale = label ? [0.45, 0.45, 0.37, 0.3][Math.min(3, label.length)] : 0.5
  const fontSize = size * (label ? theme.length(`--avatar-overflow-font-size-scaling-${["one", "one", "two", "three"][Math.min(3, label.length)]}`, scale) : theme.length("--avatar-font-size-scaling", 0.5))
  // The circle keeps its size: its letters scale with the text size up to 130%, which it still holds
  const placeholder = label ? (
    <Text weight="semibold" maxFontSizeMultiplier={1.3} color={colors.text} style={{ fontSize, lineHeight: fontSize * 1.2 }}>
      +{label}
    </Text>
  ) : Icon ? (
    // The web's icon is 0.7 of the circle (`.AvatarIcon`, 1em of a 0.7 font size)
    <Icon size={size * 0.7} color={colors.text} />
  ) : gradient ? (
    <Text weight="medium" maxFontSizeMultiplier={1.3} color={colors.text} style={{ fontSize: size * 0.36, lineHeight: size * 0.36 * 1.2 }}>
      {twoInitials(name ?? "")}
    </Text>
  ) : (
    <Text weight="semibold" maxFontSizeMultiplier={1.3} color={colors.text} style={{ fontSize, lineHeight: fontSize * 1.2 }}>
      {initialOf(name ?? "")}
    </Text>
  )
  const showImage = source != null && !failed
  const body = (
    <>
      {fill ? (
        <Svg pointerEvents="none" width={size} height={size} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={fill[0]} />
              <Stop offset="1" stopColor={fill[1]} />
            </LinearGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${gradientId})`} />
        </Svg>
      ) : null}
      {/* Over the gradient: on the web an absolutely placed fill paints above an unplaced symbol, so it gets a View */}
      {fill ? <View pointerEvents="none">{placeholder}</View> : placeholder}
      {showImage ? (
        <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, overflow: "hidden" }]}>
          {/* A picture of its own for each address, so a new one fades in afresh */}
          <Picture key={pictureKey} source={source} fade={theme.isAndroid ? (theme.reducedMotion ? 0 : 150) : undefined} onError={() => setFailed(true)} />
          {/* The hairline over the picture, inside its edge, so it does not change the size */}
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: size / 2, borderWidth: 1, borderColor: theme.color("--avatar-image-border-color") }]} />
        </View>
      ) : null}
    </>
  )
  const box = [styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.background }, style]
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? name}
        // A small avatar takes touches 44 (48 on Android) around its center
        hitSlop={Math.max(0, ((theme.isAndroid ? 48 : 44) - size) / 2)}
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [box, pressed ? styles.pressed : null]}
      >
        {body}
      </Pressable>
    )
  }
  return (
    <View accessible={!!(accessibilityLabel ?? name)} accessibilityRole="image" accessibilityLabel={accessibilityLabel ?? name} testID={testID} style={box}>
      {body}
    </View>
  )
}

/**
 * The picture. Android fades it in over `fade` ms, linear, once it has loaded: a device's Image does it itself (its
 * own fade is 300ms), elsewhere the picture's opacity runs. Left out, the platform's own way stays.
 */
/** What tells one picture from another: its address, or the asset a `require()` gives. */
function sourceKey(source: ImageSourcePropType | undefined): string | undefined {
  if (source == null) return undefined
  if (typeof source === "number") return `asset:${source}`
  if (Array.isArray(source)) return source.map((item) => item.uri ?? "").join("|")
  return (source as { uri?: string }).uri ?? JSON.stringify(source)
}

function Picture({ source, fade, onError }: { source: ImageSourcePropType; fade?: number; onError: () => void }) {
  const fades = fade != null && fade > 0 && Platform.OS !== "android"
  const [opacity] = useState(() => new Animated.Value(fades ? 0 : 1))
  return (
    <Animated.Image
      source={source}
      onError={onError}
      fadeDuration={Platform.OS === "android" ? fade : undefined}
      onLoad={fades ? () => Animated.timing(opacity, { toValue: 1, duration: fade, easing: Easing.linear, useNativeDriver: false }).start() : undefined}
      style={[StyleSheet.absoluteFill, { opacity }]}
      accessibilityIgnoresInvertColors
    />
  )
}

export type AvatarGroupProps = {
  children: ReactNode
  /** The size of every avatar. @default 28 */
  size?: number
  /**
   * The ring that cuts each avatar out of the next one: the color the group stands on. @default the screen's
   * background (`theme.colors.background`); a group on a card passes the card's color
   */
  cutoutColor?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

/**
 * Avatars that overlap, the first on top and each cutting the next by a ring of the screen's background
 * (`--avatar-group-spacing` -8, `--avatar-group-cutout-width` 3, or `cutoutColor` on another fill), as @plexui/ui's
 * AvatarGroup with its default `stack="start"`; they run from the start, so right to left the first stands at the right.
 */
export function AvatarGroup({ children, size: sizeProp, cutoutColor, testID, style }: AvatarGroupProps) {
  const theme = useTheme()
  const size = sizeProp ?? theme.length("--avatar-size", 28)
  const cutout = theme.length("--avatar-group-cutout-width", 3)
  // The web's `--avatar-group-cutout-color` is its surface, a card's gray at night: on a phone's screen the ring would
  // draw a gray outline round each avatar, so it is the screen's own background
  const ring = cutoutColor ?? theme.colors.background
  const items = Children.toArray(children).filter(isValidElement)
  return (
    // The group's box is the avatars' own, as the web's: the rings stand over its edges
    <View accessibilityRole="list" testID={testID} style={[styles.group, style]}>
      {items.map((child, index) => (
        <View
          key={child.key ?? index}
          style={{
            // The ring of the background around each avatar cuts it out of the next one; the rings on both sides
            // come out of the step, so the avatars stand the web's 8 over each other
            marginVertical: -cutout,
            marginStart: index === 0 ? -cutout : theme.length("--avatar-group-spacing", -8) - 2 * cutout,
            marginEnd: index === items.length - 1 ? -cutout : 0,
            // Each stands over the next, which its ring cuts, as the web's group stacks them
            zIndex: items.length - index,
            padding: cutout,
            borderRadius: size / 2 + cutout,
            backgroundColor: ring,
          }}
        >
          {isValidElement<AvatarProps>(child) && child.type === Avatar ? <Avatar {...child.props} size={child.props.size ?? size} /> : child}
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  pressed: { opacity: 0.7 },
  group: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start" },
})
