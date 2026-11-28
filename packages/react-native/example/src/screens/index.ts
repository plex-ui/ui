import type { ComponentType } from "react"
import { BarsScreen } from "./BarsScreen"
import { ButtonsScreen } from "./ButtonsScreen"
import { ContentScreen } from "./ContentScreen"
import { ControlsScreen } from "./ControlsScreen"
import { FieldsScreen } from "./FieldsScreen"
import { FieldsMoreScreen } from "./FieldsMoreScreen"
import { IconButtonsScreen } from "./IconButtonsScreen"
import { IconsScreen } from "./IconsScreen"
import { KeyboardScreen } from "./KeyboardScreen"
import { ListsScreen } from "./ListsScreen"
import { MessagesScreen } from "./MessagesScreen"
import { OverlaysScreen } from "./OverlaysScreen"
import { ProgressScreen } from "./ProgressScreen"
import { SegmentedScreen } from "./SegmentedScreen"
import { SignInScreen } from "./SignInScreen"
import { TabBarScreen } from "./TabBarScreen"
import { TextScreen } from "./TextScreen"
import { ThemeScreen } from "./ThemeScreen"

/** `grouped`: a settings page, whose Android canvas is Settings' surfaceContainer (other screens stand on surface). */
export type Screen = { id: string; title: string; stage: number; grouped?: boolean; Component: ComponentType }

/** Every screen of the gallery, in the order of the stages of the package. */
export const screens: Screen[] = [
  { id: "theme", title: "Theme", stage: 1, Component: ThemeScreen },
  { id: "text", title: "Text", stage: 1, Component: TextScreen },
  { id: "icons", title: "Icons", stage: 1, Component: IconsScreen },
  { id: "buttons", title: "Buttons", stage: 1, Component: ButtonsScreen },
  { id: "icon-buttons", title: "Icon buttons", stage: 1, Component: IconButtonsScreen },
  { id: "sign-in", title: "Sign in", stage: 1, Component: SignInScreen },
  { id: "bars", title: "Toolbars", stage: 2, Component: BarsScreen },
  { id: "tab-bar", title: "Tab bar", stage: 2, Component: TabBarScreen },
  { id: "segmented", title: "Segmented", stage: 2, Component: SegmentedScreen },
  { id: "controls", title: "Controls", stage: 3, Component: ControlsScreen },
  { id: "fields", title: "Fields", stage: 3, Component: FieldsScreen },
  { id: "fields-more", title: "More fields", stage: 3, grouped: true, Component: FieldsMoreScreen },
  { id: "overlays", title: "Overlays", stage: 3, Component: OverlaysScreen },
  { id: "keyboard", title: "Keyboard", stage: 3, Component: KeyboardScreen },
  { id: "content", title: "Content", stage: 4, Component: ContentScreen },
  { id: "lists", title: "Lists & cards", stage: 4, grouped: true, Component: ListsScreen },
  { id: "progress", title: "Progress", stage: 4, Component: ProgressScreen },
  { id: "messages", title: "Messages", stage: 4, Component: MessagesScreen },
]
