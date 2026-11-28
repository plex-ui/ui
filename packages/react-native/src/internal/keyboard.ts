import { useEffect, useState, useSyncExternalStore } from "react"
import { Keyboard, LayoutAnimation, Platform, type KeyboardEvent } from "react-native"

/** The keyboard's height now, on a phone: one already up when an overlay opens. */
const current = () => (Platform.OS !== "web" && Keyboard.isVisible() ? (Keyboard.metrics()?.height ?? 0) : 0)

// The keyboard SystemKeyboard draws on the web: its inset, as the system reports a real one
let drawn = 0
let drawnFull = 0
let drawnBy: symbol | null = null
const drawnListeners = new Set<() => void>()
/**
 * `inset`: what the system would report (Android's leaves out the navigation bar); `full`: from the screen's bottom
 * edge. `by` is the keyboard that draws; another one's clearing it later leaves its height as it is.
 */
export function setDrawnKeyboard(by: symbol, inset: number, full = inset) {
  drawnBy = by
  if (inset === drawn && full === drawnFull) return
  drawn = inset
  drawnFull = full
  drawnListeners.forEach((listener) => listener())
}
export function clearDrawnKeyboard(by: symbol) {
  if (drawnBy !== by) return
  drawnBy = null
  setDrawnKeyboard(by, 0)
  drawnBy = null
}
function subscribeDrawn(listener: () => void) {
  drawnListeners.add(listener)
  return () => {
    drawnListeners.delete(listener)
  }
}

/**
 * The height of the software keyboard while `active`, for an overlay to stand above it. An overlay's Modal does not
 * make room for it: on Android its window draws edge to edge (`navigationBarTranslucent`), so `adjustResize` leaves
 * it at the screen's size, and an iOS Modal never resizes. On iOS the change moves with the keyboard, as
 * KeyboardAvoidingView does it. Android reports the height over the navigation bar; iOS from the screen's bottom edge.
 * On the web it is the keyboard SystemKeyboard draws.
 */
export function useKeyboardHeight(active: boolean) {
  const [height, setHeight] = useState(() => (active ? current() : 0))
  const [wasActive, setWasActive] = useState(active)
  const web = useSyncExternalStore(subscribeDrawn, () => drawn, () => 0)
  if (wasActive !== active) {
    setWasActive(active)
    setHeight(active ? current() : 0)
  }
  useEffect(() => {
    if (!active || Platform.OS === "web") return
    const ios = Platform.OS === "ios"
    const apply = (next: number, event: KeyboardEvent) => {
      if (ios && event.duration > 0) {
        LayoutAnimation.configureNext({
          duration: event.duration,
          update: { duration: event.duration, type: LayoutAnimation.Types[event.easing] ?? LayoutAnimation.Types.keyboard },
        })
      }
      setHeight(next)
    }
    const show = Keyboard.addListener(ios ? "keyboardWillShow" : "keyboardDidShow", (event) => apply(event.endCoordinates.height, event))
    const hide = Keyboard.addListener(ios ? "keyboardWillHide" : "keyboardDidHide", (event) => apply(0, event))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [active])
  if (Platform.OS === "web") return active ? web : 0
  return active ? height : 0
}

/**
 * The drawn keyboard's height from the screen's bottom edge (SystemKeyboard, on the web), for a screen to end over it as
 * a phone lays a screen out around its own keyboard: a bottom bar and the last field stand over the keys. 0 on iOS and
 * Android, where the system does it (Android resizes the window, KeyboardAvoidingView lifts on iOS).
 */
export function useKeyboardInset() {
  return useSyncExternalStore(subscribeDrawn, () => (Platform.OS === "web" ? drawnFull : 0), () => 0)
}
