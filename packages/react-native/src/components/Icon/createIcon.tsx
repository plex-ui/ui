import { createContext, createElement, memo, useContext, type ComponentType, type ReactNode } from "react"
import { Platform, StyleSheet, type StyleProp, type ViewStyle } from "react-native"
import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Polyline, Rect } from "react-native-svg"
import { useTheme } from "../../theme/ThemeProvider"

export type IconProps = {
  /** Width and height in px. Defaults to the size the surrounding control gives its icons, else 24. */
  size?: number
  /** Defaults to the color of the surrounding control's label, else the primary text color. */
  color?: string
  style?: StyleProp<ViewStyle>
  /** Names the icon for assistive technologies; without it the icon is decorative and hidden from them. */
  accessibilityLabel?: string
  testID?: string
}

export type IconComponent = ComponentType<IconProps> & { iconName: string }

/** [tag, props, children]: a fill or stroke of 0 is the icon's color, 1 the theme's accent. */
export type IconNode = [string, Record<string, string | number>, IconNode[]?]

type IconDefaults = {
  size?: number
  color?: string
  /** `semibold` draws a stroked icon's lines a quarter heavier: Material's active icon when it has no filled form. */
  weight?: "regular" | "semibold"
}

const IconContext = createContext<IconDefaults>({})

/** Sets the size and color of the icons inside (a Button gives its label's color and its icon size). */
export function IconDefaultsProvider({ size, color, weight, children }: IconDefaults & { children?: ReactNode }) {
  return <IconContext.Provider value={{ size, color, weight }}>{children}</IconContext.Provider>
}

const ELEMENTS: Record<string, ComponentType<never>> = {
  path: Path as unknown as ComponentType<never>,
  g: G as unknown as ComponentType<never>,
  rect: Rect as unknown as ComponentType<never>,
  circle: Circle as unknown as ComponentType<never>,
  ellipse: Ellipse as unknown as ComponentType<never>,
  line: Line as unknown as ComponentType<never>,
  polyline: Polyline as unknown as ComponentType<never>,
  polygon: Polygon as unknown as ComponentType<never>,
}

function renderNodes(nodes: IconNode[], color: string, accent: string, keyPrefix = "", strokeScale = 1): ReactNode[] {
  return nodes.map(([tag, props, children], index) => {
    const resolved: Record<string, string | number> = {}
    for (const [name, value] of Object.entries(props)) {
      resolved[name] =
        (name === "fill" || name === "stroke") && typeof value === "number"
          ? value === 0
            ? color
            : accent
          : name === "strokeWidth" && strokeScale !== 1
            ? Number(value) * strokeScale
            : value
    }
    const element = ELEMENTS[tag]
    if (!element) return null
    const key = `${keyPrefix}${index}`
    return createElement(element, { key, ...resolved } as never, children ? renderNodes(children, color, accent, `${key}.`, strokeScale) : undefined)
  })
}

/** A named icon is an image for VoiceOver and TalkBack; an unnamed one is hidden from them. */
const nativeA11y = (label: string | undefined) => ({
  accessible: !!label,
  accessibilityLabel: label,
  accessibilityRole: label ? ("image" as const) : undefined,
  importantForAccessibility: label ? ("yes" as const) : ("no-hide-descendants" as const),
  accessibilityElementsHidden: !label,
})

// On the web react-native-svg hands its props to the <svg> as they are, so the native names would reach the DOM (and
// React warns of them): there an icon takes the ARIA attributes instead
const webA11y = (label: string | undefined) =>
  (label ? { role: "img", "aria-label": label } : { "aria-hidden": true, focusable: "false" }) as Record<string, unknown>

/** Makes an icon component from its SVG data (scripts/build-icons.mjs writes one per icon of the shared sets). */
export function createIcon(name: string, viewBox: string, nodes: IconNode[]): IconComponent {
  const Icon = memo(function Icon({ size, color, style, accessibilityLabel, testID }: IconProps) {
    const theme = useTheme()
    const defaults = useContext(IconContext)
    const px = size ?? defaults.size ?? 24
    const fill = color ?? defaults.color ?? theme.colors.text
    return (
      <Svg
        width={px}
        height={px}
        viewBox={viewBox}
        // Its own size and no margins, inline: a page's stylesheet (the docs' phone menu sizes `[role="menu"] svg`)
        // does not reach a web icon then
        style={StyleSheet.flatten([styles.reset, { width: px, height: px }, style])}
        testID={testID}
        {...(Platform.OS === "web" ? webA11y(accessibilityLabel) : nativeA11y(accessibilityLabel))}
      >
        {renderNodes(nodes, fill, theme.colors.accent, "", defaults.weight === "semibold" ? 1.25 : 1)}
      </Svg>
    )
  }) as unknown as IconComponent
  ;(Icon as { displayName?: string }).displayName = name
  Icon.iconName = name
  return Icon
}

const styles = StyleSheet.create({ reset: { margin: 0, flexShrink: 0 } })
