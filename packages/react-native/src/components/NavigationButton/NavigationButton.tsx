import { useContext } from "react"
import { useTheme } from "../../theme/ThemeProvider"
import ArrowLeftLg from "../../icons/plex/ArrowLeftLg"
import CheckMd from "../../icons/plex/CheckMd"
import ChevronLeftMd from "../../icons/plex/ChevronLeftMd"
import { BarItemContext, Button, type ButtonProps } from "../Button/Button"
import { createIcon } from "../Icon/createIcon"

export type NavigationAction = "back" | "close" | "confirm"

export type NavigationButtonProps = Omit<ButtonProps, "children" | "uniform" | "pill" | "accessibilityLabel"> & {
  /** The role of the button; the caller owns the navigation, the dismissal or the submission. */
  action: NavigationAction
  /** @default "Back", "Close" or "Confirm" */
  accessibilityLabel?: string
}

/** The close glyph of the kit (packages/ui NavigationGlyph), on a 20 grid. */
const Close = createIcon("Close", "0 0 20 20", [
  [
    "path",
    {
      fill: 0,
      d: "M5.16 5.16a.62.62 0 0 1 .88 0L10 9.12l3.96-3.96a.62.62 0 1 1 .88.88L10.88 10l3.96 3.96a.62.62 0 1 1-.88.88L10 10.88l-3.96 3.96a.62.62 0 1 1-.88-.88L9.12 10 5.16 6.04a.62.62 0 0 1 0-.88",
    },
  ],
])

const LABELS: Record<NavigationAction, string> = { back: "Back", close: "Close", confirm: "Confirm" }

/**
 * Back, close and confirm: on iOS the 44pt circle of a bar, glass for back and close and the accent for confirm (in a
 * Toolbar), with the kit's glyphs at their sizes (`--navigation-button-*`); on Android a Material icon button, the
 * back arrow and close in the app bar's color and confirm filled.
 */
export function NavigationButton({ action, color, variant, mobileMaterial, size = "lg", accessibilityLabel, ...rest }: NavigationButtonProps) {
  const theme = useTheme()
  const bar = useContext(BarItemContext)
  const confirm = action === "confirm"
  const iconSize = theme.isAndroid ? 24 : theme.length(`--navigation-button-${action}-icon-size`, 30)
  const Glyph = action === "close" ? Close : confirm ? CheckMd : theme.isAndroid ? ArrowLeftLg : ChevronLeftMd
  const button = (
    <Button
      {...rest}
      uniform
      color={color ?? (confirm ? "primary" : theme.isAndroid ? "primary" : "secondary")}
      variant={variant ?? (confirm ? "solid" : theme.isAndroid ? "ghost" : "soft")}
      mobileMaterial={mobileMaterial ?? (confirm ? undefined : "glass")}
      size={size}
      accessibilityLabel={accessibilityLabel ?? LABELS[action]}
    >
      <Glyph size={iconSize} />
    </Button>
  )
  if (bar || theme.isAndroid) return button
  // Outside a bar the circle keeps the size of a bar's: 44
  const height = theme.length("--navigation-button-size", 44)
  return (
    <BarItemContext.Provider
      value={{ height, fontSize: 17, lineHeight: 22, weight: "medium", prominentWeight: "semibold", iconSize, gutter: 16, prominent: false }}
    >
      {button}
    </BarItemContext.Provider>
  )
}
