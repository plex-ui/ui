import { useEffect, useLayoutEffect, useState, useSyncExternalStore, type ReactNode } from "react"
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, View } from "react-native"
import { useTheme } from "../theme/ThemeProvider"
import { liquidGlassModule } from "./optional"

/**
 * Keeps an overlay mounted while it animates out: `progress` runs 0 to 1 as it opens and back as it closes, and
 * `mounted` turns false once it has closed.
 */
export function usePresence(open: boolean, { enter = 250, exit = 200 }: { enter?: number; exit?: number } = {}) {
  const theme = useTheme()
  const [exiting, setExiting] = useState(false)
  const [wasOpen, setWasOpen] = useState(open)
  if (wasOpen !== open) {
    setWasOpen(open)
    setExiting(!open)
  }
  const [progress] = useState(() => new Animated.Value(open ? 1 : 0))
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: theme.reducedMotion ? 0 : open ? enter : exit,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: false,
    })
    animation.start(({ finished }) => {
      if (finished && !open) setExiting(false)
    })
    return () => animation.stop()
  }, [open, progress, enter, exit, theme.reducedMotion])
  return { mounted: open || exiting, progress }
}

export type OverlayProps = {
  open: boolean
  /** Called on a tap outside, Android's back and the web's Escape, when `dismissible`. */
  onDismiss: () => void
  /** The dim over the screen; transparent for a menu. */
  scrim?: string
  /** A tap outside, back or Escape dismisses it. An iOS alert asks for an action instead. @default true */
  dismissible?: boolean
  enter?: number
  exit?: number
  testID?: string
  /** The overlay, given its opening progress (0 to 1) and whether it is opening. Lay it out with `pointerEvents="box-none"` wrappers. */
  children: (progress: Animated.Value, open: boolean) => ReactNode
}

/**
 * The layer of every overlay (dialog, sheet, menu): a transparent RN `Modal` over the app with an optional scrim that
 * fades with the overlay. One host for all of them, so focus, the back button and the screen reader behave alike.
 */
export function Overlay({ open, onDismiss, scrim = "transparent", dismissible = true, enter, exit, testID, children }: OverlayProps) {
  // On iOS an overlay that opens while another fades out waits for it: a Modal presented while another is dismissed
  // is presented from it, and UIKit takes it away with it (a menu item that opens a dialog showed no dialog). It looks
  // a frame later, once an overlay closed in the same change has marked itself leaving.
  const ios = Platform.OS === "ios"
  const clear = useSyncExternalStore(subscribeLeaving, noneLeaving, noneLeaving)
  const [looked, setLooked] = useState(false)
  const [held, setHeld] = useState(false)
  useEffect(() => {
    if (!open || !ios) return
    const frame = requestAnimationFrame(() => setLooked(true))
    return () => cancelAnimationFrame(frame)
  }, [open, ios])
  if (!open && (held || looked)) {
    setHeld(false)
    setLooked(false)
  }
  if (open && !held && (!ios || (looked && clear))) setHeld(true)
  const show = open && (held || !ios)
  const { mounted, progress } = usePresence(show, { enter, exit })
  const leaving = mounted && !show
  useLayoutEffect(() => {
    if (!leaving || !ios) return
    return markLeaving()
  }, [leaving, ios])
  if (!mounted) return null
  return (
    // Android's back and the web's Escape close it as a tap outside does: an overlay that is not dismissible waits for an
    // action (Android's `setCancelable(false)`)
    <Modal visible transparent animationType="none" onRequestClose={dismissible ? onDismiss : ignore} statusBarTranslucent navigationBarTranslucent supportedOrientations={ORIENTATIONS}>
      {/* A closing overlay takes no more touches: an action cannot run twice while it fades */}
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents={show ? "box-none" : "none"}
        onAccessibilityEscape={dismissible && show ? onDismiss : undefined}
        testID={testID}
      >
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: scrim, opacity: progress }]} />
        <Pressable
          accessible={false}
          importantForAccessibility="no"
          style={StyleSheet.absoluteFill}
          onPress={dismissible && show ? onDismiss : undefined}
          testID={testID ? `${testID}-scrim` : undefined}
        />
        {children(progress, show)}
      </View>
    </Modal>
  )
}

const ignore = () => {}

/** The overlays fading out on iOS, which an opening overlay waits for. */
let leavingCount = 0
const leavingListeners = new Set<() => void>()
const noneLeaving = () => leavingCount === 0
function subscribeLeaving(listener: () => void) {
  leavingListeners.add(listener)
  return () => {
    leavingListeners.delete(listener)
  }
}
function markLeaving() {
  leavingCount += 1
  leavingListeners.forEach((listener) => listener())
  return () => {
    leavingCount -= 1
    leavingListeners.forEach((listener) => listener())
  }
}

const ORIENTATIONS = ["portrait", "portrait-upside-down", "landscape", "landscape-left", "landscape-right"] as const

/**
 * Chromium stops a backdrop blur at an ancestor with any transform, even `scale(1)`: over glass on the web an overlay
 * moves by its offsets (`top`) and fades, it does not scale.
 */
export const canTransformGlass = Platform.OS !== "web"

/**
 * The opacity of an overlay of glass. Glass that fades in can stay unpainted: Chromium can leave a backdrop blur off
 * for good when its glass was first painted transparent (headless Chromium fades it in unblurred), and iOS 26's
 * Liquid Glass (expo-glass-effect, as Expo Go ships it) draws no glass when it fades in inside a view React Native
 * recycled from an earlier overlay (the second dialog of a screen showed its text over no panel). So where glass is
 * real, it appears at once over a dim that fades, and fades only as it leaves; a blur under a fill (iOS before 26)
 * fades in.
 */
export function glassOpacity(progress: Animated.Value, open: boolean) {
  return open && (Platform.OS === "web" || liquidGlassModule() != null) ? 1 : progress
}

/** The scrim of Material's modal surfaces: `scrim` at 32%. */
export const MATERIAL_SCRIM = "rgba(0, 0, 0, 0.32)"
/** The dim behind an iOS alert or sheet (UIKit's dimming view, about 20% black in light and 48% in dark). */
export const iosDim = (dark: boolean) => (dark ? "rgba(0, 0, 0, 0.48)" : "rgba(0, 0, 0, 0.2)")
