import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import { AccessibilityInfo, Animated, Easing, PanResponder, PixelRatio, Platform, StyleSheet, View, useWindowDimensions } from "react-native"
import { Pressable } from "../../internal/Pressable"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import CheckCircle from "../../icons/plex/CheckCircle"
import InfoCircle from "../../icons/plex/InfoCircle"
import Warning from "../../icons/plex/Warning"
import XCircle from "../../icons/plex/XCircle"
import { Glass } from "../../internal/Glass"
import { glassOpacity } from "../../internal/Overlay"
import { textOf } from "../../internal/children"
import { curves, stiffSpring } from "../../internal/motion"
import { mix, withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { MaterialClose } from "../Icon/material"
import { Text } from "../Text/Text"

export type ToastId = string | number
export type ToastType = "default" | "success" | "error" | "warning" | "info"

export type ToastOptions = {
  id?: ToastId
  description?: ReactNode
  /** One action, as sonner's `action`. */
  action?: { label: string; onClick: () => void }
  /**
   * Milliseconds on screen; `Infinity` stays until it is dismissed. On a device Android lengthens it to the person's
   * "Time to take action" (`getRecommendedTimeoutMillis`). @default 4000; on Android 2750, 5000 with an action
   */
  duration?: number
  /** A symbol of its own before the title (iOS); `null` or `false` shows none, as sonner's `icon: null`. */
  icon?: ReactNode
  /**
   * A close button, as the web's `closeButton`. Android: a close icon at the end of the toast card. iOS banners have
   * none: they close with a swipe up, and the option is ignored there.
   */
  closeButton?: boolean
  /** The close button's accessible name. @default "Close toast" */
  closeButtonAriaLabel?: string
  onDismiss?: () => void
}

export type ToastT = ToastOptions & { id: ToastId; title: ReactNode; type: ToastType; /** Counts the updates of a toast in place. */ version: number }

let toasts: ToastT[] = []
let counter = 0
/** When each toast was last shown or updated: Android shows the latest one, and the others leave. */
const stamps = new Map<ToastId, number>()
let stamp = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function show(type: ToastType, title: ReactNode, options: ToastOptions = {}): ToastId {
  const id = options.id ?? ++counter
  const previous = toasts.find((toast) => toast.id === id)
  // A toast of the same id is updated in place, as sonner does: what the update does not set it keeps
  const next: ToastT = { ...previous, ...options, id, title, type, version: (previous?.version ?? 0) + 1 }
  toasts = previous ? toasts.map((toast) => (toast.id === id ? next : toast)) : [...toasts, next]
  stamps.set(id, ++stamp)
  emit()
  return id
}

/** The Toasters mounted: sonner's toasts live in its Toaster, and go with the last one. */
let toasters = 0

function useToasterHost() {
  useEffect(() => {
    toasters++
    return () => {
      toasters--
      // A Toaster mounted again at once (StrictMode, a remount) keeps them; a screen that went keeps none of its toasts,
      // nor their callbacks, for the next one to show
      setTimeout(() => {
        if (toasters > 0 || toasts.length === 0) return
        toasts = []
        stamps.clear()
        emit()
      }, 0)
    }
  }, [])
}

function dismiss(id?: ToastId) {
  const gone = toasts.filter((toast) => id === undefined || toast.id === id)
  toasts = id === undefined ? [] : toasts.filter((toast) => toast.id !== id)
  gone.forEach((toast) => stamps.delete(toast.id))
  gone.forEach((toast) => toast.onDismiss?.())
  emit()
}

/**
 * Shows a toast, as sonner on the web (`toast("Saved", { description, action })`, `toast.success`, `toast.error`,
 * `toast.dismiss`). Render one `<Toaster />` near the root of the app.
 */
export const toast = Object.assign((title: ReactNode, options?: ToastOptions) => show("default", title, options), {
  success: (title: ReactNode, options?: ToastOptions) => show("success", title, options),
  error: (title: ReactNode, options?: ToastOptions) => show("error", title, options),
  warning: (title: ReactNode, options?: ToastOptions) => show("warning", title, options),
  info: (title: ReactNode, options?: ToastOptions) => show("info", title, options),
  dismiss,
})

export type ToasterProps = {
  /** How many toasts stand at once on iOS; on Android a new toast card replaces the one shown. @default 3 */
  visibleToasts?: number
  /**
   * Android: the height of a bar at the bottom of the screen the toast card stands 8dp above (a TabBar, a bottom
   * Toolbar, from the bottom edge, its safe area included), as Android lifts its toast card over the bottom tabs.
   * @default 0 (the toast card stands 8dp over the safe area)
   */
  bottomOffset?: number
  testID?: string
}

/**
 * Where toasts appear. iOS 26: glass banners from the top, 16 under the safe area, as wide as their message between
 * 14pt gutters and centered (Toast.module.css: radius 24, 21.5 without a description, 12/14 padding, the title 15/17
 * medium, semibold over a description, the description 15/18, an action in the solid 34pt capsule with a regular
 * label; `--toast-mobile-*`), swiped up to go;
 * Android: a toast card at the bottom (a dark card, 16dp corners, 16 from the sides, 48dp for one line, a 24dp
 * icon, Regular 15 in white, the action in a light accent), above `bottomOffset`: one at a time, a new one replacing
 * it; it springs up from under its place, a sideways swipe takes it away, and a touch holds its time. It is a view of
 * the app's own: a Dialog or a sheet, a Modal of its own, stands over it.
 */
export function Toaster({ visibleToasts = 3, bottomOffset = 0, testID }: ToasterProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  useToasterHost()
  const all = useSyncExternalStore(subscribe, () => toasts, () => toasts)
  // iOS keeps every banner mounted, so one past `visibleToasts` keeps its timer, and hides the oldest
  if (theme.isAndroid) return <AndroidToaster all={all} theme={theme} bottom={Math.max(insets.bottom, bottomOffset)} testID={testID} />
  const shown = all.slice().reverse()
  return (
    <View
      pointerEvents="box-none"
      accessibilityLiveRegion="polite"
      testID={testID}
      style={[
        styles.host,
        // The web's mobile offsets: 16 under the safe area, 14 beside it (Toaster.tsx)
        { top: insets.top + 16, paddingLeft: insets.left + 14, paddingRight: insets.right + 14 },
      ]}
    >
      {shown.map((item, index) => (
        <ToastView key={item.id} item={item} theme={theme} hidden={index >= visibleToasts} />
      ))}
    </View>
  )
}

/**
 * Android's toast cards: the latest one stands 8 over the bottom (or the bar under it) and 16 from the sides; one
 * shown before it leaves as it comes (showing one hides the visible one). They rise from the host's bottom edge,
 * which clips them.
 */
function AndroidToaster({ all, theme, bottom, testID }: { all: ToastT[]; theme: Theme; bottom: number; testID?: string }) {
  let latest: ToastT | undefined
  for (const item of all) if (!latest || (stamps.get(item.id) ?? 0) >= (stamps.get(latest.id) ?? 0)) latest = item
  return (
    <View pointerEvents="box-none" accessibilityLiveRegion="polite" testID={testID} style={[styles.host, styles.androidHost, { bottom }]}>
      {all.map((item) => (
        // The same wrapper either way, so a toast that is replaced keeps its state as it leaves
        <View key={item.id} pointerEvents="box-none" style={item === latest ? null : styles.replaced}>
          <ToastView item={item} theme={theme} hidden={false} replaced={item !== latest} />
        </View>
      ))}
    </View>
  )
}

/** The web Toaster's symbols, in the outline colors of their types (Toast.module.css `--toast-icon-color`). */
const ICONS = {
  success: { Icon: CheckCircle, color: "--color-text-success-outline" },
  error: { Icon: XCircle, color: "--color-text-danger-outline" },
  warning: { Icon: Warning, color: "--color-text-warning-outline" },
  info: { Icon: InfoCircle, color: "--color-text-info-outline" },
} as const

/** The toast card: slate at 92%, near-black at 96% in dark mode. */
const cardFill = (scheme: "light" | "dark") => (scheme === "dark" ? "rgba(24, 24, 24, 0.96)" : "rgba(39, 47, 56, 0.92)")
/** The toast card's action (#85CAFF / #6CB7FF): the accent half white, 40% in dark mode. */
const cardAction = (theme: Theme) => mix("#FFFFFF", theme.material.primary, theme.scheme === "dark" ? 0.4 : 0.5)
/**
 * Android's toast card rises from under its place (its height and the 8 above and under it) on a spring of damping
 * ratio 0.8 and stiffness 400, and drops back over 175ms on an ease-in quad, with no fade.
 */
const CARD_SPRING = stiffSpring(400, 0.8)
const CARD_EXIT = { duration: 175, easing: curves.easeInQuad }
/** The toast card's place: the card, 8 above and under it, 16 at each side (the host's padding). */
const CARD_INSET = { block: 8, inline: 16 }
/**
 * A swiped toast card goes on past a third of its place's width; a flick of 2000 px/s (about 0.76dp per ms, the unit
 * of PanResponder's velocity) throws it on a spring of stiffness 100 and no bounce toward twice its width.
 */
const CARD_FLING = { velocity: 0.76, spring: stiffSpring(100) }

function ToastView({ item, theme, hidden, replaced = false }: { item: ToastT; theme: Theme; hidden: boolean; replaced?: boolean }) {
  // iOS: the banner's slide and fade; Android: the toast card's spring up
  const [progress] = useState(() => new Animated.Value(0))
  // iOS: the drag up; Android: the swipe sideways
  const [drag] = useState(() => new Animated.Value(0))
  const android = theme.isAndroid
  // A tablet (600dp at its narrowest) or a screen in landscape
  const viewport = useWindowDimensions()
  const wide = viewport.width >= viewport.height || viewport.width >= 600
  // The toast card's size: it rises by its height, and is swiped across its width
  const [card, setCard] = useState({ width: 360, height: 56 })
  // Android: a touch holds the toast card's time, which starts again in full as it ends
  const hold = useRef<{ pause: () => void; resume: () => void } | null>(null)
  // The version that is leaving: an update in place brings the toast back
  const [leavingVersion, setLeavingVersion] = useState<number | null>(null)
  const leaving = leavingVersion === item.version
  const version = useRef(item.version)
  // The version whose exit has begun, at once: its action runs once, however fast it is pressed again
  const left = useRef<number | null>(null)
  const leave = () => {
    if (left.current === version.current) return
    left.current = version.current
    setLeavingVersion(version.current)
    // An update stops the exit (the entrance takes the value over), and the toast stays
    const done = ({ finished }: { finished: boolean }) => {
      if (finished) dismiss(item.id)
    }
    if (android && !theme.reducedMotion) Animated.timing(progress, { toValue: 0, ...CARD_EXIT, useNativeDriver: false }).start(done)
    else Animated.timing(progress, { toValue: 0, duration: theme.reducedMotion ? 0 : 200, easing: Easing.in(Easing.cubic), useNativeDriver: false }).start(done)
  }
  // The width a toast card is swiped across: its place, the card and the 16 at each side, so at its end it is off the
  // screen
  const span = card.width + 2 * CARD_INSET.inline
  // Swiped away, a toast card goes on to the side and is gone (200ms, accelerating)
  const swipeAway = (direction: number) => {
    if (left.current === version.current) return
    left.current = version.current
    setLeavingVersion(version.current)
    Animated.timing(drag, { toValue: direction * span, duration: theme.reducedMotion ? 0 : 200, easing: curves.accelerate, useNativeDriver: false }).start(({ finished }) => {
      if (finished) dismiss(item.id)
    })
  }
  // Flung, it springs on toward twice its width from the finger's speed, and is gone once it has crossed its width
  const fling = (velocity: number) => {
    if (theme.reducedMotion) return swipeAway(Math.sign(velocity))
    if (left.current === version.current) return
    left.current = version.current
    setLeavingVersion(version.current)
    const width = span
    let gone = false
    const away = () => {
      if (gone) return
      gone = true
      dismiss(item.id)
    }
    const crossed = drag.addListener(({ value }) => {
      if (Math.abs(value) > width) {
        drag.removeListener(crossed)
        drag.stopAnimation()
        away()
      }
    })
    // PanResponder's velocity is per ms, a spring's per second. An update stops it (the toast stays)
    Animated.spring(drag, { toValue: Math.sign(velocity) * 2 * width, velocity: velocity * 1000, ...CARD_FLING.spring, useNativeDriver: false }).start(({ finished }) => {
      drag.removeListener(crossed)
      if (finished) away()
    })
  }
  // Back in its place over 200ms, on the default accelerate-decelerate curve
  const back = () => Animated.timing(drag, { toValue: 0, duration: theme.reducedMotion ? 0 : 200, easing: curves.accelerateDecelerate, useNativeDriver: false }).start()
  // The gesture is made once: it reads the platform and the exit of the current render
  const live = useRef({ android, leave, swipeAway, fling, back, width: span })
  useLayoutEffect(() => {
    live.current = { android, leave, swipeAway, fling, back, width: span }
  })
  useEffect(() => {
    version.current = item.version
    // An update brings back a toast that was being swiped away
    drag.setValue(0)
    // The toaster is a polite live region, which Android and the web read; VoiceOver is told
    const text = [textOf(item.title), textOf(item.description)].filter(Boolean).join(". ")
    if (text && Platform.OS === "ios") AccessibilityInfo.announceForAccessibility(text)
    // An update in place starts its time again; `Infinity` stays until it is dismissed, as sonner. Android keeps a
    // a toast 2750ms (its long duration), 5000 with an action (a prolonged one)
    const duration = item.duration ?? (android ? (item.action ? 5000 : 2750) : 4000)
    const timed = Number.isFinite(duration)
    let active = true
    let held = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const start = (ms: number) => {
      clearTimeout(timer)
      if (active && !held) timer = setTimeout(() => live.current.leave(), ms)
    }
    const arm = () => {
      if (!timed) return
      // Android lengthens a timeout to the person's "Time to take action" (getRecommendedTimeoutMillis)
      if (Platform.OS === "android" && AccessibilityInfo.getRecommendedTimeoutMillis) {
        AccessibilityInfo.getRecommendedTimeoutMillis(duration).then(start, () => start(duration))
      } else {
        start(duration)
      }
    }
    if (android && !theme.reducedMotion) {
      // The toast card's time starts once it has risen: the spring rests within 0.75 of a pixel and under 46.875
      // pixels a second (in the progress, over the card's way up)
      const pixels = PixelRatio.get() * (card.height + 2 * CARD_INSET.block)
      Animated.spring(progress, { toValue: 1, ...CARD_SPRING, restDisplacementThreshold: 0.75 / pixels, restSpeedThreshold: 46.875 / pixels, useNativeDriver: false }).start(
        ({ finished }) => {
          if (finished) arm()
        },
      )
    } else {
      Animated.timing(progress, { toValue: 1, duration: theme.reducedMotion ? 0 : 300, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
      arm()
    }
    // Android's toast card keeps still while it is touched, then takes its full time again
    hold.current = {
      pause: () => {
        held = true
        clearTimeout(timer)
      },
      resume: () => {
        held = false
        arm()
      },
    }
    return () => {
      active = false
      hold.current = null
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, item.version])
  // A toast card that another replaces leaves as the new one comes
  useEffect(() => {
    if (replaced) live.current.leave()
  }, [replaced])
  const [responder] = useState(() =>
    PanResponder.create({
      // The banner moves up; the toast card sideways, as on Android
      onMoveShouldSetPanResponder: (_, gesture) => (live.current.android ? Math.abs(gesture.dx) >= 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) : Math.abs(gesture.dy) > 4),
      // The banner follows the finger up, and resists the other way; the toast card follows it either way
      onPanResponderMove: (_, gesture) => drag.setValue(live.current.android ? gesture.dx : Math.min(0, gesture.dy)),
      onPanResponderRelease: (_, gesture) => {
        if (live.current.android) {
          // A flick throws it; past a third of its width it goes on that way; else it comes back
          if (Math.abs(gesture.vx) > CARD_FLING.velocity) live.current.fling(gesture.vx)
          else if (Math.abs(gesture.dx) > live.current.width / 3) live.current.swipeAway(Math.sign(gesture.dx) || 1)
          else live.current.back()
          return
        }
        if (gesture.dy < -24 || Math.abs(gesture.vy) > 0.8) live.current.leave()
        else Animated.spring(drag, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start()
      },
      onPanResponderTerminate: () => {
        if (live.current.android) live.current.back()
      },
    }),
  )
  const act = () => {
    if (left.current === version.current) return
    item.action?.onClick()
    leave()
  }
  // A leaving toast takes no more touches
  const touches = leaving ? ("none" as const) : ("auto" as const)
  const display = hidden ? ("none" as const) : undefined
  if (android) {
    const described = item.description != null
    const symbol = item.type !== "default" ? ICONS[item.type] : null
    // A typed toast card shows its symbol in white, as Android's icons on the dark card
    const icon = item.icon !== undefined ? item.icon : symbol ? <symbol.Icon size={24} color="#FFFFFF" /> : null
    const action = cardAction(theme)
    // The card itself never presses down: on Android only a card that is one big button does, and the toast's action is
    // its own button
    const release = () => hold.current?.resume()
    return (
      <Animated.View
        {...responder.panHandlers}
        accessibilityRole="alert"
        pointerEvents={touches}
        // A touch holds its time
        onTouchStart={() => hold.current?.pause()}
        onTouchEnd={release}
        onTouchCancel={release}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout
          setCard((current) => (current.width === width && current.height === height ? current : { width, height }))
        }}
        style={[
          styles.card,
          {
            backgroundColor: cardFill(theme.scheme),
            paddingEnd: item.action || item.closeButton ? 0 : 16,
            // It fades as it is swiped across only on a wide screen (a tablet, or landscape); a phone's keeps opaque
            opacity: wide ? drag.interpolate({ inputRange: [-span, 0, span], outputRange: [0, 1, 0], extrapolate: "clamp" }) : 1,
            // From under the host's clipped edge: its height and the 8 above and under it
            transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [card.height + 2 * CARD_INSET.block, 0] }) }, { translateX: drag }],
            display,
          },
        ]}
      >
        {icon ? <View style={styles.cardIcon}>{icon}</View> : null}
        <View style={[styles.cardText, described ? styles.cardTwoLines : null]}>
          {/* One line: Regular 15; over a subtitle the title is Medium 14, the subtitle 13 */}
          <Text color="#FFFFFF" style={described ? [{ fontSize: 14, lineHeight: 18 }, theme.font("medium")] : { fontSize: 15, lineHeight: 20 }}>
            {item.title}
          </Text>
          {described ? (
            <Text color="#FFFFFF" style={{ fontSize: 13, lineHeight: 16 }}>
              {item.description}
            </Text>
          ) : null}
        </View>
        {item.action ? (
          <Pressable
            accessibilityRole="button"
            disabled={leaving}
            onPress={act}
            // The toast card's undo button: 12/8 inside 8 of margin, its press the action color at 10% in 6dp corners
            style={({ pressed }) => [styles.cardAction, pressed ? { backgroundColor: withAlpha(action, 0.1) } : null]}
          >
            <Text color={action} style={{ fontSize: 14, lineHeight: 18, ...theme.font("medium") }}>
              {item.action.label}
            </Text>
          </Pressable>
        ) : null}
        {item.closeButton ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={item.closeButtonAriaLabel ?? "Close toast"}
            disabled={leaving}
            onPress={leave}
            style={({ pressed }) => [styles.cardClose, pressed ? { backgroundColor: "rgba(255, 255, 255, 0.12)" } : null]}
          >
            <MaterialClose size={24} color="rgba(255, 255, 255, 0.7)" />
          </Pressable>
        ) : null}
      </Animated.View>
    )
  }
  const described = item.description != null
  const symbol = item.type !== "default" ? ICONS[item.type] : null
  // sonner's `icon: null` takes the type's symbol away, as `false` does
  const icon = item.icon !== undefined ? item.icon : symbol ? <symbol.Icon size={20} color={theme.color(symbol.color)} /> : null
  // The web toast sets its title at --font-weight-medium, semibold over a description (500 and 600): on the web the
  // named weights are the phone's 510 and 590, a device's system font takes 500 and 600 for them
  const titleWeight = Platform.OS === "web" ? fontWeight(theme.token(described ? "--font-weight-semibold" : "--font-weight-medium")) : undefined
  return (
    <Animated.View
      {...responder.panHandlers}
      accessibilityRole="alert"
      pointerEvents={touches}
      // An offset, not a transform: a transform would stop the glass's blur on the web
      style={[styles.iosWrap, { top: Animated.add(progress.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }), drag), display, opacity: glassOpacity(progress, !leaving) }]}
    >
      {/* Without a description it is a capsule, half the 43 of a line; with one it keeps the banner's 24 */}
      <Glass radius={described ? 24 : 21.5} elevation="raised" fillToken="--toast-mobile-background" style={styles.iosToast}>
        {/* sonner's 16pt icon box, 3 into the padding and 4 before the gap, holds the 20pt symbol over its edges: the
            message starts 42 from the toast's edge, and a line of text alone keeps the toast 43 high */}
        {/* The symbol and the message are one piece of the row, so a long message wraps its own lines beside the
            symbol, as the web's; only a button wraps, under them */}
        <View style={styles.iosMessage}>
          {icon != null && icon !== false ? <View style={styles.iosIcon}>{icon}</View> : null}
          {/* Beside a button the message keeps 8em, and a button that would leave it less wraps under it */}
          <View style={[styles.iosText, item.action ? { minWidth: 8 * 15 } : null]}>
          <Text weight={described ? "semibold" : "medium"} style={{ fontSize: 15, lineHeight: 17, fontWeight: titleWeight }}>
            {item.title}
          </Text>
          {described ? (
            // The web toast's description is the opaque secondary gray, not the phone's 50% label
            <Text color={theme.colors.textSecondary} style={{ fontSize: 15, lineHeight: 18 }}>
              {item.description}
            </Text>
          ) : null}
          </View>
        </View>
        {item.action ? (
          <Pressable
            accessibilityRole="button"
            disabled={leaving}
            onPress={act}
            // A 34pt capsule in a 44pt target
            hitSlop={5}
            style={({ pressed }) => [styles.iosAction, { backgroundColor: theme.color("--color-background-primary-solid"), opacity: pressed ? 0.7 : 1 }]}
          >
            <Text weight="regular" color={theme.color("--color-text-primary-solid")} style={{ fontSize: 15, lineHeight: 20 }}>
              {item.action.label}
            </Text>
          </Pressable>
        ) : null}
      </Glass>
    </Animated.View>
  )
}

/** A `--font-weight-*` token as a font weight. */
function fontWeight(value: unknown) {
  return typeof value === "number" || typeof value === "string" ? (String(value) as "500") : undefined
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: 0, right: 0, gap: 8, zIndex: 1000 },
  // As wide as its message, up to the gutters, in the middle of the screen
  iosWrap: { alignSelf: "center", maxWidth: "100%" },
  // 12/14 of padding inside sonner's 1px border, transparent on a phone
  iosToast: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10, paddingVertical: 13, paddingHorizontal: 15 },
  iosIcon: { width: 16, height: 16, marginStart: -3, marginEnd: 4, justifyContent: "center", alignItems: "flex-start" },
  iosMessage: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1, minWidth: 0 },
  iosText: { flexShrink: 1, minWidth: 0 },
  iosAction: { minHeight: 34, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 9999, alignItems: "center", justifyContent: "center" },
  // Android's toast card: a 16dp-cornered card at least 48 tall, the text 16 in (56 past a 24dp icon at 16)
  card: { minHeight: 48, borderRadius: 16, flexDirection: "row", alignItems: "center", paddingStart: 16, maxWidth: 600, alignSelf: "center", width: "100%", overflow: "hidden" },
  cardIcon: { width: 24, height: 24, marginEnd: 16, alignItems: "center", justifyContent: "center" },
  cardText: { flex: 1, minWidth: 0, paddingVertical: 14 },
  cardTwoLines: { paddingVertical: 8 },
  cardAction: { marginHorizontal: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  // The toast cards' place: the whole screen above the bottom (or the bar there), clipped at its bottom edge
  androidHost: { top: 0, justifyContent: "flex-end", paddingHorizontal: 16, paddingBottom: 8, overflow: "hidden" },
  // A toast card that another replaces, in its place as it leaves
  replaced: { position: "absolute", left: 16, right: 16, bottom: 8 },
  cardClose: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
})
