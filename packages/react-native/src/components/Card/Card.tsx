import { cloneElement, createContext, isValidElement, useContext, type ReactElement, type ReactNode } from "react"
import { Image, Pressable, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native"
import { flattenChildren } from "../../internal/children"
import { stateLayer, withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { materialType } from "../../theme/typography"
import { Text } from "../Text/Text"

export type CardVariant = "outline" | "solid" | "ghost"
export type CardSize = "sm" | "md" | "lg"

export type CardProps = {
  children: ReactNode
  /** @default "outline" */
  variant?: CardVariant
  /** The padding: 12, 16 or 20 on a phone. @default "md" */
  size?: CardSize
  /** Makes the whole card a button. */
  onPress?: () => void
  /** Shows the press of a card whose own parts take it. */
  interactive?: boolean
  accessibilityLabel?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

type CardContext = { padding: number; theme: Theme }
const Context = createContext<CardContext | null>(null)

function useCard(part: string) {
  const context = useContext(Context)
  if (!context) throw new Error(`${part} must be inside a Card`)
  return context
}

const PADDING: Record<CardSize, number> = { sm: 12, md: 16, lg: 20 }

/** The fill and border of a card: a section of an iOS inset grouped list, or Material 3's outlined, filled card. */
export function cardSurface(theme: Theme, variant: CardVariant) {
  if (theme.isAndroid) {
    const m = theme.material
    if (variant === "outline") return { backgroundColor: m.surface, borderColor: m.outlineVariant, borderWidth: 1 }
    if (variant === "solid") return { backgroundColor: m.surfaceContainerHighest }
    return { backgroundColor: "transparent" }
  }
  // On a phone an outline card is a section of an inset grouped list (no border, the section's fill: the grouped
  // secondary surface, white on the gray grouped canvas); a solid card takes a gray fill so it stands apart from those
  // sections (Card.module.css, touch.css)
  if (variant === "outline") return { backgroundColor: theme.colors.groupedSurface }
  if (variant === "solid") return { backgroundColor: theme.color("--card-solid-section-background", theme.colors.surfaceSecondary) }
  return { backgroundColor: "transparent" }
}

/**
 * A card, as @plexui/ui's Card with its parts (`Card.Header`, `.Title`, `.Description`, `.Content`, `.Footer`,
 * `.Action`) and `Card.Media`, a picture to the card's edges with an optional caption over it. iOS: the phone layer's
 * card (`--card-radius` 26, padding 16 or 20, title 17/22 semibold, description 15/20 secondary); Android: Material
 * 3's cards (12dp corners, outlined on `surface` with `outlineVariant`, filled on `surfaceContainerHighest`, 16dp
 * padding, Title M and Body M).
 */
function CardRoot({ children, variant = "outline", size = "md", onPress, interactive = false, accessibilityLabel, testID, style }: CardProps) {
  const theme = useTheme()
  const padding = theme.isAndroid ? (size === "lg" ? 24 : size === "sm" ? 12 : 16) : theme.length(`--card-padding-${size}`, PADDING[size])
  const radius = theme.isAndroid ? 12 : theme.length("--card-radius", 26)
  // A picture at either end reaches the card's edges: it learns where it stands
  const parts = flattenChildren(children)
  const body = parts.map((child, index) =>
    isValidElement(child) && child.type === CardMedia
      ? cloneElement(child as ReactElement<CardMediaProps & EdgeProps>, { first: index === 0, last: index === parts.length - 1 })
      : child,
  )
  const box = [styles.card, { padding, gap: padding * 0.75, borderRadius: radius }, cardSurface(theme, variant), style]
  const content = <Context.Provider value={{ padding, theme }}>{body}</Context.Provider>
  if (onPress || interactive) {
    const layer = theme.isAndroid ? withAlpha(theme.material.onSurface, stateLayer.pressed) : theme.color("--alpha-08")
    return (
      <Pressable
        // A card that only shows the press of its own parts is no element of its own for a screen reader
        accessible={!!onPress}
        focusable={!!onPress}
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        testID={testID}
        style={box}
      >
        {({ pressed }) => (
          <>
            {content}
            {pressed ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: layer }]} /> : null}
          </>
        )}
      </Pressable>
    )
  }
  return (
    <View accessibilityLabel={accessibilityLabel} testID={testID} style={box}>
      {content}
    </View>
  )
}
CardRoot.displayName = "Card"

type SlotProps = { children?: ReactNode; style?: StyleProp<ViewStyle>; testID?: string }

/** The title, the description and an action at its end. */
function CardHeader({ children, style, testID }: SlotProps) {
  const parts = flattenChildren(children)
  const actions = parts.filter((child) => isValidElement(child) && child.type === CardAction)
  const text = parts.filter((child) => !(isValidElement(child) && child.type === CardAction))
  return (
    <View testID={testID} style={[styles.header, style]}>
      <View style={styles.headerText}>{text}</View>
      {actions}
    </View>
  )
}
CardHeader.displayName = "Card.Header"

function CardTitle({ children }: { children: ReactNode }) {
  const { theme } = useCard("Card.Title")
  const type = theme.isAndroid ? materialType.titleMedium : { fontSize: theme.length("--card-title-font-size", 17), lineHeight: theme.length("--card-title-line-height", 22) }
  return (
    <Text accessibilityRole="header" weight={theme.isAndroid ? "medium" : "semibold"} style={{ fontSize: type.fontSize, lineHeight: type.lineHeight }}>
      {children}
    </Text>
  )
}
CardTitle.displayName = "Card.Title"

function CardDescription({ children }: { children: ReactNode }) {
  const { theme } = useCard("Card.Description")
  const type = theme.isAndroid ? materialType.bodyMedium : { fontSize: theme.length("--card-description-font-size", 15), lineHeight: theme.length("--card-description-line-height", 20) }
  return (
    <Text color={theme.isAndroid ? "secondary" : theme.color("--card-description-color", theme.colors.textSecondary)} style={{ fontSize: type.fontSize, lineHeight: type.lineHeight }}>
      {children}
    </Text>
  )
}
CardDescription.displayName = "Card.Description"

function CardContent({ children, style, testID }: SlotProps) {
  return (
    <View testID={testID} style={[styles.content, style]}>
      {children}
    </View>
  )
}
CardContent.displayName = "Card.Content"

/** The buttons at the bottom, end-aligned on Android as Material's card actions. */
function CardFooter({ children, style, testID }: SlotProps) {
  const { theme } = useCard("Card.Footer")
  return (
    <View testID={testID} style={[styles.footer, theme.isAndroid ? styles.footerEnd : null, style]}>
      {children}
    </View>
  )
}
CardFooter.displayName = "Card.Footer"

/** An action at the end of the header (a menu or a close button). */
function CardAction({ children, style, testID }: SlotProps) {
  return (
    <View testID={testID} style={[styles.action, style]}>
      {children}
    </View>
  )
}
CardAction.displayName = "Card.Action"

type EdgeProps = { first?: boolean; last?: boolean }

export type CardMediaProps = {
  source: ImageSourcePropType
  /** Width over height. @default 16 / 9 */
  aspectRatio?: number
  /** The picture's description for a screen reader; without it the picture is decorative. */
  accessibilityLabel?: string
  /** A caption over the bottom of the picture, white on a dark gradient. */
  title?: ReactNode
  description?: ReactNode
  /** Anything else over the picture, at its bottom. */
  children?: ReactNode
  testID?: string
}

/**
 * A picture that reaches the card's edges where it stands first or last, with a caption over it: the title and
 * description in white over a gradient that darkens the bottom (iOS 17/22 semibold and 15/20; Material Title M and
 * Body M).
 */
function CardMedia({ source, aspectRatio = 16 / 9, accessibilityLabel, title, description, children, testID, first, last }: CardMediaProps & EdgeProps) {
  const { padding, theme } = useCard("Card.Media")
  const caption = title != null || description != null || children != null
  const titleType = theme.isAndroid ? materialType.titleMedium : { fontSize: 17, lineHeight: 22 }
  const bodyType = theme.isAndroid ? materialType.bodyMedium : { fontSize: 15, lineHeight: 20 }
  return (
    <View
      testID={testID}
      style={[
        styles.media,
        { aspectRatio, marginHorizontal: -padding },
        first ? { marginTop: -padding } : null,
        last ? { marginBottom: -padding } : null,
      ]}
    >
      <Image
        source={source}
        resizeMode="cover"
        accessible={!!accessibilityLabel}
        accessibilityLabel={accessibilityLabel}
        accessibilityIgnoresInvertColors
        style={styles.picture}
      />
      {caption ? (
        <View style={[styles.caption, { padding }]}>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim]} />
          {title != null ? (
            <Text color="#ffffff" weight={theme.isAndroid ? "medium" : "semibold"} style={{ fontSize: titleType.fontSize, lineHeight: titleType.lineHeight }}>
              {title}
            </Text>
          ) : null}
          {description != null ? (
            <Text color="rgba(255, 255, 255, 0.8)" style={{ fontSize: bodyType.fontSize, lineHeight: bodyType.lineHeight }}>
              {description}
            </Text>
          ) : null}
          {children}
        </View>
      ) : null}
    </View>
  )
}
CardMedia.displayName = "Card.Media"

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Content: CardContent,
  Footer: CardFooter,
  Action: CardAction,
  Media: CardMedia,
})

const styles = StyleSheet.create({
  card: { overflow: "hidden", borderCurve: "continuous", alignSelf: "stretch" },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  content: { gap: 8 },
  footer: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 4 },
  footerEnd: { justifyContent: "flex-end" },
  action: { marginTop: -4, marginRight: -4 },
  media: { overflow: "hidden", justifyContent: "flex-end" },
  // A bundled picture brings its own width and height: the full size of the box overrides them
  picture: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  caption: { paddingTop: 40, gap: 2 },
  // A gradient that darkens the bottom of the picture so the white caption reads over any picture
  scrim: { backgroundImage: "linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.6))" } as ViewStyle,
})
