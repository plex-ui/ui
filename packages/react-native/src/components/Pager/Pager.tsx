import { Children, isValidElement, useCallback, useEffect, useRef, useState, type ComponentRef, type ReactNode } from "react"
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { useRTL } from "../../internal/direction"
import { useTheme } from "../../theme/ThemeProvider"

export type PagerProps = {
  /** The page shown, by its index in the children's order (controlled). */
  page: number
  /** Called with the page a swipe comes to rest on. */
  onPageChange?: (page: number) => void
  /**
   * Called on every frame of a swipe or a move with the position, a fractional index in the children's order (1.5
   * halfway from the second page to the third): pass it to SegmentedControl's `position` for its thumb to follow.
   */
  onPageScroll?: (position: number) => void
  /** Whether a swipe turns the pages; off, only `page` does. @default true */
  scrollEnabled?: boolean
  /** The pages, one child each, each as wide as the pager. */
  children: ReactNode
  testID?: string
  style?: StyleProp<ViewStyle>
}

/** How long the web waits after its last scroll event before it takes the swipe as at rest. */
const WEB_REST = 120

type Scroller = ComponentRef<typeof ScrollView>

/**
 * Pages side by side that a swipe turns, one at a time, as iOS's page view controller and Material's horizontal
 * pager: under a SegmentedControl (Material's tabs over a pager) each segment's page, the segment following the swipe
 * through `onPageScroll` and a segment pressed putting its page in place through `page`. A swipe comes to rest on the
 * nearest page: where a phone's browser stops it a few points off a page, the pager finishes the move. Right to left
 * the pages run from the right, the next one coming in from the left. Only the page shown is read by a screen reader
 * and reached by Tab on the web. With reduced motion a page set by `page` comes in at once.
 */
export function Pager({ page, onPageChange, onPageScroll, scrollEnabled = true, children, testID, style }: PagerProps) {
  const theme = useTheme()
  const pages = Children.toArray(children)
  const count = pages.length
  const [width, setWidth] = useState(0)
  // The pager's height too: the web wraps each page in a box of its own, so a page given only a width grows to its
  // content and a vertical scroll inside it never scrolls
  const [height, setHeight] = useState(0)
  // The direction of the pager's own place (a right-to-left part of a left-to-right page, too)
  const { ref: root, rtl } = useRTL<ComponentRef<typeof View>>()
  const scroller = useRef<Scroller>(null)
  // The scroll runs left to right in every layout; right to left the pages stand in reverse, so the first is at the
  // right end and the next comes in from the left. Each page keeps the layout's direction inside
  const physical = useCallback((index: number) => (rtl ? count - 1 - index : index), [rtl, count])
  const offset = useRef(0)
  const placed = useRef(false)
  const rest = useRef<ReturnType<typeof setTimeout> | null>(null)
  // The web: a finger on the pages, so a pause in the drag is not taken as the swipe at rest
  const touching = useRef(false)
  // Where a move the pager started itself is headed: an end of scrolling short of it (a move cut off by a newer
  // page) carries on there rather than being taken as a swipe
  const heading = useRef<number | null>(null)
  // Each swipe at rest, so a page the owner keeps (`page` unchanged after onPageChange) is put back
  const [rested, setRested] = useState(0)
  const [shown, setShown] = useState(page)
  // A page set from outside is shown at once, so its content is read and reachable while the move runs
  const [given, setGiven] = useState(page)
  if (given !== page) {
    setGiven(page)
    setShown(page)
  }
  const latest = useRef({ page, onPageChange, onPageScroll })
  useEffect(() => {
    latest.current = { page, onPageChange, onPageScroll }
  })

  const onLayout = (event: LayoutChangeEvent) => {
    const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout
    setWidth((old) => (old === nextWidth ? old : nextWidth))
    setHeight((old) => (old === nextHeight ? old : nextHeight))
  }

  const scrollTo = useCallback(
    (index: number, animated: boolean) => {
      if (!width) return
      heading.current = animated ? physical(index) : null
      scroller.current?.scrollTo({ x: physical(index) * width, y: 0, animated })
    },
    [width, physical],
  )

  // The page set from outside (a segment pressed), or the first layout: the pager moves to it
  useEffect(() => {
    if (!width) return
    const at = Math.round(offset.current / width)
    if (physical(page) === at && Math.abs(offset.current - at * width) < 0.5) {
      // A move toward another page started before any scroll (that page set and taken back at once) stops here
      if (heading.current != null && heading.current !== at) scrollTo(page, false)
      placed.current = true
      return
    }
    // The first place (the first layout, or right to left the first page at the right end) is taken at once
    scrollTo(page, placed.current && !theme.reducedMotion)
    placed.current = true
    // `offset` is read, not watched: only a new page or layout moves the pager
  }, [page, width, physical, scrollTo, theme.reducedMotion])

  /** The swipe at rest: on the nearest page, finishing a move a browser left off a page, and telling the page. */
  const settle = useCallback(() => {
    if (!width || !count) return
    const at = Math.max(0, Math.min(count - 1, Math.round(offset.current / width)))
    if (heading.current != null) {
      const target = heading.current
      if (Math.abs(offset.current - target * width) >= 0.5) {
        // A phone's end of scrolling short of it is the move a newer page cut off: the newer move runs on and ends
        // there itself. The web's rest is the scroll gone quiet, so a smooth scroll a browser stopped is carried on
        if (Platform.OS === "web") scroller.current?.scrollTo({ x: target * width, y: 0, animated: !theme.reducedMotion })
        return
      }
      heading.current = null
    }
    if (Math.abs(offset.current - at * width) >= 0.5) {
      scroller.current?.scrollTo({ x: at * width, y: 0, animated: !theme.reducedMotion })
      return
    }
    const index = rtl ? count - 1 - at : at
    setShown(index)
    latest.current.onPageScroll?.(index)
    if (index !== latest.current.page) {
      latest.current.onPageChange?.(index)
      setRested((n) => n + 1)
    }
  }, [width, count, rtl, theme.reducedMotion])

  // A swipe the owner did not take (no onPageChange, or `page` kept): the pager goes back to `page`, and rests there
  useEffect(() => {
    if (!rested || !width) return
    const at = Math.round(offset.current / width)
    if (physical(latest.current.page) !== at) {
      scrollTo(latest.current.page, !theme.reducedMotion)
      // The page kept is the one shown again at once: a move without animation tells no end of scrolling on Android
      setShown(latest.current.page)
    }
    // Only a rest asks: a new page or layout is the effect above
  }, [rested]) // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = event.nativeEvent.contentOffset.x
    if (width) {
      const at = offset.current / width
      latest.current.onPageScroll?.(Math.max(0, Math.min(count - 1, rtl ? count - 1 - at : at)))
    }
    // The web has no end of momentum: the swipe is at rest once the scroll events stop with no finger on the pages
    if (Platform.OS === "web") restLater()
  }

  const restLater = () => {
    if (rest.current) clearTimeout(rest.current)
    rest.current = touching.current ? null : setTimeout(settle, WEB_REST)
  }
  const web =
    Platform.OS === "web"
      ? {
          dir: "ltr",
          onTouchStart: () => {
            touching.current = true
            heading.current = null
            if (rest.current) clearTimeout(rest.current)
          },
          onTouchEnd: () => {
            touching.current = false
            restLater()
          },
          // A wheel or a trackpad takes over from a move the pager started, as a finger does
          onWheel: () => {
            heading.current = null
          },
          onTouchCancel: () => {
            touching.current = false
            restLater()
          },
        }
      : null

  useEffect(
    () => () => {
      if (rest.current) clearTimeout(rest.current)
    },
    [],
  )

  const ordered = rtl ? [...pages].reverse() : pages
  return (
    <View ref={root} testID={testID} style={[styles.root, style]}>
      <ScrollView
        ref={scroller}
        // The scroll's own box: a pager's padding or border leaves the pages less than its outer size
        onLayout={onLayout}
        horizontal
        pagingEnabled
        scrollEnabled={scrollEnabled && count > 1}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={Platform.OS === "web" ? undefined : settle}
        // A finger on the pages takes over from a move the pager started
        onScrollBeginDrag={() => {
          heading.current = null
        }}
        // A drag let go on a page with no momentum after it ends there
        onScrollEndDrag={Platform.OS === "web" ? undefined : (event) => event.nativeEvent.velocity?.x === 0 && settle()}
        {...web}
        style={[styles.scroller, Platform.OS === "web" ? null : styles.ltr]}
      >
        {ordered.map((child, place) => {
          const index = rtl ? count - 1 - place : place
          // The child's own key, so a page added or moved keeps its state
          const key = isValidElement(child) && child.key != null ? child.key : index
          return (
            <Page key={key} width={width} height={height} rtl={rtl} current={index === shown}>
              {child}
            </Page>
          )
        })}
      </ScrollView>
    </View>
  )
}

/** A page: the pager's width, the layout's direction inside, out of a screen reader's and the web's Tab reach unless shown. */
function Page({ width, height, rtl, current, children }: { width: number; height: number; rtl: boolean; current: boolean; children: ReactNode }) {
  const node = useRef<ComponentRef<typeof View>>(null)
  useEffect(() => {
    if (Platform.OS !== "web") return
    const element = node.current as unknown as HTMLElement | null
    if (element && "inert" in element) element.inert = !current
  }, [current])
  return (
    <View
      ref={node}
      accessibilityElementsHidden={!current}
      importantForAccessibility={current ? "auto" : "no-hide-descendants"}
      aria-hidden={current ? undefined : true}
      {...(Platform.OS === "web" ? { dir: rtl ? "rtl" : "ltr" } : null)}
      style={[{ width: width || "100%", height: height || "100%" }, Platform.OS === "web" ? null : { direction: rtl ? "rtl" : "ltr" }]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { overflow: "hidden" },
  scroller: { flexGrow: 1 },
  // The web takes dir="ltr" (react-native-web has no direction style, and checks every style it is given here)
  ltr: Platform.OS === "web" ? {} : { direction: "ltr" },
})
