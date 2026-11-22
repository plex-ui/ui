import { useState } from "react"
import { Platform, StyleSheet, View, type AccessibilityActionEvent, type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native"
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
   * (and no scrubbing), as UIPageControl's `backgroundStyle`. @default "automatic"
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

type Press = { startX: number; startIndex: number; scrubbing: boolean }

/**
 * A row of dots, one for each page, the current one solid: UIPageControl of iOS 26 (`--page-control-*`: 8pt dots 8
 * apart, the current in the label color and the rest in the tertiary label, a 24pt capsule of `--alpha-08` behind
 * them while pressed, a 44pt target). A tap on either side of the current dot shows the previous or next page, a
 * drag scrubs page by page. Material has no page indicator of its own; Android draws the same dots in its colors.
 * For a screen reader it is adjustable: swipe up or down for the next or previous page.
 */
export function PageControl({ count, value: valueProp, defaultValue = 0, onChange, background = "automatic", valueText = defaultValueText, "aria-label": ariaLabel = "Pages", testID, style }: PageControlProps) {
  const theme = useTheme()
  const [own, setOwn] = useState(defaultValue)
  const current = clampIndex(valueProp ?? own, count)
  const [press, setPress] = useState<Press | null>(null)
  // Where the dots start inside the target, which can be wider than them
  const [capsuleX, setCapsuleX] = useState(0)
  const go = (index: number, scrubbing = false) => {
    const next = clampIndex(index, count)
    if (next === current) return
    if (valueProp === undefined) setOwn(next)
    onChange?.(next, { scrubbing })
  }
  const dot = theme.length("--page-control-dot-size", 8)
  const gap = theme.length("--page-control-gap", 8)
  const padding = theme.length("--page-control-padding-inline", 12)
  const pitch = dot + gap
  const sizes = pageControlDots(count, current)
  const dotSize = (size: PageControlDotSize) => (size === "full" ? dot : size === "small" ? theme.length("--page-control-dot-size-small", 6) : theme.length("--page-control-dot-size-smaller", 4))
  // The center of the current dot, for a tap on either side of it
  let x = padding
  let currentCenter = padding
  sizes.forEach((size, index) => {
    if (size === "hidden") return
    if (index === current) currentCenter = x + dotSize(size) / 2
    x += dotSize(size) + gap
  })
  const android = theme.isAndroid
  const on = android ? theme.material.onSurface : theme.color("--page-control-dot-color-current", theme.colors.text)
  const off = android ? theme.material.outlineVariant : theme.color("--page-control-dot-color", theme.colors.labelTertiary)
  const showBackground = background === "prominent" || (background === "automatic" && press != null)
  const text = valueText(current, count)
  const keys =
    Platform.OS === "web"
      ? {
          tabIndex: 0 as const,
          onKeyDown: (raw: unknown) => {
            const event = raw as { key: string; preventDefault: () => void }
            const to: Record<string, number> = { ArrowRight: current + 1, ArrowDown: current + 1, ArrowLeft: current - 1, ArrowUp: current - 1, Home: 0, End: count - 1 }
            if (!(event.key in to)) return
            event.preventDefault()
            go(to[event.key])
          },
        }
      : {}
  const onMove = (event: GestureResponderEvent) => {
    if (!press || background === "minimal") return
    const dx = event.nativeEvent.locationX - press.startX
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
      onResponderGrant={(event) => setPress({ startX: event.nativeEvent.locationX, startIndex: current, scrubbing: false })}
      onResponderMove={onMove}
      onResponderRelease={(event) => {
        // A tap on the leading side of the current dot goes back, on the trailing side forward
        if (press && !press.scrubbing) go(current + (event.nativeEvent.locationX - capsuleX < currentCenter ? -1 : 1))
        setPress(null)
      }}
      onResponderTerminate={() => setPress(null)}
      testID={testID}
      style={[styles.target, { minHeight: theme.length("--page-control-target-size", 44) }, style]}
    >
      <View
        pointerEvents="none"
        onLayout={(event) => setCapsuleX(event.nativeEvent.layout.x)}
        style={[
          styles.capsule,
          { height: theme.length("--page-control-height", 24), paddingHorizontal: padding, gap, borderRadius: theme.length("--page-control-height", 24) / 2 },
          showBackground ? { backgroundColor: theme.color("--page-control-background") } : null,
        ]}
      >
        {sizes.map((size, index) =>
          size === "hidden" ? null : (
            <View key={index} style={{ width: dotSize(size), height: dotSize(size), borderRadius: dot / 2, backgroundColor: index === current ? on : off }} />
          ),
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  target: { alignSelf: "center", alignItems: "center", justifyContent: "center" },
  capsule: { flexDirection: "row", alignItems: "center" },
})
