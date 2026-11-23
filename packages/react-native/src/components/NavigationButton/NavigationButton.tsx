import { useContext, type ComponentRef } from "react"
import { StyleSheet, View } from "react-native"
import { useTheme } from "../../theme/ThemeProvider"
import CheckMd from "../../icons/plex/CheckMd"
import ChevronLeftMd from "../../icons/plex/ChevronLeftMd"
import { mirrored, useRTL } from "../../internal/direction"
import { BarItemContext, Button, type BarItemStyle, type ButtonProps } from "../Button/Button"
import { createIcon } from "../Icon/createIcon"
import { MaterialArrowBack, MaterialCheckSymbol, MaterialClose } from "../Icon/material"
import { Text } from "../Text/Text"

export type NavigationAction = "back" | "close" | "confirm"

export type NavigationButtonProps = Omit<ButtonProps, "children" | "uniform" | "pill" | "accessibilityLabel"> & {
  /** The role of the button; the caller owns the navigation, the dismissal or the submission. */
  action: NavigationAction
  /** @default "Back", "Close" or "Confirm" */
  accessibilityLabel?: string
  /**
   * Android: the short word drawn on confirm's pill (Done, Save, Apply); the pill never draws the `accessibilityLabel`,
   * which stays the button's name. iOS draws no text (confirm is a check circle), so it is unused there, as for back
   * and close. @default "Done"
   */
  label?: string
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
 * Toolbar), with the kit's glyphs at their sizes (`--navigation-button-*`); on Android Material's glyphs (`arrow_back`,
 * `close`, `check`) at 24dp: in a bar back and close take Android's 46dp glass circle, outside a bar they are plain icon
 * buttons. Confirm on Android is the glass text pill of a top bar (outside a bar too): a short word, its `label` (Done
 * by default), 15/20 Bold in the text color, 16 in from its ends and cut short past 160; in a bottom bar it keeps the
 * accent circle.
 * Back points the way the screen reads: right to left it turns over.
 */
export function NavigationButton({ action, color, variant, mobileMaterial, size = "lg", accessibilityLabel, label, ...rest }: NavigationButtonProps) {
  const theme = useTheme()
  const bar = useContext(BarItemContext)
  const confirm = action === "confirm"
  const iconSize = theme.isAndroid ? 24 : theme.length(`--navigation-button-${action}-icon-size`, 30)
  const Glyph = theme.isAndroid
    ? action === "close"
      ? MaterialClose
      : confirm
        ? MaterialCheckSymbol
        : MaterialArrowBack
    : action === "close"
      ? Close
      : confirm
        ? CheckMd
        : ChevronLeftMd
  const { ref, rtl } = useRTL<ComponentRef<typeof View>>()
  if (theme.isAndroid && confirm && !bar?.bottom) {
    // The pill draws a short word, never the name; with no name of its own the button is named by its word
    const word = label ?? "Done"
    const name = accessibilityLabel ?? word
    // A neutral ghost Button in a bar stands on the bar's glass, its label dimmed to 38% when disabled
    const pill = (
      <Button {...rest} color={color ?? "primary"} variant={variant ?? "ghost"} mobileMaterial={mobileMaterial} size={size} accessibilityLabel={name}>
        <Text weight="bold" numberOfLines={1} style={styles.androidConfirm}>
          {word}
        </Text>
      </Button>
    )
    return bar ? pill : <BarItemContext.Provider value={ANDROID_BAR_ITEM}>{pill}</BarItemContext.Provider>
  }
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
      <View ref={ref} style={action === "back" ? mirrored(rtl) : null}>
        <Glyph size={iconSize} />
      </View>
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

/** An Android top bar's item, for a confirm outside a bar: the 46dp glass, 16 in from its ends. */
const ANDROID_BAR_ITEM: BarItemStyle = { height: 46, fontSize: 15, lineHeight: 20, weight: "medium", prominentWeight: "medium", iconSize: 24, gutter: 16 }

const styles = StyleSheet.create({
  androidConfirm: { fontSize: 15, lineHeight: 20, maxWidth: 160 },
})
