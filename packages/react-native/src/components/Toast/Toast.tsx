import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react"
import { AccessibilityInfo, Animated, Easing, PanResponder, Pressable, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import CheckCircleFilled from "../../icons/plex/CheckCircleFilled"
import ExclamationMarkCircleFilled from "../../icons/plex/ExclamationMarkCircleFilled"
import InfoCircle from "../../icons/plex/InfoCircle"
import Warning from "../../icons/plex/Warning"
import { Glass } from "../../internal/Glass"
import { glassOpacity } from "../../internal/Overlay"
import { textOf } from "../../internal/children"
import { stateLayer, withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { materialType } from "../../theme/typography"
import { Text } from "../Text/Text"

export type ToastId = string | number
export type ToastType = "default" | "success" | "error" | "warning" | "info"

export type ToastOptions = {
  id?: ToastId
  description?: ReactNode
  /** One action, as sonner's `action`. */
  action?: { label: string; onClick: () => void }
  /** Milliseconds on screen. @default 4000 */
  duration?: number
  /** A symbol of its own before the title (iOS). */
  icon?: ReactNode
  onDismiss?: () => void
}

export type ToastT = ToastOptions & { id: ToastId; title: ReactNode; type: ToastType; /** Counts the updates of a toast in place. */ version: number }

let toasts: ToastT[] = []
let counter = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function show(type: ToastType, title: ReactNode, options: ToastOptions = {}): ToastId {
  const id = options.id ?? ++counter
  const previous = toasts.find((toast) => toast.id === id)
  const next: ToastT = { ...options, id, title, type, version: (previous?.version ?? 0) + 1 }
  // A toast of the same id is updated in place, as sonner does
  toasts = toasts.some((toast) => toast.id === id) ? toasts.map((toast) => (toast.id === id ? next : toast)) : [...toasts, next]
  emit()
  return id
}

function dismiss(id?: ToastId) {
  const gone = toasts.filter((toast) => id === undefined || toast.id === id)
  toasts = id === undefined ? [] : toasts.filter((toast) => toast.id !== id)
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
  /** How many toasts stand at once on iOS; Material shows one snackbar at a time. @default 3 */
  visibleToasts?: number
  testID?: string
}

/**
 * Where toasts appear. iOS 26: glass banners from the top (radius 24, 21.5 for a single line, 12/14 padding, the
 * title 15/17 semibold, the description 15/18, an action in a 34pt capsule; `--toast-mobile-*`), swiped up to go;
 * Android: Material 3's snackbar at the bottom (inverseSurface, 4dp corners, 48dp for one line, Body M, the action
 * in inversePrimary), one at a time.
 */
export function Toaster({ visibleToasts = 3, testID }: ToasterProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const all = useSyncExternalStore(subscribe, () => toasts, () => toasts)
  // Material shows one snackbar at a time and queues the rest, each with its full time when its turn comes. iOS
  // keeps every banner mounted, so one past `visibleToasts` keeps its timer, and hides the oldest
  const shown = theme.isAndroid ? all.slice(0, 1) : all.slice().reverse()
  return (
    <View
      pointerEvents="box-none"
      accessibilityLiveRegion="polite"
      testID={testID}
      style={[styles.host, theme.isAndroid ? { bottom: insets.bottom + 12, justifyContent: "flex-end" } : { top: insets.top + 8 }]}
    >
      {shown.map((item, index) => (
        <ToastView key={item.id} item={item} theme={theme} hidden={!theme.isAndroid && index >= visibleToasts} />
      ))}
    </View>
  )
}

const ICONS = { success: CheckCircleFilled, error: ExclamationMarkCircleFilled, warning: Warning, info: InfoCircle } as const

function ToastView({ item, theme, hidden }: { item: ToastT; theme: Theme; hidden: boolean }) {
  const [progress] = useState(() => new Animated.Value(0))
  const [drag] = useState(() => new Animated.Value(0))
  const android = theme.isAndroid
  // The version that is leaving: an update in place brings the toast back
  const [leavingVersion, setLeavingVersion] = useState<number | null>(null)
  const leaving = leavingVersion === item.version
  const version = useRef(item.version)
  const leave = () => {
    setLeavingVersion(version.current)
    Animated.timing(progress, { toValue: 0, duration: theme.reducedMotion ? 0 : 200, easing: Easing.in(Easing.cubic), useNativeDriver: false }).start(({ finished }) => {
      // An update stops the exit (the entrance takes the value over), and the toast stays
      if (finished) dismiss(item.id)
    })
  }
  useEffect(() => {
    version.current = item.version
    Animated.timing(progress, { toValue: 1, duration: theme.reducedMotion ? 0 : 300, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
    const text = [textOf(item.title), textOf(item.description)].filter(Boolean).join(". ")
    if (text) AccessibilityInfo.announceForAccessibility(text)
    // An update in place starts its time again; `Infinity` stays until it is dismissed, as sonner
    const duration = item.duration ?? 4000
    if (!Number.isFinite(duration)) return
    const timer = setTimeout(() => leave(), duration)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, item.version])
  const [responder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
      // The banner follows the finger up; down it resists
      onPanResponderMove: (_, gesture) => drag.setValue(android ? Math.max(0, gesture.dy) : Math.min(0, gesture.dy)),
      onPanResponderRelease: (_, gesture) => {
        if ((android ? gesture.dy > 24 : gesture.dy < -24) || Math.abs(gesture.vy) > 0.8) leave()
        else Animated.spring(drag, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start()
      },
    }),
  )
  const offset = progress.interpolate({ inputRange: [0, 1], outputRange: [android ? 24 : -24, 0] })
  // An offset, not a transform: a transform would stop the glass's blur on the web
  const motion = { opacity: progress, top: Animated.add(offset, drag), display: hidden ? ("none" as const) : undefined }
  if (android) {
    const m = theme.material
    const body = materialType.bodyMedium
    const label = materialType.labelLarge
    return (
      <Animated.View {...responder.panHandlers} accessibilityRole="alert" style={[styles.snackbar, { backgroundColor: m.inverseSurface }, motion]}>
        <View style={styles.snackText}>
          <Text color={m.inverseOnSurface} style={{ fontSize: body.fontSize, lineHeight: body.lineHeight }}>
            {item.title}
          </Text>
          {item.description != null ? (
            <Text color={withAlpha(m.inverseOnSurface, 0.8)} style={{ fontSize: body.fontSize, lineHeight: body.lineHeight }}>
              {item.description}
            </Text>
          ) : null}
        </View>
        {item.action ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              item.action?.onClick()
              leave()
            }}
            style={({ pressed }) => [styles.snackAction, pressed ? { backgroundColor: withAlpha(m.inversePrimary, stateLayer.pressed) } : null]}
          >
            <Text color={m.inversePrimary} style={{ fontSize: label.fontSize, lineHeight: label.lineHeight, ...theme.font("medium") }}>
              {item.action.label}
            </Text>
          </Pressable>
        ) : null}
      </Animated.View>
    )
  }
  const single = item.description == null && !item.action
  const Icon = item.type !== "default" ? ICONS[item.type] : null
  const iconColor =
    item.type === "success"
      ? theme.color("--color-text-success")
      : item.type === "error"
        ? theme.color("--color-text-danger")
        : item.type === "warning"
          ? theme.color("--color-text-warning")
          : theme.color("--color-text-info")
  return (
    <Animated.View {...responder.panHandlers} accessibilityRole="alert" style={[styles.iosWrap, motion, { opacity: glassOpacity(progress, !leaving) }]}>
      <Glass radius={single ? 21.5 : 24} elevation="raised" fillToken="--toast-mobile-background" style={styles.iosToast}>
        {item.icon ?? (Icon ? <Icon size={20} color={iconColor} /> : null)}
        <View style={styles.iosText}>
          <Text weight="semibold" style={{ fontSize: 15, lineHeight: single ? 19.5 : 17 }}>
            {item.title}
          </Text>
          {item.description != null ? (
            <Text color="secondary" style={{ fontSize: 15, lineHeight: 18 }}>
              {item.description}
            </Text>
          ) : null}
        </View>
        {item.action ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              item.action?.onClick()
              leave()
            }}
            style={({ pressed }) => [styles.iosAction, { backgroundColor: theme.color("--dialog-alert-fill"), opacity: pressed ? 0.7 : 1 }]}
          >
            <Text weight="semibold" style={{ fontSize: 15, lineHeight: 20 }}>
              {item.action.label}
            </Text>
          </Pressable>
        ) : null}
      </Glass>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: 0, right: 0, gap: 8, paddingHorizontal: 12, zIndex: 1000 },
  iosWrap: { alignSelf: "center", maxWidth: 420, width: "100%" },
  iosToast: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 14 },
  iosText: { flex: 1, minWidth: 0, gap: 1 },
  iosAction: { height: 34, paddingHorizontal: 14, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  snackbar: { minHeight: 48, borderRadius: 4, flexDirection: "row", alignItems: "center", paddingLeft: 16, paddingRight: 8, maxWidth: 600, alignSelf: "center", width: "100%" },
  snackText: { flex: 1, minWidth: 0, paddingVertical: 14 },
  snackAction: { height: 40, paddingHorizontal: 12, borderRadius: 20, alignItems: "center", justifyContent: "center" },
})
