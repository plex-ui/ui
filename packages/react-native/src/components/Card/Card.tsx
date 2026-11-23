import { cloneElement, createContext, isValidElement, useContext, type ReactElement, type ReactNode } from "react"
import { Image, Platform, Pressable, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native"
import { flattenChildren } from "../../internal/children"
import { space } from "../../internal/spacing"
import { controlHighlight } from "../../theme/material"
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

/** `padding`: the card's own (0 on a ghost card); `inset`: its size's, which a picture's caption keeps. */
type CardContext = { padding: number; inset: number; radius: number; theme: Theme }
const Context = createContext<CardContext | null>(null)

function useCard(part: string) {
  const context = useContext(Context)
  if (!context) throw new Error(`${part} must be inside a Card`)
  return context
}

const PADDING: Record<CardSize, number> = { sm: 12, md: 16, lg: 20 }
/** The web card's gaps between its parts, in steps of `--spacing`: 12, 16 and 20. */
const GAP_STEPS: Record<CardSize, number> = { sm: 3, md: 4, lg: 5 }

/**
 * The fill and border of a card: a section of an iOS inset grouped list, or on Android a section card of a
 * settings screen (the Android look has no card of its own): no border, the card's color on the gray page.
 */
export function cardSurface(theme: Theme, variant: CardVariant) {
  if (theme.isAndroid) {
    // `outline` is the white section card, as a List's (the card's white); `solid` a gray fill that stands apart
    // from those cards on the page
    if (variant === "outline") return { backgroundColor: theme.colors.groupedSurface }
    if (variant === "solid") return { backgroundColor: theme.material.surfaceContainerHigh }
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
 * card (`--card-radius` 26, padding 16 or 20, title 17/22 semibold, description 15/20 secondary); Android: the
 * section card of a settings screen (16dp corners, no border, the white card on the gray page; `solid` a gray fill),
 * 16dp padding, Title M and Body M, pressed in the list selector as a List row.
 */
function CardRoot({ children, variant = "outline", size = "md", onPress, interactive = false, accessibilityLabel, testID, style }: CardProps) {
  const theme = useTheme()
  const inset = theme.isAndroid ? (size === "lg" ? 24 : size === "sm" ? 12 : 16) : theme.length(`--card-padding-${size}`, PADDING[size])
  // A ghost card has no padding, as the web's: its parts stand at its edges, unclipped (it has no fill to clip to)
  const ghost = variant === "ghost"
  const padding = ghost ? 0 : inset
  const gap = theme.isAndroid ? inset * 0.75 : space(theme, GAP_STEPS[size])
  // Android's sections round to 16 (a list's sections)
  const radius = theme.isAndroid ? 16 : theme.length("--card-radius", 26)
  // A picture at either end reaches the card's edges: it learns where it stands
  const parts = flattenChildren(children)
  const body = parts.map((child, index) =>
    isValidElement(child) && child.type === CardMedia
      ? cloneElement(child as ReactElement<CardMediaProps & EdgeProps>, { first: index === 0, last: index === parts.length - 1 })
      : child,
  )
  const box = [styles.card, { padding, gap, borderRadius: radius }, ghost ? styles.ghost : null, cardSurface(theme, variant), style]
  const content = <Context.Provider value={{ padding, inset, radius, theme }}>{body}</Context.Provider>
  if (onPress || interactive) {
    // Android: the press of a row in a section (the settings list selector), as a List row's
    const layer = theme.isAndroid ? controlHighlight(theme.scheme) : theme.color("--alpha-08")
    // The ripple on a device, clipped to the card's corners; a layer elsewhere
    const nativeRipple = theme.isAndroid && Platform.OS === "android"
    return (
      <Pressable
        // A card that only shows the press of its own parts is no element of its own for a screen reader
        accessible={!!onPress}
        focusable={!!onPress}
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        android_ripple={nativeRipple ? { color: layer, foreground: true } : undefined}
        testID={testID}
        style={box}
      >
        {({ pressed }) => (
          <>
            {content}
            {pressed && !nativeRipple ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, backgroundColor: layer }]} /> : null}
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
  const { theme } = useCard("Card.Header")
  const parts = flattenChildren(children)
  const actions = parts.filter((child) => isValidElement(child) && child.type === CardAction)
  const text = parts.filter((child) => !(isValidElement(child) && child.type === CardAction))
  return (
    <View testID={testID} style={[styles.header, style]}>
      <View style={[styles.headerText, theme.isAndroid ? styles.androidHeaderText : null]}>{text}</View>
      {actions}
    </View>
  )
}
CardHeader.displayName = "Card.Header"

function CardTitle({ children }: { children: ReactNode }) {
  const { theme } = useCard("Card.Title")
  const type = theme.isAndroid ? materialType.titleMedium : { fontSize: theme.length("--card-title-font-size", 17), lineHeight: theme.length("--card-title-line-height", 22) }
  // The web's title keeps spacing(1.5) under it, which a description takes back
  return (
    <Text
      accessibilityRole="header"
      weight={theme.isAndroid ? "medium" : "semibold"}
      style={[{ fontSize: type.fontSize, lineHeight: type.lineHeight }, theme.isIOS ? { marginBottom: space(theme, 1.5) } : null]}
    >
      {children}
    </Text>
  )
}
CardTitle.displayName = "Card.Title"

function CardDescription({ children }: { children: ReactNode }) {
  const { theme } = useCard("Card.Description")
  const type = theme.isAndroid ? materialType.bodyMedium : { fontSize: theme.length("--card-description-font-size", 15), lineHeight: theme.length("--card-description-line-height", 20) }
  return (
    <Text
      color={theme.isAndroid ? "secondary" : theme.color("--card-description-color", theme.colors.textSecondary)}
      style={[{ fontSize: type.fontSize, lineHeight: type.lineHeight }, theme.isIOS ? { marginTop: -space(theme, 1.5) } : null]}
    >
      {children}
    </Text>
  )
}
CardDescription.displayName = "Card.Description"

function CardContent({ children, style, testID }: SlotProps) {
  const { theme } = useCard("Card.Content")
  return (
    <View testID={testID} style={[styles.content, theme.isIOS ? { gap: space(theme, 3) } : null, style]}>
      {children}
    </View>
  )
}
CardContent.displayName = "Card.Content"

/** The buttons at the bottom, end-aligned on Android as Material's card actions. */
function CardFooter({ children, style, testID }: SlotProps) {
  const { theme } = useCard("Card.Footer")
  return (
    <View testID={testID} style={[styles.footer, theme.isAndroid ? styles.footerEnd : { gap: space(theme, 2), marginTop: space(theme, 3) }, style]}>
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
  const { padding, inset, radius, theme } = useCard("Card.Media")
  const caption = title != null || description != null || children != null
  const titleType = theme.isAndroid ? materialType.titleMedium : { fontSize: theme.length("--card-title-font-size", 17), lineHeight: theme.length("--card-title-line-height", 22) }
  const bodyType = theme.isAndroid ? materialType.bodyMedium : { fontSize: theme.length("--card-description-font-size", 15), lineHeight: theme.length("--card-description-line-height", 20) }
  return (
    <View
      testID={testID}
      style={[
        styles.media,
        { aspectRatio, marginHorizontal: -padding },
        // Its own corners at the card's, as a ghost card does not clip
        first ? { marginTop: -padding, borderTopLeftRadius: radius, borderTopRightRadius: radius } : null,
        last ? { marginBottom: -padding, borderBottomLeftRadius: radius, borderBottomRightRadius: radius } : null,
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
        <View style={[styles.caption, { padding: inset }]}>
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
  ghost: { overflow: "visible" },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  headerText: { flex: 1, minWidth: 0 },
  androidHeaderText: { gap: 2 },
  content: { gap: 8 },
  footer: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 4 },
  footerEnd: { justifyContent: "flex-end" },
  action: { marginTop: -4, marginEnd: -4 },
  media: { overflow: "hidden", borderCurve: "continuous", justifyContent: "flex-end" },
  // A bundled picture brings its own width and height: the full size of the box overrides them
  picture: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  caption: { paddingTop: 40, gap: 2 },
  // A gradient that darkens the bottom of the picture so the white caption reads over any picture
  scrim: { backgroundImage: "linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.6))" } as ViewStyle,
})
