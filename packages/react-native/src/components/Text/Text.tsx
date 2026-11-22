import { createContext, useContext, type ReactNode } from "react"
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from "react-native"
import { useTheme } from "../../theme/ThemeProvider"
import type { FontWeightName, Theme } from "../../theme/types"
import { typeStyle, type HeadingSize, type TextSize, type TextVariant } from "../../theme/typography"

export type TextColor =
  | "primary"
  | "secondary"
  | "tertiary"
  | "disabled"
  | "inverse"
  | "accent"
  | "danger"
  | "success"
  | "warning"
  | "caution"
  | "info"
  | "discovery"

export type TextProps = RNTextProps & {
  /** A text style of the platform (iOS names; Material 3 roles on Android). @default "body" */
  variant?: TextVariant
  /** A size of the Plex UI scale instead of a platform style (`--font-text-*`). */
  size?: TextSize
  weight?: FontWeightName
  /** A semantic color, or any color string. @default "primary" */
  color?: TextColor | (string & {})
  align?: TextStyle["textAlign"]
  /** The monospace face of the kit. */
  mono?: boolean
  /** Figures of one width, for counters and prices. */
  tabularNums?: boolean
  children?: ReactNode
}

/** The color of a text on Android follows Material's roles; on iOS the label roles of the phone layer. */
export function textColor(theme: Theme, color: TextColor | (string & {}) = "primary"): string {
  switch (color) {
    case "primary":
      return theme.isAndroid ? theme.material.onSurface : theme.colors.text
    case "secondary":
      return theme.isAndroid ? theme.material.onSurfaceVariant : theme.colors.textSecondary
    case "tertiary":
      return theme.isAndroid ? theme.material.outline : theme.colors.textTertiary
    case "disabled":
      return theme.colors.textDisabled
    case "inverse":
      return theme.colors.textInverse
    case "accent":
      return theme.colors.textAccent
    case "danger":
    case "success":
    case "warning":
    case "caution":
    case "info":
    case "discovery":
      return theme.color(`--color-text-${color}`)
    default:
      return color
  }
}

// A text inside a control (a button's label) takes the control's color unless it sets its own
const TextColorContext = createContext<string | undefined>(undefined)
export const TextColorProvider = TextColorContext.Provider

export function textStyle(
  theme: Theme,
  { variant = "body", size, weight, mono }: Pick<TextProps, "variant" | "size" | "weight" | "mono">,
): TextStyle {
  let fontSize: number
  let lineHeight: number
  let base: FontWeightName
  if (size) {
    fontSize = theme.length(`--font-text-${size}-size`, 16)
    lineHeight = theme.length(`--font-text-${size}-line-height`, fontSize * 1.4)
    base = "regular"
  } else {
    const style = typeStyle(theme.platform, variant)
    fontSize = style.fontSize
    lineHeight = style.lineHeight
    base = style.weight
  }
  return {
    fontSize,
    lineHeight,
    ...(mono ? { ...theme.monoFont, fontWeight: weight ? weightNumber(weight) : undefined } : theme.font(weight ?? base)),
    letterSpacing: mono ? 0 : theme.tracking(fontSize),
  }
}

const weightNumber = (weight: FontWeightName) => ({ regular: "400", medium: "500", semibold: "600", bold: "700" })[weight] as TextStyle["fontWeight"]

/**
 * Text in the faces, sizes and colors of Plex UI. `variant` takes the platform's text styles (Body 17 on iOS, Body
 * Large 16 on Android); `size` the Plex UI scale. The tracking is the kit's Inter tracking at the size.
 */
export function Text({ variant, size, weight, color, align, mono, tabularNums, style, children, ...rest }: TextProps) {
  const theme = useTheme()
  const inherited = useContext(TextColorContext)
  return (
    <RNText
      {...rest}
      style={[
        textStyle(theme, { variant, size, weight, mono }),
        { color: color ? textColor(theme, color) : (inherited ?? textColor(theme, "primary")) },
        align ? { textAlign: align } : null,
        tabularNums ? { fontVariant: ["tabular-nums"] } : null,
        style,
      ]}
    >
      {children}
    </RNText>
  )
}

export type HeadingProps = Omit<TextProps, "variant" | "size"> & {
  /** A heading size of the Plex UI scale (`--font-heading-*`). @default "md" */
  size?: HeadingSize
}

/** A heading of the Plex UI scale, semibold, announced as a header. */
export function Heading({ size = "md", weight = "semibold", color, align, mono, tabularNums, style, children, ...rest }: HeadingProps) {
  const theme = useTheme()
  const fontSize = theme.length(`--font-heading-${size}-size`, 20)
  const lineHeight = theme.length(`--font-heading-${size}-line-height`, fontSize * 1.3)
  return (
    <RNText
      accessibilityRole="header"
      {...rest}
      style={[
        { fontSize, lineHeight },
        mono ? { ...theme.monoFont, fontWeight: weightNumber(weight), letterSpacing: 0 } : { letterSpacing: theme.tracking(fontSize), ...theme.font(weight) },
        tabularNums ? { fontVariant: ["tabular-nums"] } : null,
        { color: textColor(theme, color ?? "primary") },
        align ? { textAlign: align } : null,
        style,
      ]}
    >
      {children}
    </RNText>
  )
}
