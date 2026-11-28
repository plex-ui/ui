import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import { Animated, Easing, Modal, Platform, StyleSheet, View, type BlurEvent, type EasingFunction, type ViewStyle } from "react-native"
import { useTheme } from "../theme/ThemeProvider"
import type { Theme } from "../theme/types"
import { liquidGlassModule } from "./optional"
import { SheetFloatInsetContext } from "../components/BottomSheet/context"
import { criticalSpringEasing } from "./motion"

/** How an overlay moves: a dialog, a sheet (a panel that crosses the screen) or a menu. */
export type OverlayMotion = "dialog" | "sheet" | "menu"

export type OverlayTiming = {
  enter: number
  exit: number
  enterEasing: EasingFunction
  exitEasing: EasingFunction
  /** A wait before the entrance in ms. @default 0 */
  enterDelay?: number
}

/**
 * The times and curves of an overlay, as the CSS motion tokens give them (variables-semantic.css, Dialog.module.css,
 * Menu.module.css): `--motion-enter` / `--motion-exit` (`-large` for a sheet) on `--cubic-enter` and
 * `--cubic-exit-snappy` (`--cubic-exit` for a sheet); an iOS sheet rides UIKit's spring instead (500ms both ways).
 * With reduced motion the exit is at once (the motion tokens
 * resolve to 0) and the entrance is a fade on iOS's time and curve (`--motion-reduced-enter-dialog`, `-menu`), which
 * the components draw without a slide or a scale.
 */
export function overlayTiming(theme: Theme, motion: OverlayMotion = "dialog"): OverlayTiming {
  const large = motion === "sheet"
  const exit = theme.duration(large ? "--motion-exit-large" : "--motion-exit", large ? 200 : 150)
  const exitEasing = large ? curve(theme, "--cubic-exit", [0.8, 0, 0.4, 1]) : curve(theme, "--cubic-exit-snappy", [0.65, 0, 0.4, 1])
  if (theme.reducedMotion) {
    const menu = motion === "menu"
    return {
      enter: theme.duration(menu ? "--motion-reduced-enter-menu" : "--motion-reduced-enter-dialog", menu ? 500 : 350),
      exit,
      enterEasing: menu ? curve(theme, "--cubic-reduced-enter-menu", [0.4, 1, 0.7, 1]) : curve(theme, "--cubic-reduced-enter-dialog", [0.3, 1, 0.7, 1]),
      exitEasing,
    }
  }
  if (theme.isAndroid && motion === "dialog") {
    // An Android alert runs the platform's dialog animation: a scale over 220ms and a fade over 150, both ways. The
    // progress runs at an even pace for the 220, and the dialog draws each curve from it (`androidDialogMotion`)
    return { enter: ANDROID_DIALOG.scale, exit: ANDROID_DIALOG.scale, enterEasing: Easing.linear, exitEasing: Easing.linear }
  }
  if (theme.isAndroid) {
    // Android: a sheet opens in 400ms on an ease-out quint after a 20ms wait and leaves in 250 on an ease-out; a popup
    // unrolls on its own clock (Menu) and leaves in 150, fading as it lifts (with ObjectAnimator's accelerate-decelerate
    // curve)
    return large
      ? { enter: 400, exit: 250, enterEasing: bezier(0.23, 1, 0.32, 1), exitEasing: bezier(0, 0, 0.58, 1), enterDelay: 20 }
      : { enter: 200, exit: 150, enterEasing: bezier(0, 0, 0.2, 1), exitEasing: ACCELERATE_DECELERATE }
  }
  if (large) {
    // iOS's sheet, measured frame by frame (a UIKit sheet's presentation layers on the iOS 26.2 and 27.2 simulators,
    // medium, large and a custom detent): a critically damped spring of ω 18.2 rad/s both ways, within a point of its
    // place at 500ms; so the sheet slides in from the screen's edge rather than appearing
    return { enter: IOS_SHEET.duration, exit: IOS_SHEET.duration, enterEasing: IOS_SHEET.easing, exitEasing: IOS_SHEET.easing }
  }
  return {
    enter: theme.duration("--motion-enter", 250),
    exit,
    enterEasing: curve(theme, "--cubic-enter", [0.19, 1, 0.22, 1]),
    exitEasing,
  }
}

/** iOS's sheet presentation: UIKit's critically damped spring, ω 18.2 rad/s, over 500ms both ways */
const IOS_SHEET = { duration: 500, easing: criticalSpringEasing(18.2, 500) }

/** One easing per curve: a new function each render would restart a running animation. */
const curves = new Map<string, EasingFunction>()

/** Android's AccelerateDecelerateInterpolator, (1 − cos πt) / 2: the default curve of an Android animator. */
export const ACCELERATE_DECELERATE: EasingFunction = Easing.inOut(Easing.sin)

/** Android's dialog animation (Animation.Dialog), which an Android alert keeps: the scale's and the fade's times. */
export const ANDROID_DIALOG = { scale: 220, fade: 150 } as const

/**
 * The scale and opacity of an Android dialog from the overlay's even progress: the scale 0.9 to 1 on a decelerate
 * quint over 220ms, the fade on a decelerate cubic over the first 150, the same curves when it leaves.
 */
export function androidDialogMotion(progress: Animated.Value, opening: boolean) {
  const fadeEnd = ANDROID_DIALOG.fade / ANDROID_DIALOG.scale
  return {
    // Leaving, the time runs back from 1: a decelerating curve in time reads as an accelerating one in the progress
    opacity: opening
      ? progress.interpolate({ inputRange: [0, fadeEnd], outputRange: [0, 1], easing: DECELERATE_CUBIC, extrapolate: "clamp" })
      : progress.interpolate({ inputRange: [1 - fadeEnd, 1], outputRange: [0, 1], easing: Easing.cubic, extrapolate: "clamp" }),
    scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1], easing: opening ? DECELERATE_QUINT : QUINT, extrapolate: "clamp" }),
  }
}

const DECELERATE_CUBIC = Easing.out(Easing.cubic)
const QUINT = Easing.poly(5)
const DECELERATE_QUINT = Easing.out(QUINT)

/** A `cubic-bezier()` token as an easing. */
function curve(theme: Theme, name: string, fallback: [number, number, number, number]): EasingFunction {
  const value = theme.token(name)
  const match = typeof value === "string" ? /cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/.exec(value) : null
  const [x1, y1, x2, y2] = match ? match.slice(1).map(Number) : fallback
  return bezier(x1, y1, x2, y2)
}

/** A cubic Bézier easing, one per curve. */
function bezier(x1: number, y1: number, x2: number, y2: number): EasingFunction {
  const key = `${x1},${y1},${x2},${y2}`
  let easing = curves.get(key)
  if (!easing) {
    easing = Easing.bezier(x1, y1, x2, y2)
    curves.set(key, easing)
  }
  return easing
}

/**
 * Keeps an overlay mounted while it animates out: `progress` runs 0 to 1 as it opens and back as it closes, and
 * `mounted` turns false once it has closed. The timing is a dialog's (`overlayTiming`) unless given.
 */
export function usePresence(open: boolean, timing: Partial<OverlayTiming> = {}) {
  const theme = useTheme()
  const base = overlayTiming(theme)
  const { enter = base.enter, exit = base.exit, enterEasing = base.enterEasing, exitEasing = base.exitEasing, enterDelay = base.enterDelay ?? 0 } = timing
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
      duration: open ? enter : exit,
      easing: open ? enterEasing : exitEasing,
      delay: open ? enterDelay : 0,
      useNativeDriver: false,
    })
    animation.start(({ finished }) => {
      if (finished && !open) setExiting(false)
    })
    return () => animation.stop()
  }, [open, progress, enter, exit, enterEasing, exitEasing, enterDelay])
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
  /** Its times and curves from the motion tokens (`overlayTiming`). @default "dialog" */
  motion?: OverlayMotion
  /** The time of the entrance in ms, in place of the token's. */
  enter?: number
  /** The time of the exit in ms, in place of the token's. */
  exit?: number
  /** Called once it has left: its exit has ended and it is gone. */
  onExited?: () => void
  /** The scrim's opacity from the progress, when it does not follow the progress itself (an Android dialog's fade). */
  scrimOpacity?: (progress: Animated.Value, open: boolean) => Animated.AnimatedInterpolation<number>
  testID?: string
  /**
   * The overlay, given its opening progress (0 to 1), whether it is opening, and `focus`: props for the element that
   * carries its role (a dialog's `alertdialog`, a sheet's `dialog`), which takes the first focus on the web. Lay it
   * out with `pointerEvents="box-none"` wrappers.
   */
  children: (progress: Animated.Value, open: boolean, focus: OverlayFocus) => ReactNode
}

/**
 * Web props for the element of an overlay that carries its role. The Modal's focus trap focuses the first focusable
 * element as it opens: a dialog's field raised a phone's keyboard, and its first button showed a focus ring. The
 * overlay's own element takes that first focus instead, without a ring, as a web Dialog's content takes it when
 * nothing in it should (Radix's focus scope). Once focus moves on it leaves the tab order again, so Tab and
 * Shift+Tab wrap between the controls, as the trap expects. Elsewhere it is empty.
 */
export type OverlayFocus = { tabIndex?: -1; onBlur?: (event: BlurEvent) => void; style?: ViewStyle }

/**
 * The layer of every overlay (dialog, sheet, menu): a transparent RN `Modal` over the app with an optional scrim that
 * fades with the overlay. One host for all of them, so focus, the back button and the screen reader behave alike.
 */
export function Overlay({ open, onDismiss, scrim = "transparent", dismissible = true, motion, enter, exit, onExited, scrimOpacity, testID, children }: OverlayProps) {
  const theme = useTheme()
  // On iOS an overlay that opens while another one leaves waits for it: a Modal presented while another is dismissed
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
  // The overlay's own element takes the first focus each time it opens on the web, until focus leaves it
  const [entry, setEntry] = useState(true)
  const [shown, setShown] = useState(show)
  if (shown !== show) {
    setShown(show)
    if (show) setEntry(true)
  }
  const focus: OverlayFocus =
    Platform.OS === "web" && entry && show
      ? {
          tabIndex: -1,
          // Focus that moves to another element takes it out of the tab order; a window that loses focus (another
          // app, the page around a preview) does not, so the element keeps its focus
          onBlur: (event) => {
            const next = (event.nativeEvent as { relatedTarget?: unknown }).relatedTarget
            if (event.target === event.currentTarget && next != null) setEntry(false)
          },
          style: styles.entry,
        }
      : NO_FOCUS
  const timing = overlayTiming(theme, motion)
  const { mounted, progress } = usePresence(show, { ...timing, enter: enter ?? timing.enter, exit: exit ?? timing.exit })
  const wasMounted = useRef(mounted)
  useEffect(() => {
    if (wasMounted.current && !mounted) onExited?.()
    wasMounted.current = mounted
  }, [mounted, onExited])
  // An iOS overlay leaves when UIKit has dismissed its Modal, not when it fades out: the Modal stays, hidden, until
  // its `onDismiss` (UIKit's completion), so the next one is not presented during the dismissal
  const [presented, setPresented] = useState(false)
  if (ios && mounted && !presented) setPresented(true)
  const dismissing = ios && presented && !mounted
  const leaving = (mounted && !show) || dismissing
  useLayoutEffect(() => {
    if (!leaving || !ios) return
    return markLeaving()
  }, [leaving, ios])
  // A dismissal that never reports back (a Modal never presented) holds the next overlay only briefly
  useEffect(() => {
    if (!dismissing) return
    const timer = setTimeout(() => setPresented(false), DISMISS_TIMEOUT)
    return () => clearTimeout(timer)
  }, [dismissing])
  if (!mounted && !dismissing) return null
  return (
    // Android's back and the web's Escape close it as a tap outside does: an overlay that is not dismissible waits for an
    // action (Android's `setCancelable(false)`)
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={dismissible ? onDismiss : ignore}
      onDismiss={ios ? () => setPresented(false) : undefined}
      statusBarTranslucent
      navigationBarTranslucent
      supportedOrientations={ORIENTATIONS}
    >
      {mounted ? (
        // A closing overlay takes no more touches: an action cannot run twice while it fades
        <View
          style={StyleSheet.absoluteFill}
          pointerEvents={show ? "box-none" : "none"}
          onAccessibilityEscape={dismissible && show ? onDismiss : undefined}
          // A web click in the overlay goes no further: React carries it from the Modal's portal up to the trigger's
          // own tree, where a List row whose Select opens from the whole row took a click on the scrim and opened its
          // menu again. Only the click: the responders listen on the document, and a press there is the click
          {...(Platform.OS === "web" ? { onClick: stopClick } : null)}
          testID={testID}
        >
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: scrim, opacity: scrimOpacity ? scrimOpacity(progress, show) : progress }]} />
          {/* A plain touch target, not a Pressable: on the web a Pressable takes focus (even at tabIndex -1, the Modal's
              focus trap focuses its first descendant), and Escape closes the overlay there; a screen reader skips it */}
          <View
            importantForAccessibility="no"
            aria-hidden
            style={StyleSheet.absoluteFill}
            onStartShouldSetResponder={dismissible && show ? yes : undefined}
            onResponderRelease={dismissible && show ? onDismiss : undefined}
            // A tap on the web is followed by the browser's own mouse events and click at its point, which land on what
            // is under the overlay once it closes (a sheet's row that opens the same menu again): the scrim's touch
            // ends without them
            {...(Platform.OS === "web" ? { onTouchEnd: endTouch as never } : null)}
            testID={testID ? `${testID}-scrim` : undefined}
          />
          {/* An overlay covers the screen: what it holds stands on the screen's bottom, not a floating sheet's */}
          <SheetFloatInsetContext.Provider value={0}>{children(progress, show, focus)}</SheetFloatInsetContext.Provider>
        </View>
      ) : null}
    </Modal>
  )
}

const ignore = () => {}
const stopClick = (event: { stopPropagation?: () => void }) => event.stopPropagation?.()
const endTouch = (event: { cancelable?: boolean; preventDefault?: () => void; nativeEvent?: { cancelable?: boolean } }) => {
  if (event.cancelable !== false && event.nativeEvent?.cancelable !== false) event.preventDefault?.()
}
const yes = () => true
const NO_FOCUS: OverlayFocus = {}

const styles = StyleSheet.create({
  // Focused by the trap, not by a person: no ring, as the web demos' focused heading (`outline-none`)
  // (`outline-style: auto`, the browser's focus ring, ignores a zero width: the style goes too)
  entry: { outlineWidth: 0, outlineStyle: "none" as "solid" },
})

/** How long an iOS overlay waits for its Modal's `onDismiss` before it lets the next one present. */
const DISMISS_TIMEOUT = 1000

/** The overlays leaving on iOS, which an opening overlay waits for. */
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
/** Android's dims: black at 50% behind an alert, at 20% behind a sheet. */
export const ANDROID_DIM = { dialog: "rgba(0, 0, 0, 0.5)", sheet: "rgba(0, 0, 0, 0.2)" }
/** The dim behind an iOS alert or sheet: `--dialog-mobile-scrim`, 20% black in light and 50% in dark, as native iOS 26. */
export const iosDim = (theme: Theme) => theme.color("--dialog-mobile-scrim", theme.scheme === "dark" ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.2)")
