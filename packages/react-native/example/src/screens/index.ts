import type { ComponentType } from "react"
import { ButtonsScreen } from "./ButtonsScreen"
import { IconButtonsScreen } from "./IconButtonsScreen"
import { IconsScreen } from "./IconsScreen"
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
]
