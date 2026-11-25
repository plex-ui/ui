import { useEffect, useRef, useState } from "react"
import { Animated, Easing, Platform, StyleSheet, View, type AccessibilityActionEvent, type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native"
import { isRTL } from "../../internal/direction"
import { curves } from "../../internal/motion"
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
  /**
   * Where the pages stand as they scroll: the page index with its fraction (the scroll offset over the page's length),
   * a number or an `Animated` value, so a pager's scroll drives the control on every frame without a render. The
   * pill flows from one page's mark to the next and the dots' color crosses over with it, under the finger and then
   * with the pager's own settle. Without it the control moves to a new `value` over a short standard transition (at
   * once while scrubbing and with reduced motion). The current page for a screen reader, a tap and the keys stays
   * `value`. An `Animated` value drives the marks' length, so it moves on the JavaScript driver
   * (`Animated.event(…, { useNativeDriver: false })`), as the package's own animations do.
   */
  position?: number | Animated.Value | Animated.AnimatedInterpolation<number>
  /** Called with the index of the next page. */
  onChange?: (index: number, details: PageControlChangeDetails) => void
  /**
   * The capsule behind the dots: `automatic` while a finger presses or scrubs, `prominent` always, `minimal` never
   * (and no scrubbing), as UIPageControl's `backgroundStyle`. Android draws no capsule at all; `minimal` still
   * turns off scrubbing there. @default "automatic"
   */
  background?: "automatic" | "prominent" | "minimal"
  /**
   * How the current page shows: `dots`, iOS's and Android's own (the current dot solid); `pill`, the current page a
   * short capsule (two and a half dots wide) among the dots, as many onboarding pagers draw it. @default "dots"
   */
  indicator?: "dots" | "pill"
  /**
   * `default` draws the dots in the label colors; `onColor` in white for a page of color or a photo behind them (the
   * current white, the rest white at 40%), the capsule a white veil. @default "default"
   */
  tone?: "default" | "onColor"
  /**
   * The way the pages run: `horizontal`, a row (mirrored in a right-to-left layout), or `vertical`, a column from top
   * to bottom, as UIPageControl's `direction = .topToBottom` (never mirrored). @default "horizontal"
   */
  direction?: "horizontal" | "vertical"
  /**
   * `md`, the platform's own dots (iOS 8pt 8 apart, Android 5dp 6 apart); `sm`, smaller dots for a control over a
   * photo in a card: 5 apart 4 on iOS (the pill 14 long), 4dp 4 apart on Android, the capsule 16 thick. iOS has one size;
   * `sm` is the kit's, as an app sets smaller indicator images. @default "md"
   */
  size?: "sm" | "md"
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
export function PageControl({
  count,
  value: valueProp,
  defaultValue = 0,
  position: positionProp,
  onChange,
  background = "automatic",
  indicator = "dots",
  tone = "default",
  direction = "horizontal",
  size = "md",
  valueText = defaultValueText,
  "aria-label": ariaLabel = "Pages",
  testID,
  style,
}: PageControlProps) {
  const theme = useTheme()
  const [own, setOwn] = useState(defaultValue)
  const current = clampIndex(valueProp ?? own, count)
  const [press, setPress] = useState<Press | null>(null)
  // Where the dots stand inside the target, which can be wider than them (x is physical, from the left)
  const [capsule, setCapsule] = useState({ x: 0, width: 0 })
  // The fractional page the marks follow: the app's own `position`, or one that moves to `value` by itself
  const [ownPosition] = useState(() => new Animated.Value(typeof positionProp === "number" ? positionProp : current))
  const driven = positionProp != null && typeof positionProp === "object"
  const scrubbed = useRef(false)
  const shown = useRef<number | null>(null)
  // The page nearest the position: the dots' window from seven pages follows it, so the marks it passes stay drawn
  const [near, setNear] = useState(current)
  useEffect(() => {
    if (typeof positionProp === "number") {
      ownPosition.setValue(positionProp)
      return
    }
    const source = driven ? (positionProp as Animated.Value) : ownPosition
    const follow = (value: number) => {
      // The own position keeps up with an app's, so it moves on from there when the app's goes
      if (driven) ownPosition.setValue(value)
      const page = clampIndex(Math.round(value), count)
      setNear((last) => (last === page ? last : page))
    }
    const id = source.addListener(({ value }) => follow(value))
    // A listener hears only what comes next: a new source's value now sets the window at once
    const read = () => (source as unknown as { __getValue?: () => number }).__getValue?.()
    let live = true
    void Promise.resolve().then(() => {
      // Read as it runs, so a change in between is not undone
      const now = read()
      if (live && typeof now === "number") follow(now)
    })
    return () => {
      live = false
      source.removeListener(id)
    }
  }, [positionProp, driven, ownPosition, count])
  useEffect(() => {
    if (positionProp != null) return
    const still = shown.current == null || theme.reducedMotion || scrubbed.current
    shown.current = current
    scrubbed.current = false
    if (still) {
      ownPosition.setValue(current)
      return
    }
    const animation = Animated.timing(ownPosition, { toValue: current, ...(theme.isAndroid ? ANDROID_SLIDE : IOS_SLIDE), useNativeDriver: false })
    animation.start()
    return () => animation.stop()
  }, [current, positionProp, ownPosition, theme.reducedMotion, theme.isAndroid])
  // An overscroll past the first or the last page stands on it, so its mark keeps the whole pill
  const position = (driven ? (positionProp as Animated.Value) : ownPosition).interpolate({
    inputRange: [0, Math.max(1, count - 1)],
    outputRange: [0, Math.max(0, count - 1)],
    extrapolate: "clamp",
  })
  const go = (index: number, scrubbing = false) => {
    const next = clampIndex(index, count)
    if (next === current) return
    scrubbed.current = scrubbing
    if (valueProp === undefined) setOwn(next)
    onChange?.(next, { scrubbing })
  }
  const android = theme.isAndroid
  const small = size === "sm"
  const vertical = direction === "vertical"
  const dot = small ? (android ? 4 : 5) : android ? ANDROID_DOT : theme.length("--page-control-dot-size", 8)
  const gap = small ? 4 : android ? ANDROID_GAP : theme.length("--page-control-gap", 8)
  const padding = small ? 6 : theme.length("--page-control-padding-inline", 12)
  const pitch = dot + gap
  // Android draws every page's dot at full size; the iOS kit shrinks the ends from seven pages
  const sizes = android ? Array.from({ length: Math.max(0, count) }, (): PageControlDotSize => "full") : pageControlDots(count, clampIndex(typeof positionProp === "number" ? Math.round(positionProp) : near, count))
  // The small and smaller ends keep their share of a full dot (6 and 4 of 8 on iOS)
  const dotSize = (kind: PageControlDotSize) =>
    kind === "full"
      ? dot
      : android
        ? Math.max(2, dot - (kind === "small" ? 1 : 2))
        : (dot / 8) * (kind === "small" ? theme.length("--page-control-dot-size-small", 6) : theme.length("--page-control-dot-size-smaller", 4))
  const pill = indicator === "pill"
  // A pill: the current page two and a half dots long (14 at `sm`), along the direction
  const pillLength = small ? 14 : dot * 2.5
  const dotWidth = (kind: PageControlDotSize, index: number) => (pill && index === current ? pillLength : dotSize(kind))
  // The center of the current dot, for a tap on either side of it
  let x = padding
  let currentCenter = padding
  sizes.forEach((kind, index) => {
    if (kind === "hidden") return
    if (index === current) currentCenter = x + dotWidth(kind, index) / 2
    x += dotWidth(kind, index) + gap
  })
  const onColor = tone === "onColor"
  const on = onColor ? "#FFFFFF" : android ? theme.material.primary : theme.color("--page-control-dot-color-current", theme.colors.text)
  // Android's page dots: #BBBBBB, #555555 in a dark theme
  const off = onColor ? "rgba(255, 255, 255, 0.4)" : android ? (theme.scheme === "dark" ? "#555555" : "#BBBBBB") : theme.color("--page-control-dot-color", theme.colors.labelTertiary)
  // Android's current dot is drawn over the gray ones (it stretches between pages) unless the pages' scroll drives the
  // dots, when their color crosses over as on iOS; a pill is a dot of its own
  const worm = android && !pill && positionProp == null
  // Android draws no capsule, not even for `prominent`
  const capsuleHeight = small ? 16 : theme.length("--page-control-height", 24)
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
            const ahead = !vertical && isRTL(event.currentTarget) ? -1 : 1
            const to: Record<string, number> = { ArrowRight: current + ahead, ArrowDown: current + 1, ArrowLeft: current - ahead, ArrowUp: current - 1, Home: 0, End: count - 1 }
            if (!(event.key in to)) return
            event.preventDefault()
            go(to[event.key])
          },
        }
      : {}
  const onMove = (event: GestureResponderEvent) => {
    if (!press || background === "minimal") return
    const dx = ((vertical ? event.nativeEvent.locationY : event.nativeEvent.locationX) - press.startX) * (press.rtl ? -1 : 1)
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
      onResponderGrant={(event) =>
        setPress({ startX: vertical ? event.nativeEvent.locationY : event.nativeEvent.locationX, startIndex: current, scrubbing: false, rtl: !vertical && isRTL(event.currentTarget) })
      }
      onResponderMove={onMove}
      onResponderRelease={(event) => {
        // A tap on the leading side of the current dot goes back, on the trailing side forward; the dots are laid
        // from the capsule's start, its right edge in a right-to-left row
        const x = vertical ? event.nativeEvent.locationY : event.nativeEvent.locationX
        const fromStart = press?.rtl ? capsule.x + capsule.width - x : x - capsule.x
        if (press && !press.scrubbing) go(current + (fromStart < currentCenter ? -1 : 1))
        setPress(null)
      }}
      onResponderTerminate={() => setPress(null)}
      testID={testID}
      // The target (44pt, 48dp on Android) reaches past the 24pt capsule without taking room, as the web's control
      // lays out at the capsule's height,
      style={[
        styles.target,
        // and is never shorter than that along the dots either (two small dots), the capsule centred in it
        vertical
          ? { minWidth: target, minHeight: target, justifyContent: "center", marginHorizontal: -(target - capsuleHeight) / 2 }
          : { minHeight: target, minWidth: target, justifyContent: "center", marginVertical: -(target - capsuleHeight) / 2 },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        onLayout={(event) => {
          const { x: left, y: top, width, height } = event.nativeEvent.layout
          setCapsule(vertical ? { x: top, width: height } : { x: left, width })
        }}
        style={[
          styles.capsule,
          vertical
            ? { flexDirection: "column", width: capsuleHeight, paddingVertical: padding, gap, borderRadius: capsuleHeight / 2 }
            : { height: capsuleHeight, paddingHorizontal: padding, gap, borderRadius: capsuleHeight / 2 },
          showBackground ? { backgroundColor: onColor ? "rgba(255, 255, 255, 0.2)" : theme.color("--page-control-background") } : null,
        ]}
      >
        {sizes.map((size, index) => {
          if (size === "hidden") return null
          const across = dotSize(size)
          if (worm) return <View key={index} style={{ width: vertical ? across : dotWidth(size, index), height: vertical ? dotWidth(size, index) : across, borderRadius: dot / 2, backgroundColor: off }} />
          // How much of the current page this mark is: 1 on its page, 0 a page away, a line between
          const weight = position.interpolate(pageControlWeight(index))
          const along = pill ? weight.interpolate({ inputRange: [0, 1], outputRange: [across, pillLength] }) : across
          return (
            <Animated.View
              key={index}
              testID={testID ? `${testID}-mark-${index}` : undefined}
              style={{ width: vertical ? across : along, height: vertical ? along : across, borderRadius: dot / 2, backgroundColor: off }}
            >
              <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: dot / 2, backgroundColor: on, opacity: weight }]} />
            </Animated.View>
          )
        })}
        {worm ? <AndroidCurrent start={currentCenter - dot / 2} color={on} reduced={theme.reducedMotion} dot={dot} vertical={vertical} /> : null}
      </View>
    </View>
  )
}

/**
 * The interpolation of a mark's share of the current page from the pages' position: 1 on its own page, 0 from a page
 * away, a line between. Two neighbours share one page between them, so a pill's length moves from one to the other and
 * the row keeps its length.
 */
export const pageControlWeight = (index: number) => ({ inputRange: [index - 1, index, index + 1], outputRange: [0, 1, 0], extrapolate: "clamp" as const })

/** A new `value` with no `position`: iOS's default UIView curve, Material's standard easing and its medium duration. */
const IOS_SLIDE = { duration: 250, easing: curves.easeInOut }
const ANDROID_SLIDE = { duration: 300, easing: Easing.bezier(0.2, 0, 0, 1) }

/** Android's page dots: 5dp, 11dp from one to the next. */
const ANDROID_DOT = 5
const ANDROID_GAP = 6
/**
 * A page change the pager settles on its own (a tap, a change from code): one page in 200ms, on an ease-out quint
 * standing in for the pager's 1 + (t − 1)⁵.
 */
const WORM_SETTLE = { duration: 200, easing: curves.easeOutQuint }

/**
 * The current page's dot on Android, over the gray ones: it stretches to the next page and then lets go of the last
 * one. On a change the far edge is on the new page at once and the near edge follows it through the settle, as when
 * the pages' scroll draws the dot.
 */
function AndroidCurrent({ start, color, reduced, dot, vertical }: { start: number; color: string; reduced: boolean; dot: number; vertical: boolean }) {
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
    head.setValue(start)
    const animation = Animated.timing(tail, { toValue: start, ...WORM_SETTLE, useNativeDriver: false })
    animation.start()
    return () => animation.stop()
  }, [start, reduced, head, tail])
  // |head - tail| through a clamped interpolation (Animated has no abs), so the dot spans both edges either way;
  // `start` keeps it on the dots' side in a right-to-left row
  const span = Animated.subtract(head, tail).interpolate({ inputRange: [-1000, 0, 1000], outputRange: [1000, 0, 1000] })
  const left = Animated.multiply(Animated.subtract(Animated.add(head, tail), span), 0.5)
  const length = Animated.add(span, dot)
  return (
    <Animated.View
      style={
        vertical
          ? { position: "absolute", left: "50%", marginLeft: -dot / 2, top: left, width: dot, borderRadius: dot / 2, backgroundColor: color, height: length }
          : { position: "absolute", top: "50%", marginTop: -dot / 2, start: left, height: dot, borderRadius: dot / 2, backgroundColor: color, width: length }
      }
    />
  )
}

const styles = StyleSheet.create({
  target: { alignSelf: "center", alignItems: "center", justifyContent: "center" },
  capsule: { flexDirection: "row", alignItems: "center" },
})
