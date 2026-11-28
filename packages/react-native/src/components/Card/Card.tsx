import { cloneElement, createContext, isValidElement, useContext, type ReactElement, type ReactNode } from "react"
import { Image, Platform, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native"
import { Pressable } from "../../internal/Pressable"
import { flattenChildren } from "../../internal/children"
import { space } from "../../internal/spacing"
import { barShadow, controlHighlight, elevationShadow, withAlpha } from "../../theme/material"
import { ThemeProvider, useTheme, useThemeOverrides } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { materialType } from "../../theme/typography"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { Text, TextColorProvider } from "../Text/Text"

export type CardVariant = "outline" | "solid" | "ghost" | "elevated"
export type CardSize = "sm" | "md" | "lg"
/** A fill of the palette: the accent, the Plex primary, or a semantic color. */
export type CardColor = "accent" | "primary" | "info" | "success" | "warning" | "caution" | "danger" | "discovery"

export type CardProps = {
  children: ReactNode
  /** @default "outline" */
  variant?: CardVariant
  /** The padding: 12, 16 or 20 on a phone. @default "md" */
  size?: CardSize
  /**
   * Fills the card with a color of the palette (`--color-background-<color>-solid`, the accent for `accent`) in place
   * of its variant's surface: the title, the text and the icons in the color made for it (`--color-text-<color>-solid`),
   * the description that color at 80%. The press is a veil of that text color.
   */
  color?: CardColor
  /** Makes the whole card a button. */
  onPress?: () => void
  /** Shows the press of a card whose own parts take it. */
  interactive?: boolean
  accessibilityLabel?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

/** `padding`: the card's own (0 on a ghost card); `inset`: its size's, which a picture's caption keeps. */
type CardContext = { padding: number; inset: number; radius: number; theme: Theme; ink?: string }
const Context = createContext<CardContext | null>(null)

/** A card's place in a joined Card.Group: its corners are the group's at the ends and square between. */
type GroupPlace = { joined: boolean; first: boolean; last: boolean }
const GroupContext = createContext<GroupPlace | null>(null)

/** A brand's outline round a card (`--card-outline-width`, `--card-outline-color`), none by default. */
function cardOutline(theme: Theme) {
  const width = theme.length("--card-outline-width", 0)
  return width > 0 ? { borderWidth: width, borderColor: theme.color("--card-outline-color", theme.colors.accent) } : null
}

/** A family a brand sets for a part (`--card-title-font-family`): its own face, its weight in it. */
function familyToken(theme: Theme, name: string, weight: "regular" | "medium" | "semibold" | "bold") {
  const family = theme.token(name)
  // The weight goes with the family: Text gives a weight as a family of its own where the fonts come one per weight
  return typeof family === "string" && family.trim()
    ? { fontFamily: family.trim().replace(/^["']|["']$/g, ""), fontWeight: ({ regular: "400", medium: "500", semibold: "600", bold: "700" } as const)[weight] }
    : null
}

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
    // Material's elevated card: the low container lifted at level 1
    if (variant === "elevated") return { backgroundColor: theme.material.surfaceContainerLow, boxShadow: elevationShadow.level1 }
    return { backgroundColor: "transparent" }
  }
  // On a phone an outline card is a section of an inset grouped list (no border, the section's fill: the grouped
  // secondary surface, white on the gray grouped canvas); a solid card takes a gray fill so it stands apart from those
  // sections (Card.module.css, touch.css)
  if (variant === "outline") return { backgroundColor: theme.colors.groupedSurface }
  if (variant === "solid") return { backgroundColor: theme.color("--card-solid-section-background", theme.colors.surfaceSecondary) }
  // Lifted off the page by the soft shadow of a floating control (2 down, 8 across, 6% black; 30% on a dark screen),
  // so a card laid over another reads as on top
  if (variant === "elevated") return { backgroundColor: theme.colors.groupedSurface, boxShadow: barShadow(theme.scheme) }
  return { backgroundColor: "transparent" }
}

/**
 * A card, as @plexui/ui's Card with its parts (`Card.Header`, `.Title`, `.Description`, `.Content`, `.Footer`,
 * `.Action`) and `Card.Media`, a picture to the card's edges with an optional caption over it. iOS: the phone layer's
 * card (`--card-radius` 26, padding 16 or 20, title 17/22 semibold, description 15/20 secondary); Android: the
 * section card of a settings screen (16dp corners, no border, the white card on the gray page; `solid` a gray fill),
 * 16dp padding, Title M and Body M, pressed in the list selector as a List row.
 */
/** A colored card's fill and the color of what stands on it. */
export function cardColors(theme: Theme, color: CardColor) {
  if (color === "accent") return { fill: theme.colors.accent, ink: theme.color("--color-text-accent-solid", "#FFFFFF") }
  return { fill: theme.color(`--color-background-${color}-solid`), ink: theme.color(`--color-text-${color}-solid`, "#FFFFFF") }
}

function CardRoot({ children, variant = "outline", size = "md", color, onPress, interactive = false, accessibilityLabel, testID, style }: CardProps) {
  const theme = useTheme()
  const tint = color ? cardColors(theme, color) : null
  const inset = theme.isAndroid ? (size === "lg" ? 24 : size === "sm" ? 12 : 16) : theme.length(`--card-padding-${size}`, PADDING[size])
  // A ghost card has no padding, as the web's: its parts stand at its edges, unclipped (it has no fill to clip to)
  const ghost = variant === "ghost"
  const padding = ghost ? 0 : inset
  const gap = theme.isAndroid ? inset * 0.75 : space(theme, GAP_STEPS[size])
  // Android's sections round to 16 (a list's sections)
  const group = useContext(GroupContext)
  const overrides = useThemeOverrides()
  // Android's sections round to 16 unless a brand sets the card's corners (the shared token is the phone layer's 26)
  const own = theme.isAndroid ? (overrides?.["--card-radius"] != null ? theme.length("--card-radius", 16) : 16) : theme.length("--card-radius", 26)
  // In a joined group the group draws the corners and the frame: the card is square, the group clips it
  const radius = group?.joined ? 0 : own
  const outline = group?.joined ? null : cardOutline(theme)
  // A picture at either end reaches the card's edges: it learns where it stands
  const parts = flattenChildren(children)
  const body = parts.map((child, index) =>
    isValidElement(child) && child.type === CardMedia
      ? cloneElement(child as ReactElement<CardMediaProps & EdgeProps>, { first: index === 0, last: index === parts.length - 1 })
      : child,
  )
  const surface = tint ? { backgroundColor: tint.fill, ...(variant === "elevated" ? { boxShadow: cardSurface(theme, variant).boxShadow } : null) } : cardSurface(theme, variant)
  const box = [
    styles.card,
    { padding, gap, borderRadius: radius },
    ghost && !tint ? styles.ghost : null,
    // A joined group lifts and frames itself, not each card
    group?.joined ? { ...surface, boxShadow: undefined } : surface,
    outline,
    style,
  ]
  const content = tint ? (
    <Context.Provider value={{ padding, inset, radius, theme, ink: tint.ink }}>
      <TextColorProvider value={tint.ink}>
        <IconDefaultsProvider color={tint.ink}>{body}</IconDefaultsProvider>
      </TextColorProvider>
    </Context.Provider>
  ) : (
    <Context.Provider value={{ padding, inset, radius, theme }}>{body}</Context.Provider>
  )
  if (onPress || interactive) {
    // Android: the press of a row in a section (the settings list selector), as a List row's
    const layer = tint ? withAlpha(tint.ink, 0.12) : theme.isAndroid ? controlHighlight(theme.scheme) : theme.color("--alpha-08")
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
  const atEnd = (child: ReactNode) => isValidElement(child) && (child.type === CardAction || child.type === CardValue)
  const actions = parts.filter(atEnd)
  const text = parts.filter((child) => !atEnd(child))
  return (
    // A value stands on the title's baseline, as a summary card's figure beside its name
    <View testID={testID} style={[styles.header, parts.some((child) => isValidElement(child) && child.type === CardValue) ? styles.baseline : null, style]}>
      <View style={[styles.headerText, theme.isAndroid ? styles.androidHeaderText : null]}>{text}</View>
      {actions}
    </View>
  )
}
CardHeader.displayName = "Card.Header"

function CardTitle({ children }: { children: ReactNode }) {
  const { theme, ink } = useCard("Card.Title")
  // A brand's title (the shared tokens are the phone layer's own): its color on a card of its own fill, its size on Android
  const overrides = useThemeOverrides()
  const type = theme.isAndroid ? materialType.titleMedium : { fontSize: theme.length("--card-title-font-size", 17), lineHeight: theme.length("--card-title-line-height", 22) }
  // The web's title keeps spacing(1.5) under it, which a description takes back
  return (
    <Text
      accessibilityRole="header"
      weight={theme.isAndroid ? "medium" : "semibold"}
      color={!ink && overrides?.["--card-title-color"] != null ? theme.color("--card-title-color") : undefined}
      style={[
        { fontSize: type.fontSize, lineHeight: type.lineHeight },
        theme.isAndroid && overrides?.["--card-title-font-size"] != null ? { fontSize: theme.length("--card-title-font-size", type.fontSize) } : null,
        theme.isAndroid && overrides?.["--card-title-line-height"] != null ? { lineHeight: theme.length("--card-title-line-height", type.lineHeight) } : null,
        familyToken(theme, "--card-title-font-family", theme.isAndroid ? "medium" : "semibold"),
        theme.isIOS ? { marginBottom: space(theme, 1.5) } : null,
      ]}
    >
      {children}
    </Text>
  )
}
CardTitle.displayName = "Card.Title"

function CardDescription({ children }: { children: ReactNode }) {
  const { theme, ink } = useCard("Card.Description")
  const type = theme.isAndroid ? materialType.bodyMedium : { fontSize: theme.length("--card-description-font-size", 15), lineHeight: theme.length("--card-description-line-height", 20) }
  return (
    <Text
      color={ink ? withAlpha(ink, 0.8) : theme.isAndroid ? "secondary" : theme.color("--card-description-color", theme.colors.textSecondary)}
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

/**
 * A value at the end of the header, as Health's and Fitness's summary cards set a figure beside the title: iOS Title 2
 * (22/28) semibold in the accent, Material's Headline Small in primary. A brand sets `--card-value-color`,
 * `--card-value-font-size`, `--card-value-line-height` and `--card-value-font-family`. A string is drawn in it; any
 * other node (a RollingNumber) takes its color.
 */
function CardValue({ children, style, testID }: SlotProps) {
  const { theme, ink } = useCard("Card.Value")
  const type = theme.isAndroid ? materialType.headlineSmall : { fontSize: 22, lineHeight: 28 }
  const color = theme.token("--card-value-color") != null ? theme.color("--card-value-color") : (ink ?? (theme.isAndroid ? theme.material.primary : theme.colors.accent))
  const text = {
    fontSize: theme.length("--card-value-font-size", type.fontSize),
    lineHeight: theme.length("--card-value-line-height", type.lineHeight),
  }
  return (
    <View testID={testID} style={[styles.value, style]}>
      {typeof children === "string" || typeof children === "number" ? (
        <Text weight={theme.isAndroid ? "regular" : "semibold"} color={color} style={[text, familyToken(theme, "--card-value-font-family", theme.isAndroid ? "regular" : "semibold"), { fontVariant: ["tabular-nums"] }]}>
          {children}
        </Text>
      ) : (
        <TextColorProvider value={color}>{children}</TextColorProvider>
      )}
    </View>
  )
}
CardValue.displayName = "Card.Value"

export type CardGroupProps = {
  /** The cards, each a Card. */
  children: ReactNode
  /**
   * One inset grouped section, the cards joined with the list's hairline between them, as Apple joins a section's
   * rows (Android: one card with dividers). `false` sets them `--card-group-gap` (16) apart. @default true
   */
  joined?: boolean
  testID?: string
  style?: StyleProp<ViewStyle>
}

/**
 * Cards together: joined (the default) as one inset grouped section with a hairline between them, inset by the
 * card's padding as a list's separators; a brand's outline (`--card-outline-width`, `--card-outline-color`) frames the
 * whole group and runs between the cards across it. Apart, `--card-group-gap` (16) between them.
 */
function CardGroup({ children, joined = true, testID, style }: CardGroupProps) {
  const theme = useTheme()
  const overrides = useThemeOverrides()
  const cards = flattenChildren(children).filter((child) => isValidElement(child))
  if (!joined) {
    return (
      <View testID={testID} style={[styles.group, { gap: theme.length("--card-group-gap", 16) }, style]}>
        {cards.map((card, index) => (
          <GroupContext.Provider key={(isValidElement(card) && card.key) || index} value={{ joined: false, first: index === 0, last: index === cards.length - 1 }}>
            {card}
          </GroupContext.Provider>
        ))}
      </View>
    )
  }
  const radius = theme.isAndroid ? (overrides?.["--card-radius"] != null ? theme.length("--card-radius", 16) : 16) : theme.length("--card-radius", 26)
  const outline = cardOutline(theme)
  const inset = theme.isAndroid ? 0 : theme.length("--card-padding-md", PADDING.md)
  // The frame runs between the cards when there is one; else the list's hairline, inset as a section's rows
  const line = outline
    ? { height: outline.borderWidth, backgroundColor: outline.borderColor }
    : { height: StyleSheet.hairlineWidth, marginStart: inset, backgroundColor: theme.isAndroid ? theme.material.outlineVariant : theme.colors.separator }
  return (
    <View testID={testID} style={[styles.group, styles.joined, { borderRadius: radius }, outline, style]}>
      {cards.map((card, index) => (
        <GroupContext.Provider key={(isValidElement(card) && card.key) || index} value={{ joined: true, first: index === 0, last: index === cards.length - 1 }}>
          {index > 0 ? <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[line, styles.line]} /> : null}
          {card}
        </GroupContext.Provider>
      ))}
    </View>
  )
}
CardGroup.displayName = "Card.Group"

type EdgeProps = { first?: boolean; last?: boolean }

export type CardMediaProps = {
  /** The picture; without it the media is `fill` (a color or a gradient), or a slot of its own (`background`). */
  source?: ImageSourcePropType
  /**
   * The media's fill where there is no picture, or under a picture with clear parts: a color or a CSS gradient
   * (`linear-gradient(...)`). Defaults to `--media-card-fill`, else the gray of a placeholder.
   */
  fill?: string
  /** Anything drawn as the media itself (a video, an animation), under the scrim and the words. */
  background?: ReactNode
  /** Width over height. @default 16 / 9, or 4 / 5 at `size="lg"` */
  aspectRatio?: number
  /** A height instead of a ratio (`--media-card-height` too). */
  height?: number
  /**
   * `md`: a caption over the picture's foot (17/22 semibold, 15/20). `lg`: a suggestion card as Fitness+ and Journal
   * draw it, the media filling the card, Title 2 bold and Subheadline in white over a scrim from its foot, a meta row
   * and an action at the end (Android: Material's elevated card, the media on top and the words under it).
   * @default "md"
   */
  size?: "md" | "lg"
  /** The picture's description for a screen reader; without it the picture is decorative. */
  accessibilityLabel?: string
  /** A caption over the bottom of the picture, white on a dark gradient. */
  title?: ReactNode
  description?: ReactNode
  /** A row under the words: a symbol and a time, or a ring of progress, in the words' color. */
  meta?: ReactNode
  /** An action at the end of the meta row, such as a small capsule Button. */
  action?: ReactNode
  /** Anything else over the picture, at its bottom. */
  children?: ReactNode
  testID?: string
}

/**
 * A picture that reaches the card's edges where it stands first or last, with a caption over it: the title and
 * description in white over a gradient that darkens the bottom (iOS 17/22 semibold and 15/20; Material Title M and
 * Body M). `size="lg"` is a suggestion card (Fitness+, Journal): Title 2 bold and Subheadline over a scrim, a meta
 * row and an action, the card's corners (26); on Android the media on top and the words under it, as Material's
 * elevated card. A brand sets `--media-card-fill`, `--media-card-ink` (the words, white by default),
 * `--media-card-title-font-size`, `--media-card-title-line-height`, `--media-card-title-font-family` and
 * `--media-card-height`.
 */
function CardMedia({
  source,
  fill,
  background,
  aspectRatio,
  height,
  size = "md",
  accessibilityLabel,
  title,
  description,
  meta,
  action,
  children,
  testID,
  first,
  last,
}: CardMediaProps & EdgeProps) {
  const { padding, inset, radius, theme, ink: cardInk } = useCard("Card.Media")
  const large = size === "lg"
  const under = large && theme.isAndroid
  const caption = title != null || description != null || children != null || meta != null || action != null
  const titleType = large
    ? theme.isAndroid
      ? materialType.titleLarge
      : { fontSize: 22, lineHeight: 28 }
    : theme.isAndroid
      ? materialType.titleMedium
      : { fontSize: theme.length("--card-title-font-size", 17), lineHeight: theme.length("--card-title-line-height", 22) }
  const bodyType = theme.isAndroid ? materialType.bodyMedium : large ? { fontSize: 15, lineHeight: 20 } : { fontSize: theme.length("--card-description-font-size", 15), lineHeight: theme.length("--card-description-line-height", 20) }
  const titleSize = large ? { fontSize: theme.length("--media-card-title-font-size", titleType.fontSize), lineHeight: theme.length("--media-card-title-line-height", titleType.lineHeight) } : titleType
  // The words over the media: white, or the brand's ink; under it (Android's large card) the card's own colors
  const ink = under ? (cardInk ?? theme.material.onSurface) : theme.token("--media-card-ink") != null ? theme.color("--media-card-ink") : "#ffffff"
  const soft = under ? (cardInk ? withAlpha(cardInk, 0.8) : theme.material.onSurfaceVariant) : withAlpha(ink, 0.8)
  const shown = fill ?? (theme.token("--media-card-fill") != null ? String(theme.token("--media-card-fill")) : undefined)
  const paint = shown ? (/gradient\(/.test(shown) ? ({ backgroundImage: shown } as ViewStyle) : { backgroundColor: theme.color(shown, shown) }) : source || background ? null : { backgroundColor: theme.colors.surfaceSecondary }
  const tall = height ?? (theme.token("--media-card-height") != null ? theme.length("--media-card-height") : undefined)
  const box = tall ? { height: tall } : { aspectRatio: aspectRatio ?? (large && !under ? 4 / 5 : 16 / 9) }
  const words = (
    <>
      {title != null ? (
        <Text
          color={ink}
          weight={theme.isAndroid ? (large ? "regular" : "medium") : large ? "bold" : "semibold"}
          style={[titleSize, large ? familyToken(theme, "--media-card-title-font-family", theme.isAndroid ? "regular" : "bold") : null]}
        >
          {title}
        </Text>
      ) : null}
      {description != null ? (
        <Text color={soft} style={{ fontSize: bodyType.fontSize, lineHeight: bodyType.lineHeight }}>
          {description}
        </Text>
      ) : null}
      {meta != null || action != null ? (
        <View style={[styles.meta, { marginTop: large ? 12 : 8 }]}>
          <View style={styles.metaText}>
            <TextColorProvider value={soft}>
              <IconDefaultsProvider color={soft}>{meta}</IconDefaultsProvider>
            </TextColorProvider>
          </View>
          {/* Over the scrim the action is in the dark scheme, as on a dark picture: a primary Button is the white capsule */}
          {under ? action : <ThemeProvider scheme="dark">{action}</ThemeProvider>}
        </View>
      ) : null}
      {children}
    </>
  )
  const media = (
    <View
      testID={under ? undefined : testID}
      style={[
        styles.media,
        box,
        paint,
        { marginHorizontal: -padding },
        // Its own corners at the card's, as a ghost card does not clip
        first ? { marginTop: -padding, borderTopLeftRadius: radius, borderTopRightRadius: radius } : null,
        last && !under ? { marginBottom: -padding, borderBottomLeftRadius: radius, borderBottomRightRadius: radius } : null,
      ]}
    >
      {background != null ? <View style={StyleSheet.absoluteFill}>{background}</View> : null}
      {source ? (
        <Image
          source={source}
          resizeMode="cover"
          accessible={!!accessibilityLabel}
          accessibilityLabel={accessibilityLabel}
          accessibilityIgnoresInvertColors
          style={styles.picture}
        />
      ) : null}
      {caption && !under ? (
        <View style={[styles.caption, { padding: large ? theme.length("--card-padding-lg", PADDING.lg) : inset, gap: large ? 4 : 2 }]}>
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, large ? styles.scrimLarge : styles.scrim]} />
          {words}
        </View>
      ) : null}
    </View>
  )
  if (!under) return media
  // Android's elevated card: the media on top, the words under it in the card's colors
  return (
    <View testID={testID} style={styles.under}>
      {media}
      {caption ? <View style={styles.underWords}>{words}</View> : null}
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
  Value: CardValue,
  Media: CardMedia,
  Group: CardGroup,
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
  value: {},
  baseline: { alignItems: "baseline" },
  group: { alignSelf: "stretch" },
  joined: { overflow: "hidden", borderCurve: "continuous" },
  line: { alignSelf: "stretch" },
  media: { overflow: "hidden", borderCurve: "continuous", justifyContent: "flex-end" },
  // A bundled picture brings its own width and height: the full size of the box overrides them
  picture: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
  caption: { paddingTop: 40 },
  meta: { flexDirection: "row", alignItems: "center", gap: 12 },
  metaText: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 6 },
  under: { gap: 16 },
  underWords: { gap: 4 },
  // A suggestion card's scrim: from clear at the middle to dark at the foot, so the words read on any media
  scrimLarge: { backgroundImage: "linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.55) 100%)" } as ViewStyle,
  // A gradient that darkens the bottom of the picture so the white caption reads over any picture
  scrim: { backgroundImage: "linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.6))" } as ViewStyle,
})
