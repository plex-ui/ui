import { Children, isValidElement, useState, type ComponentType, type ReactNode } from "react"
import { Image, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import type { IconProps } from "../Icon/createIcon"
import { Text } from "../Text/Text"

export type AvatarColor = "primary" | "secondary" | "success" | "info" | "discovery" | "danger"

export type AvatarProps = {
  /** The person's name: its first letter is the placeholder, and it names an avatar that is a button. */
  name?: string
  /** A picture over the placeholder; when it fails to load, the placeholder stays. */
  imageUrl?: string
  /** @default "secondary" */
  color?: AvatarColor
  /** @default "soft" */
  variant?: "soft" | "solid"
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

function overflowText(count: number) {
  return new Intl.NumberFormat("en", { notation: "compact", compactDisplay: "short", maximumFractionDigits: 0 }).format(count).toLowerCase()
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
 * `--avatar-image-border-color`). iOS and Android draw it alike: neither platform has an avatar of its own.
 */
export function Avatar({ name, imageUrl, color = "secondary", variant = "soft", size: sizeProp, Icon, overflowCount, onPress, accessibilityLabel, testID, style }: AvatarProps) {
  const theme = useTheme()
  const [failed, setFailed] = useState(false)
  // A new picture gets its own try, even one that failed before
  const [shown, setShown] = useState(imageUrl)
  if (shown !== imageUrl) {
    setShown(imageUrl)
    setFailed(false)
  }
  const size = sizeProp ?? theme.length("--avatar-size", 28)
  const colors = avatarColors(theme, color, variant)
  const label = overflowCount ? overflowText(overflowCount) : null
  const scale = label ? [0.45, 0.45, 0.37, 0.3][Math.min(3, label.length)] : 0.5
  const fontSize = size * (label ? theme.length(`--avatar-overflow-font-size-scaling-${["one", "one", "two", "three"][Math.min(3, label.length)]}`, scale) : theme.length("--avatar-font-size-scaling", 0.5))
  const placeholder = label ? (
    <Text weight="semibold" color={colors.text} style={{ fontSize, lineHeight: fontSize * 1.2 }}>
      +{label}
    </Text>
  ) : Icon ? (
    <Icon size={Math.round(size * 0.6)} color={colors.text} />
  ) : (
    <Text weight="semibold" color={colors.text} style={{ fontSize, lineHeight: fontSize * 1.2 }}>
      {initialOf(name ?? "")}
    </Text>
  )
  const showImage = !!imageUrl && !failed
  const body = (
    <>
      {placeholder}
      {showImage ? (
        <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, overflow: "hidden" }]}>
          <Image source={{ uri: imageUrl }} onError={() => setFailed(true)} style={StyleSheet.absoluteFill} accessibilityIgnoresInvertColors />
          {/* The hairline over the picture, inside its edge, so it does not change the size */}
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: size / 2, borderWidth: 1, borderColor: theme.color("--avatar-image-border-color") }]} />
        </View>
      ) : null}
    </>
  )
  const box = [styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.background }, style]
  if (onPress) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? name} onPress={onPress} testID={testID} style={({ pressed }) => [box, pressed ? styles.pressed : null]}>
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

export type AvatarGroupProps = {
  children: ReactNode
  /** The size of every avatar. @default 28 */
  size?: number
  testID?: string
  style?: StyleProp<ViewStyle>
}

/**
 * Avatars that overlap, each cut out of the one before it by a ring of the surface (`--avatar-group-spacing` -8,
 * `--avatar-group-cutout-width` 3, `--avatar-group-cutout-color`), as @plexui/ui's AvatarGroup.
 */
export function AvatarGroup({ children, size: sizeProp, testID, style }: AvatarGroupProps) {
  const theme = useTheme()
  const size = sizeProp ?? theme.length("--avatar-size", 28)
  const cutout = theme.length("--avatar-group-cutout-width", 3)
  const ring = theme.isAndroid ? theme.material.surface : theme.color("--avatar-group-cutout-color")
  const items = Children.toArray(children).filter(isValidElement)
  return (
    <View accessibilityRole="list" testID={testID} style={[styles.group, { padding: cutout }, style]}>
      {items.map((child, index) => (
        <View
          key={child.key ?? index}
          style={{
            // The ring of the surface around each avatar cuts it out of the one before it
            marginVertical: -cutout,
            marginLeft: (index === 0 ? 0 : theme.length("--avatar-group-spacing", -8)) - cutout,
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
