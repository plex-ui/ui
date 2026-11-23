import { useEffect, useState } from "react"
import { Keyboard, LayoutAnimation, Platform, type KeyboardEvent } from "react-native"

/** The keyboard's height now, on a phone: one already up when an overlay opens. */
const current = () => (Platform.OS !== "web" && Keyboard.isVisible() ? (Keyboard.metrics()?.height ?? 0) : 0)

/**
 * The height of the software keyboard while `active`, for an overlay to stand above it. An overlay's Modal does not
 * make room for it: on Android its window draws edge to edge (`navigationBarTranslucent`), so `adjustResize` leaves
 * it at the screen's size, and an iOS Modal never resizes. On iOS the change moves with the keyboard, as
 * KeyboardAvoidingView does it. Android reports the height over the navigation bar; iOS from the screen's bottom edge.
 */
export function useKeyboardHeight(active: boolean) {
  const [height, setHeight] = useState(() => (active ? current() : 0))
  const [wasActive, setWasActive] = useState(active)
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
  return active ? height : 0
}
