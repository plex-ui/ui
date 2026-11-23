import { useEffect, useRef, useState } from "react"
import { Animated, Easing, Platform, StyleSheet, View, type AccessibilityActionEvent, type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native"
import { isRTL } from "../../internal/direction"
import { useTheme } from "../../theme/ThemeProvider"

export type PageControlDotSize = "full" | "small" | "smaller" | "hidden"

export type PageControlChangeDetails = {
  /** The change came from scrubbing: show the page without the scrolling animation, as the HIG asks. */
  scrubbing: boolean
}

export type PageControlProps = {
  /** The number of pages. */
  count: number
  /** The controlled index of the current page, from 0. Use with `onChange`. */
  value?: number
  /** @default 0 */
  defaultValue?: number
  /** Called with the index of the next page. */
  onChange?: (index: number, details: PageControlChangeDetails) => void
  /**
   * The capsule behind the dots: `automatic` while a finger presses or scrubs, `prominent` always, `minimal` never
   * (and no scrubbing), as UIPageControl's `backgroundStyle`. Android draws no capsule at all; `minimal` still
   * turns off scrubbing there. @default "automatic"
   */
  background?: "automatic" | "prominent" | "minimal"
  /** @default (index, count) => `Page ${index + 1} of ${count}` */
  valueText?: (index: number, count: number) => string
  /** @default "Pages" */
  "aria-label"?: string
  testID?: string
  style?: StyleProp<ViewStyle>
}

/**
 * The size of each dot, as @plexui/ui's `pageControlDots` (the iOS 26 kit's Page control): up to six pages show
 * full size; seven show six and the one past them small; from eight a window of full dots holds the current page,
 * with a small and a smaller dot past each side of it and the rest hidden.
 */
export const pageControlDots = (count: number, current: number): PageControlDotSize[] => {
  const sizes: PageControlDotSize[] = Array.from({ length: Math.max(0, count) }, () => "hidden")
  const show = (from: number, to: number, size: PageControlDotSize) => {
    for (let i = Math.max(0, from); i <= Math.min(sizes.length - 1, to); i++) sizes[i] = size
  }
  if (count <= 6) {
    show(0, count - 1, "full")
    return sizes
  }
  if (count === 7) {
    const start = current >= 6 ? 1 : 0
    show(0, 6, "small")
    show(start, start + 5, "full")
    return sizes
  }
  const [from, to] = current <= 3 ? [0, 5] : current >= count - 4 ? [count - 6, count - 1] : [current - 2, current + 2]
  show(from - 2, from - 2, "smaller")
  show(from - 1, from - 1, "small")
  show(to + 1, to + 1, "small")
  show(to + 2, to + 2, "smaller")
  show(from, to, "full")
  return sizes
}

const clampIndex = (index: number, count: number) => Math.min(Math.max(index, 0), Math.max(0, count - 1))
const defaultValueText = (index: number, count: number) => `Page ${index + 1} of ${count}`
/** A drag shorter than this is a tap. */
const SCRUB_THRESHOLD = 8

/** A press in hand; `rtl` is read as it lands, since the dots then run from the right. */
type Press = { startX: number; startIndex: number; scrubbing: boolean; rtl: boolean }

/**
 * A row of dots, one for each page, the current one solid: UIPageControl of iOS 26 (`--page-control-*`: 8pt dots 8
 * apart, the current in the label color and the rest in the tertiary label, a 24pt capsule of `--alpha-08` behind
 * them while pressed, a 44pt target). A tap on either side of the current dot shows the previous or next page, a
 * drag scrubs page by page, both mirrored in a right-to-left layout. Android: page dots (5dp dots 6 apart, all of
 * them full size however many pages there are, the rest gray, the current one in the accent, stretching to the next
 * page and back as it moves), in a 48dp target, with no capsule at all. For a screen reader it is adjustable: swipe
 * up or down for the next or previous page.
 */
export function PageControl({ count, value: valueProp, defaultValue = 0, onChange, background = "automatic", valueText = defaultValueText, "aria-label": ariaLabel = "Pages", testID, style }: PageControlProps) {
  const theme = useTheme()
  const [own, setOwn] = useState(defaultValue)
  const current = clampIndex(valueProp ?? own, count)
  const [press, setPress] = useState<Press | null>(null)
  // Where the dots stand inside the target, which can be wider than them (x is physical, from the left)
  const [capsule, setCapsule] = useState({ x: 0, width: 0 })
  const go = (index: number, scrubbing = false) => {
    const next = clampIndex(index, count)
    if (next === current) return
    if (valueProp === undefined) setOwn(next)
    onChange?.(next, { scrubbing })
  }
  const android = theme.isAndroid
  const dot = android ? ANDROID_DOT : theme.length("--page-control-dot-size", 8)
  const gap = android ? ANDROID_GAP : theme.length("--page-control-gap", 8)
  const padding = theme.length("--page-control-padding-inline", 12)
  const pitch = dot + gap
  // Android draws every page's dot at full size; the iOS kit shrinks the ends from seven pages
  const sizes = android ? Array.from({ length: Math.max(0, count) }, (): PageControlDotSize => "full") : pageControlDots(count, current)
  const dotSize = (size: PageControlDotSize) =>
    size === "full" ? dot : android ? (size === "small" ? 4 : 3) : size === "small" ? theme.length("--page-control-dot-size-small", 6) : theme.length("--page-control-dot-size-smaller", 4)
  // The center of the current dot, for a tap on either side of it
  let x = padding
  let currentCenter = padding
  sizes.forEach((size, index) => {
    if (size === "hidden") return
    if (index === current) currentCenter = x + dotSize(size) / 2
    x += dotSize(size) + gap
  })
  const on = android ? theme.material.primary : theme.color("--page-control-dot-color-current", theme.colors.text)
  // Android's page dots: #BBBBBB, #555555 in a dark theme
  const off = android ? (theme.scheme === "dark" ? "#555555" : "#BBBBBB") : theme.color("--page-control-dot-color", theme.colors.labelTertiary)
  // Android draws no capsule, not even for `prominent`
  const capsuleHeight = theme.length("--page-control-height", 24)
  const target = android ? 48 : theme.length("--page-control-target-size", 44)
  const showBackground = !android && (background === "prominent" || (background === "automatic" && press != null))
  const text = valueText(current, count)
  const keys =
    Platform.OS === "web"
      ? {
          tabIndex: 0 as const,
          onKeyDown: (raw: unknown) => {
            const event = raw as { key: string; preventDefault: () => void; currentTarget?: unknown }
            // The dots run from the right in a right-to-left row: the left arrow goes on to the next page
            const ahead = isRTL(event.currentTarget) ? -1 : 1
            const to: Record<string, number> = { ArrowRight: current + ahead, ArrowDown: current + 1, ArrowLeft: current - ahead, ArrowUp: current - 1, Home: 0, End: count - 1 }
            if (!(event.key in to)) return
            event.preventDefault()
            go(to[event.key])
          },
        }
      : {}
  const onMove = (event: GestureResponderEvent) => {
    if (!press || background === "minimal") return
    const dx = (event.nativeEvent.locationX - press.startX) * (press.rtl ? -1 : 1)
    if (!press.scrubbing && Math.abs(dx) < SCRUB_THRESHOLD) return
    if (!press.scrubbing) setPress({ ...press, scrubbing: true })
    go(press.startIndex + Math.round(dx / pitch), true)
  }
  return (
    <View
      {...keys}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={ariaLabel}
      accessibilityValue={{ min: 1, max: count, now: current + 1, text }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event: AccessibilityActionEvent) => go(current + (event.nativeEvent.actionName === "increment" ? 1 : -1))}
      aria-valuemin={1}
      aria-valuemax={count}
      aria-valuenow={current + 1}
      aria-valuetext={text}
      onStartShouldSetResponder={() => count > 1}
      onResponderTerminationRequest={() => !press?.scrubbing}
      onResponderGrant={(event) => setPress({ startX: event.nativeEvent.locationX, startIndex: current, scrubbing: false, rtl: isRTL(event.currentTarget) })}
      onResponderMove={onMove}
      onResponderRelease={(event) => {
        // A tap on the leading side of the current dot goes back, on the trailing side forward; the dots are laid
        // from the capsule's start, its right edge in a right-to-left row
        const x = event.nativeEvent.locationX
        const fromStart = press?.rtl ? capsule.x + capsule.width - x : x - capsule.x
        if (press && !press.scrubbing) go(current + (fromStart < currentCenter ? -1 : 1))
        setPress(null)
      }}
      onResponderTerminate={() => setPress(null)}
      testID={testID}
      // The target (44pt, 48dp on Android) reaches past the 24pt capsule without taking room, as the web's control
      // lays out at the capsule's height
      style={[styles.target, { minHeight: target, marginVertical: -(target - capsuleHeight) / 2 }, style]}
    >
      <View
        pointerEvents="none"
        onLayout={(event) => setCapsule({ x: event.nativeEvent.layout.x, width: event.nativeEvent.layout.width })}
        style={[
          styles.capsule,
          { height: capsuleHeight, paddingHorizontal: padding, gap, borderRadius: capsuleHeight / 2 },
          showBackground ? { backgroundColor: theme.color("--page-control-background") } : null,
        ]}
      >
        {sizes.map((size, index) =>
          size === "hidden" ? null : (
            <View key={index} style={{ width: dotSize(size), height: dotSize(size), borderRadius: dot / 2, backgroundColor: index === current && !android ? on : off }} />
          ),
        )}
        {android ? <AndroidCurrent start={currentCenter - dot / 2} color={on} reduced={theme.reducedMotion} /> : null}
      </View>
    </View>
  )
}

/** Android's page dots: 5dp, 11dp from one to the next. */
const ANDROID_DOT = 5
const ANDROID_GAP = 6
const WORM_IN = Easing.bezier(0.23, 1, 0.32, 1)

/**
 * The current page's dot on Android, over the gray ones: it stretches to the next page and then lets go of the last
 * one (the leading edge moves first, the trailing edge after it). Android's dot follows the pages' scroll; the
 * 180ms, 90ms later for the trailing edge, are our own.
 */
function AndroidCurrent({ start, color, reduced }: { start: number; color: string; reduced: boolean }) {
  const [head] = useState(() => new Animated.Value(start))
  const [tail] = useState(() => new Animated.Value(start))
  const first = useRef(true)
  useEffect(() => {
    if (first.current || reduced) {
      first.current = false
      head.setValue(start)
      tail.setValue(start)
      return
    }
    const animation = Animated.parallel([
      Animated.timing(head, { toValue: start, duration: 180, easing: WORM_IN, useNativeDriver: false }),
      Animated.timing(tail, { toValue: start, duration: 180, delay: 90, easing: WORM_IN, useNativeDriver: false }),
    ])
    animation.start()
    return () => animation.stop()
  }, [start, reduced, head, tail])
  // |head - tail| through a clamped interpolation (Animated has no abs), so the dot spans both edges either way;
  // `start` keeps it on the dots' side in a right-to-left row
  const span = Animated.subtract(head, tail).interpolate({ inputRange: [-1000, 0, 1000], outputRange: [1000, 0, 1000] })
  const left = Animated.multiply(Animated.subtract(Animated.add(head, tail), span), 0.5)
  return (
    <Animated.View
      style={{ position: "absolute", top: "50%", marginTop: -ANDROID_DOT / 2, start: left, height: ANDROID_DOT, borderRadius: ANDROID_DOT / 2, backgroundColor: color, width: Animated.add(span, ANDROID_DOT) }}
    />
  )
}

const styles = StyleSheet.create({
  target: { alignSelf: "center", alignItems: "center", justifyContent: "center" },
  capsule: { flexDirection: "row", alignItems: "center" },
})
