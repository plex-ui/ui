import type { ComponentType } from "react"
import { BarsScreen } from "./BarsScreen"
import { ButtonsScreen } from "./ButtonsScreen"
import { IconButtonsScreen } from "./IconButtonsScreen"
import { IconsScreen } from "./IconsScreen"
import { SegmentedScreen } from "./SegmentedScreen"
import { TabBarScreen } from "./TabBarScreen"
import { TextScreen } from "./TextScreen"
import { ThemeScreen } from "./ThemeScreen"

export type Screen = { id: string; title: string; stage: number; Component: ComponentType }

/** Every screen of the gallery, in the order of the stages of the package. */
export const screens: Screen[] = [
  { id: "theme", title: "Theme", stage: 1, Component: ThemeScreen },
  { id: "text", title: "Text", stage: 1, Component: TextScreen },
  { id: "icons", title: "Icons", stage: 1, Component: IconsScreen },
  { id: "buttons", title: "Buttons", stage: 1, Component: ButtonsScreen },
  { id: "icon-buttons", title: "Icon buttons", stage: 1, Component: IconButtonsScreen },
  { id: "bars", title: "Toolbars", stage: 2, Component: BarsScreen },
  { id: "tab-bar", title: "Tab bar", stage: 2, Component: TabBarScreen },
  { id: "segmented", title: "Segmented", stage: 2, Component: SegmentedScreen },
]
