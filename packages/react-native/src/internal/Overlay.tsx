import { useEffect, useState, type ReactNode } from "react"
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, View } from "react-native"
import { useTheme } from "../theme/ThemeProvider"

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
  /** Called on a tap outside (when `dismissible`) and on Android's back. */
  onDismiss: () => void
  /** The dim over the screen; transparent for a menu. */
  scrim?: string
  /** A tap outside dismisses it. An iOS alert asks for an action instead. @default true */
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
  const { mounted, progress } = usePresence(open, { enter, exit })
  if (!mounted) return null
  return (
    <Modal visible transparent animationType="none" onRequestClose={onDismiss} statusBarTranslucent navigationBarTranslucent supportedOrientations={ORIENTATIONS}>
      {/* A closing overlay takes no more touches: an action cannot run twice while it fades */}
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents={open ? "box-none" : "none"}
        onAccessibilityEscape={dismissible && open ? onDismiss : undefined}
        testID={testID}
      >
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: scrim, opacity: progress }]} />
        <Pressable
          accessible={false}
          importantForAccessibility="no"
          style={StyleSheet.absoluteFill}
          onPress={dismissible && open ? onDismiss : undefined}
          testID={testID ? `${testID}-scrim` : undefined}
        />
        {children(progress, open)}
      </View>
    </Modal>
  )
}

const ORIENTATIONS = ["portrait", "portrait-upside-down", "landscape", "landscape-left", "landscape-right"] as const

/**
 * Chromium stops a backdrop blur at an ancestor with any transform, even `scale(1)`: over glass on the web an overlay
 * moves by its offsets (`top`) and fades, it does not scale.
 */
export const canTransformGlass = Platform.OS !== "web"

/**
 * The opacity of an overlay of glass. Chromium can leave a backdrop blur off for good when its glass was first painted
 * transparent (it fades in unblurred in headless Chromium), so on the web glass appears at once, over a dim that
 * fades, and fades only as it leaves.
 */
export function glassOpacity(progress: Animated.Value, open: boolean) {
  return Platform.OS === "web" && open ? 1 : progress
}

/** The scrim of Material's modal surfaces: `scrim` at 32%. */
export const MATERIAL_SCRIM = "rgba(0, 0, 0, 0.32)"
/** The dim behind an iOS alert or sheet (UIKit's dimming view, about 20% black in light and 48% in dark). */
export const iosDim = (dark: boolean) => (dark ? "rgba(0, 0, 0, 0.48)" : "rgba(0, 0, 0, 0.2)")
