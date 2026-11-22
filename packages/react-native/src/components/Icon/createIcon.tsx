import { createContext, createElement, memo, useContext, type ComponentType, type ReactNode } from "react"
import type { StyleProp, ViewStyle } from "react-native"
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

type IconDefaults = { size?: number; color?: string }

const IconContext = createContext<IconDefaults>({})

/** Sets the size and color of the icons inside (a Button gives its label's color and its icon size). */
export function IconDefaultsProvider({ size, color, children }: IconDefaults & { children?: ReactNode }) {
  return <IconContext.Provider value={{ size, color }}>{children}</IconContext.Provider>
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

function renderNodes(nodes: IconNode[], color: string, accent: string, keyPrefix = ""): ReactNode[] {
  return nodes.map(([tag, props, children], index) => {
    const resolved: Record<string, string | number> = {}
    for (const [name, value] of Object.entries(props)) {
      resolved[name] = (name === "fill" || name === "stroke") && typeof value === "number" ? (value === 0 ? color : accent) : value
    }
    const element = ELEMENTS[tag]
    if (!element) return null
    const key = `${keyPrefix}${index}`
    return createElement(element, { key, ...resolved } as never, children ? renderNodes(children, color, accent, `${key}.`) : undefined)
  })
}

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
        style={style}
        testID={testID}
        accessible={!!accessibilityLabel}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityLabel ? "image" : undefined}
        importantForAccessibility={accessibilityLabel ? "yes" : "no-hide-descendants"}
        accessibilityElementsHidden={!accessibilityLabel}
      >
        {renderNodes(nodes, fill, theme.colors.accent)}
      </Svg>
    )
  }) as unknown as IconComponent
  ;(Icon as { displayName?: string }).displayName = name
  Icon.iconName = name
  return Icon
}
