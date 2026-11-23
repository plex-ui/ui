import { useId, type ReactNode } from "react"
import { Platform } from "react-native"
import { textOf } from "./children"

type KeyEvent = { key: string; preventDefault: () => void }

/**
 * The description of a control for a screen reader: read after its label and state, as VoiceOver and TalkBack
 * read a hint, and tied to the text by `aria-describedby` on the web. Give `id` to the description's text as its
 * `nativeID`.
 */
export function useDescription(description: ReactNode) {
  const id = useId()
  if (description == null) return { id: undefined, props: {} }
  return {
    id,
    props: Platform.OS === "web" ? { "aria-describedby": id } : { accessibilityHint: textOf(description) || undefined },
  }
}

/**
 * Space toggles a switch or a checkbox on the web, as the native controls do. React Native Web's Pressable takes
 * Enter for any role but Space only for a button.
 */
export function spaceToggles(toggle: () => void) {
  if (Platform.OS !== "web") return {}
  return {
    // React Native Web hands the DOM's key event; React Native's own type has no `key`
    onKeyDown: (raw: unknown) => {
      const event = raw as KeyEvent
      if (event.key !== " ") return
      event.preventDefault()
      toggle()
    },
  }
}

type Listening = { addEventListener: (type: string, listener: (event: { metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean }) => void, capture: boolean) => void }

let keyboardLast = false
let listening = false

/**
 * Whether the page's last input was the keyboard (the web). A focus that code moves shows as `:focus-visible` while
 * nothing has been pressed yet, so a menu open on load looked opened from the keyboard; this follows the input itself,
 * as the browser's own heuristic does once a person acts: a key (with no modifier) sets it, a pointer clears it, and
 * a page nobody has touched yet counts as a pointer's. Call it once early (a menu's mount) so it is listening.
 */
export function lastInputKeyboard() {
  const page = (globalThis as { document?: Listening }).document
  if (Platform.OS === "web" && page && !listening) {
    listening = true
    page.addEventListener("keydown", (event) => {
      if (!event.metaKey && !event.ctrlKey && !event.altKey) keyboardLast = true
    }, true)
    for (const type of ["pointerdown", "mousedown", "touchstart"]) page.addEventListener(type, () => (keyboardLast = false), true)
  }
  return keyboardLast
}
