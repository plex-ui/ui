import { isValidElement, useId, useLayoutEffect, useMemo, useState, type ReactNode } from "react"
import { Animated, Easing, PanResponder, Platform, ScrollView, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type StyleProp, type ViewStyle } from "react-native"
import { Pressable } from "../../internal/Pressable"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { childrenOfType, flattenChildren } from "../../internal/children"
import { useKeyboardHeight } from "../../internal/keyboard"
import { iosDim, Overlay, ANDROID_DIM } from "../../internal/Overlay"
import { withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import { BarItemContext, type BarItemStyle } from "../Button/Button"
import { NavigationButton } from "../NavigationButton/NavigationButton"
import { Text } from "../Text/Text"

export type BottomSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** A title over the content, centered on iOS. */
  title?: ReactNode
  children?: ReactNode
  /** A tap on the dim, a drag down, Close, Android's back and Escape close it. @default true */
  dismissible?: boolean
  /** Accessible name when there is no title. */
  "aria-label"?: string
  testID?: string
  /** The sheet's content area. */
  contentStyle?: StyleProp<ViewStyle>
  /**
   * The accessible name of what closes the sheet: on iOS the Close button at the leading edge of its bar, on Android
   * the dim above the sheet, which TalkBack reads as a button.
   * @default "Close"
   */
  closeLabel?: string
  /**
   * The sheet's height, as an iOS sheet's detent: `content`, as tall as its content; `medium`, half the screen;
   * `large`, as tall as a sheet goes; or a height in points. A sheet of a fixed height keeps it while its content
   * changes (pages that open inside it), its content scrolling within. @default "content"
   */
  detent?: "content" | "medium" | "large" | number
}

export type BottomSheetFooterProps = {
  /** The actions, top to bottom: on iOS the main one first, as a setup sheet sets them. */
  children?: ReactNode
  style?: StyleProp<ViewStyle>
}

/**
 * The actions of a sheet, pinned under its content, which scrolls above them: the web's `Dialog.Footer` (12 above,
 * 16 at the sides and above the home indicator, 10 between actions, the content fading out 15 above it). A child
 * of `BottomSheet`, which lays it out.
 */
function BottomSheetFooter(_: BottomSheetFooterProps) {
  return null
}

/**
 * When a drag closes the sheet. Android's sheet: past 0.8cm (about 50dp), or on a flick down of 3500 px/s
 * (about 1.33dp per ms, the unit of PanResponder's velocity); a flick up as fast keeps it. An iOS sheet closes past
 * about a third of its height, or on a firm flick.
 */
const RELEASE = {
  android: { distance: () => 50, velocity: 1.33 },
  ios: { distance: (height: number) => (height || 1) * 0.3, velocity: 1 },
}

/** Android's sheet goes back to its place over 250ms for each 0.8cm of the drag, on the default ease curve. */
const ANDROID_SETTLE = { duration: 250, distance: 50, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }

/** Android's sheet opens from, and leaves for, 10dp under the screen's edge. */
const ANDROID_OFFSCREEN = 10
/** Android's touch slop: a drag down this far takes the sheet. */
const ANDROID_SLOP = 8

type GestureState = { dismissible: boolean; height: number; onOpenChange: (open: boolean) => void; android: boolean; reduced: boolean }

/**
 * The drag of a sheet: down only, closing it past the platform's distance or on a flick; back to its place otherwise.
 * On iOS its bar takes the drag. On Android the whole sheet does: a drag that starts on the content takes the sheet
 * only while the content is scrolled to its top, and only down, mostly (three times as far as sideways); else the
 * content scrolls.
 *
 * On a phone the sheet stands in a React Native `Modal`, which takes every touch that nothing in it takes, and a touch
 * the Modal holds is never offered to the views in it as it moves. So there the sheet takes a touch as it starts (on
 * iOS its bar; on Android its title and footer, and its content while that cannot scroll, since a sheet that holds a
 * touch keeps its content from scrolling) and follows it once it has moved past the slop. A touch that a row or a
 * field takes as it starts is taken from it as it moves, as on the web.
 */
function sheetGesture(drag: Animated.Value) {
  let state: GestureState = { dismissible: false, height: 0, onOpenChange: () => {}, android: false, reduced: false }
  // Where the content stands scrolled, and whether the touch started on it (Android)
  let scrollY = 0
  let onContent = false
  // Whether the touch started on the title or the footer, and how tall the content and its view are (Android)
  let onChrome = false
  let viewport = 0
  let contentHeight = 0
  // Whether the sheet took the touch as it started, whether it follows the finger, and from which point of the drag
  let tookStart = false
  let tracking = false
  let from = 0
  const settle = () => {
    if (state.reduced) drag.setValue(0)
    else if (state.android) {
      drag.stopAnimation((value) => {
        const duration = (ANDROID_SETTLE.duration * Math.max(0, value)) / ANDROID_SETTLE.distance
        Animated.timing(drag, { toValue: 0, duration: Math.max(1, duration), easing: ANDROID_SETTLE.easing, useNativeDriver: false }).start()
      })
    } else Animated.spring(drag, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start()
  }
  const vertical = (dx: number, dy: number) => Math.abs(dy) > 4 && Math.abs(dy) > Math.abs(dx)
  // Android's sheet starts tracking a drag down past its slop, three times as far as sideways
  const androidDown = (dx: number, dy: number) => dy >= ANDROID_SLOP && dy / 3 > Math.abs(dx) && (!onContent || scrollY <= 0)
  const native = Platform.OS !== "web"
  const responder = PanResponder.create({
    // Each touch starts off the title and the footer until they say otherwise (they hear it after the sheet)
    onStartShouldSetPanResponderCapture: () => {
      onChrome = false
      return false
    },
    // On a phone the sheet takes a touch that nothing in it took, before the Modal does
    onStartShouldSetPanResponder: () => {
      tookStart = native && state.dismissible && (!state.android || onChrome || contentHeight <= viewport + 1)
      return tookStart
    },
    // A sheet that cannot be dismissed does not follow the finger
    onMoveShouldSetPanResponder: (_, gesture) => state.dismissible && !state.android && vertical(gesture.dx, gesture.dy),
    // Android takes the drag from the content (its rows and its scroll) as it starts down at the content's top
    onMoveShouldSetPanResponderCapture: (_, gesture) => state.dismissible && state.android && androidDown(gesture.dx, gesture.dy),
    // A sheet that takes the touch as it moves follows it from there (PanResponder counts the drag from that point), so
    // it does not jump by the slop; one that took it as it started waits for the slop
    onPanResponderGrant: () => {
      tracking = !tookStart
      tookStart = false
      from = 0
    },
    onPanResponderMove: (_, gesture) => {
      if (!tracking) {
        if (!(state.android ? androidDown(gesture.dx, gesture.dy) : vertical(gesture.dx, gesture.dy))) return
        tracking = true
        from = gesture.dy
      }
      drag.setValue(Math.max(0, gesture.dy - from))
    },
    onPanResponderRelease: (_, gesture) => {
      onContent = false
      const followed = tracking
      tracking = false
      // A tap, or a touch that never moved past the slop, leaves the sheet in its place
      if (!followed) return
      const dy = gesture.dy - from
      const release = state.android ? RELEASE.android : RELEASE.ios
      const distance = release.distance(state.height)
      // Android's sheet closes past the distance or on a flick down (more down than sideways), never on a flick up
      const closes = state.android
        ? !(gesture.vy < 0 && -gesture.vy >= release.velocity) && (dy >= distance || (gesture.vy >= release.velocity && Math.abs(gesture.vy) >= Math.abs(gesture.vx)))
        : gesture.vy > release.velocity || (dy > distance && gesture.vy > -release.velocity)
      // The sheet leaves from where the finger let it go; the drag resets when it opens again
      if (state.dismissible && closes) state.onOpenChange(false)
      else settle()
    },
    onPanResponderTerminate: () => {
      onContent = false
      tracking = false
      settle()
    },
  })
  return {
    responder,
    update: (next: GestureState) => {
      state = next
    },
    /** The content's scroll and size (Android). */
    content: {
      onTouchStart: () => {
        onContent = true
      },
      onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollY = event.nativeEvent.contentOffset.y
      },
      onLayout: (event: LayoutChangeEvent) => {
        viewport = event.nativeEvent.layout.height
      },
      onContentSizeChange: (_: number, height: number) => {
        contentHeight = height
      },
    },
    /** A touch starts on the title or the footer (Android): the sheet takes it even over content that scrolls. */
    chrome: () => {
      onChrome = true
      return false
    },
    /** A touch on the sheet ends. */
    end: () => {
      onContent = false
    },
  }
}

/** What ActionSheet asks of its sheet: an exit of its own time, and word once the sheet has gone. */
type SheetExit = {
  /** The time of the exit in ms, in place of the platform's. */
  exit?: number
  /** Called once the sheet has left. */
  onExited?: () => void
}

function BottomSheetRoot(props: BottomSheetProps) {
  return <BottomSheetBase {...props} />
}

/** The sheet with an exit of its own (ActionSheet's item tap); not part of the public API. */
export function BottomSheetBase({
  open,
  onOpenChange,
  title,
  children,
  dismissible = true,
  "aria-label": ariaLabel,
  testID,
  contentStyle,
  closeLabel = "Close",
  detent = "content",
  exit,
  onExited,
}: BottomSheetProps & SheetExit) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { width, height: screen } = useWindowDimensions()
  const [height, setHeight] = useState(0)
  const [drag] = useState(() => new Animated.Value(0))
  const close = () => onOpenChange(false)
  const android = theme.isAndroid
  // Android's content and actions 12 from the sheet's sides, as a page's groups; a token for a screen at another gutter
  const androidInline = theme.length("--bottom-sheet-android-padding-inline", 12)
  const reduced = theme.reducedMotion
  // One responder for the sheet's life, told the latest props after each render: a responder made again mid-drag
  // would lose the drag
  const [gesture] = useState(() => sheetGesture(drag))
  useLayoutEffect(() => {
    gesture.update({ dismissible, height, onOpenChange, android, reduced })
  })
  const responder = gesture.responder
  // A sheet that opens again starts from its place, not from where a drag closed it
  useLayoutEffect(() => {
    if (open) drag.setValue(0)
  }, [open, drag])
  const keyboard = useKeyboardHeight(open)
  const m = theme.material
  // Android's sheet: 35dp top corners, concentric with its bar's 46dp circles 12 in from its top and sides (23 + 12),
  // the dialog's background (white, near-black in dark mode)
  const radius = android ? 35 : theme.length("--dialog-sheet-radius", 38)
  // iOS: the panel of the phone layer, --mobile-surface-elevated-plain-primary (Dialog.module.css), white in light and
  // the elevated near-black in dark
  const background = android
    ? theme.scheme === "dark"
      ? m.surfaceContainer
      : m.surfaceContainerLowest
    : theme.color("--mobile-surface-elevated-plain-primary", theme.color("--color-surface-elevated", theme.colors.background))
  // Android's sheet title: 17/22 Medium, centered in its bar, as iOS's
  const titleType = android ? { fontSize: 17, lineHeight: 22 } : { fontSize: theme.length("--toolbar-title-font-size", 17), lineHeight: theme.length("--toolbar-title-line-height", 22) }
  const titleId = useId()
  const web = Platform.OS === "web"
  // The web names the dialog by its title; a phone keeps the modal view
  const a11y = web
    ? { role: "dialog" as const, "aria-modal": true, "aria-labelledby": title != null ? titleId : undefined, "aria-label": title != null ? undefined : ariaLabel }
    : { accessibilityViewIsModal: true, "aria-label": ariaLabel }
  // Android's sheet stands under the status bar at most; the phone layer's 16 under the top inset
  const maxHeight = screen - insets.top - (android ? 0 : 16)
  // A detent holds the sheet's height whatever its content: half the screen, the most it takes, or a height
  const fixedHeight =
    detent === "large" ? maxHeight : detent === "medium" ? Math.min(Math.round(screen / 2), maxHeight) : typeof detent === "number" ? Math.min(detent, maxHeight) : undefined
  // Android's sheet is as wide as the screen in portrait; in landscape 80% of it and 480dp at least
  const maxWidth = android && width > screen ? Math.max(width * 0.8, Math.min(480, width)) : undefined
  const closeSize = theme.length("--dialog-sheet-close-size", 44)
  const margin = theme.length("--mobile-layout-margin", 16)
  // Android: content scrolled under the bar fades out under it; the footer's height sets the room under the content
  const [scrolled, setScrolled] = useState(false)
  const [footerHeight, setFooterHeight] = useState(0)
  // Android's sheet has no handle: the whole sheet takes the drag. With a title its bar is the reference's sheet bar,
  // over the content: Close in a 46dp glass circle 12 under the top edge and 12 from the side (in line with the
  // content's cards), concentric with the sheet's corner, the title 17/22 Medium centered between the circles' places
  // (69 in all). Content scrolled under it shows through the sheet's color at
  // 63% over a light blur, let go over its last 32dp (12 past the bar), with no line
  const barItem = useMemoBarItem(background)
  const header = android ? (
    title != null ? (
      <View onStartShouldSetResponderCapture={gesture.chrome} style={styles.androidBar}>
        <SheetBarFade fill={background} shown={scrolled} />
        <View style={styles.androidCircle}>
          {dismissible ? (
            <BarItemContext.Provider value={barItem}>
              <NavigationButton action="close" accessibilityLabel={closeLabel} onPress={close} />
            </BarItemContext.Provider>
          ) : null}
        </View>
        <View style={styles.androidHeading}>
          <Text nativeID={titleId} accessibilityRole="header" weight="medium" align="center" numberOfLines={1} color={m.onSurface} style={{ fontSize: titleType.fontSize, lineHeight: titleType.lineHeight }}>
            {title}
          </Text>
        </View>
        <View style={styles.androidCircle} />
      </View>
    ) : (
      <View onStartShouldSetResponderCapture={gesture.chrome} style={styles.androidGrip} />
    )
  ) : dismissible || title != null ? (
    // The web's phone Sheet bar: one 44 row 16 under the top edge, Close at the leading edge and the title alone centered
    // The bar is the web's Toolbar: 16 above the row and --toolbar-padding-bottom under it
    <View
      {...responder.panHandlers}
      style={[styles.iosBar, { paddingTop: theme.length("--dialog-sheet-action-inset-block", 16), paddingBottom: theme.length("--toolbar-padding-bottom", 10), paddingHorizontal: margin }]}
    >
      <View style={{ width: closeSize, height: closeSize }}>
        {dismissible ? <NavigationButton action="close" accessibilityLabel={closeLabel} onPress={close} /> : null}
      </View>
      <View style={[styles.iosHeading, { minHeight: closeSize }]}>
        {title != null ? (
          <Text nativeID={titleId} accessibilityRole="header" weight="semibold" align="center" style={{ fontSize: titleType.fontSize, lineHeight: titleType.lineHeight }}>
            {title}
          </Text>
        ) : null}
      </View>
      <View style={{ width: closeSize }} />
    </View>
  ) : null
  const footer = childrenOfType<BottomSheetFooterProps>(children, BottomSheetFooter)[0]
  const content = footer ? flattenChildren(children).filter((child) => !isFooter(child)) : children
  // The content starts where the bar's soft edge ends (--page-bar-soft-tail under the bar, Dialog.module.css), and
  // ends 16 over a footer, or over the home indicator
  const bottom = keyboard || footer ? 16 : Math.max(16, insets.bottom)
  const iosContent = { paddingTop: theme.length("--page-bar-soft-tail", 32), paddingHorizontal: margin, paddingBottom: bottom }
  // The sheet's way in and out, under the drag. Android's starts and ends 10 under the screen's edge, and leaves from
  // where a drag let it go: the drag shrinks with the progress, so the sheet goes from there to its place under the edge
  const slide = (progress: Animated.Value) =>
    android
      ? Animated.add(progress.interpolate({ inputRange: [0, 1], outputRange: [(height || screen) + ANDROID_OFFSCREEN, 0] }), Animated.multiply(drag, progress))
      : Animated.add(progress.interpolate({ inputRange: [0, 1], outputRange: [height || screen, 0] }), drag)
  return (
    <Overlay
      open={open}
      onDismiss={close}
      scrim={android ? ANDROID_DIM.sheet : iosDim(theme)}
      dismissible={dismissible}
      motion="sheet"
      exit={exit}
      onExited={onExited}
      testID={testID}
    >
      {(progress, _opening, focus) => (
        <View pointerEvents="box-none" style={styles.bottom}>
          <Animated.View
            {...a11y}
            {...(android ? responder.panHandlers : null)}
            onTouchEnd={android ? gesture.end : undefined}
            onTouchCancel={android ? gesture.end : undefined}
            // On the web the sheet itself takes the first focus, not its Close or a field
            tabIndex={focus.tabIndex}
            onBlur={focus.onBlur}
            onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
            style={[
              focus.style,
              styles.sheet,
              {
                maxHeight,
                // A fixed sheet grows by the keyboard it stands over, within the screen, so its content keeps its room
                height: fixedHeight == null ? undefined : Math.min(fixedHeight + keyboard, maxHeight),
                maxWidth,
                borderTopLeftRadius: radius,
                borderTopRightRadius: radius,
                backgroundColor: background,
                // Over the keyboard: Android's height is over its navigation bar, iOS's from the screen's edge
                paddingBottom: android ? insets.bottom + keyboard : keyboard,
                // With reduced motion it fades in place, and follows only the finger
                opacity: reduced ? progress : undefined,
                transform: [{ translateY: reduced ? drag : slide(progress) }],
              },
            ]}
          >
            {android && title != null ? null : header}
            {/* Content taller than the screen scrolls; on iOS the drag stays on the bar, on Android it starts at the
                content's top */}
            <ScrollView
              // A sheet of a fixed height gives its content the room left, so a footer stays at its bottom
              style={[styles.scroll, fixedHeight != null ? styles.grow : null]}
              {...(android
                ? {
                    ...gesture.content,
                    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
                      gesture.content.onScroll(event)
                      const under = event.nativeEvent.contentOffset.y > 0
                      if (under !== scrolled) setScrolled(under)
                    },
                    scrollEventThrottle: 16,
                  }
                : null)}
              contentContainerStyle={[
                android
                  ? [
                      styles.androidContent,
                      // A screen whose gutter is Material's compact 16 sets it with --bottom-sheet-android-padding-inline
                      { paddingHorizontal: androidInline },
                      title != null ? styles.androidContentUnderBar : null,
                      // Over a footer: 8 above its height, which reaches over the sheet's bottom padding
                      footer ? { paddingBottom: 8 + Math.max(0, footerHeight - insets.bottom - keyboard) } : null,
                    ]
                  : iosContent,
                contentStyle,
              ]}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {content}
            </ScrollView>
            {/* Android's bar stands over the content, which scrolls under it */}
            {android && title != null ? header : null}
            {footer ? (
              <View
                onStartShouldSetResponderCapture={android ? gesture.chrome : undefined}
                onLayout={android ? (event) => setFooterHeight(event.nativeEvent.layout.height) : undefined}
                style={[
                  android
                    ? [
                        styles.androidFooter,
                        { paddingHorizontal: androidInline },
                        // Over the sheet's color at 80%, faded in over its top 24dp, down over the gesture bar
                        { paddingBottom: 12 + insets.bottom + keyboard, backgroundImage: `linear-gradient(to bottom, ${withAlpha(background, 0)}, ${withAlpha(background, 0.8)} 24px)` } as ViewStyle,
                      ]
                    : [styles.iosFooter, { paddingHorizontal: margin, paddingBottom: keyboard ? 16 : Math.max(16, insets.bottom) }],
                  footer.props.style,
                ]}
              >
                {/* The content fades out under the footer: the panel color from 15 above it to its actions (the
                    soft footer of Dialog.module.css) */}
                {android ? null : (
                  <View pointerEvents="none" style={[styles.iosFooterEdge, { backgroundImage: `linear-gradient(${withAlpha(background, 0)}, ${background} 27px)` }]} />
                )}
                {footer.props.children}
              </View>
            ) : null}
          </Animated.View>
          {/* The dim above the sheet is a "Close sheet" button for TalkBack, after the sheet */}
          {android && Platform.OS === "android" && dismissible ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={closeLabel}
              onPress={close}
              style={[styles.scrimTarget, { bottom: height }]}
            />
          ) : null}
        </View>
      )}
    </Overlay>
  )
}

const isFooter = (child: ReactNode) => isValidElement(child) && child.type === BottomSheetFooter

/** The item of an Android sheet's bar: a 46dp glass circle solved against the sheet's color. */
function useMemoBarItem(canvas: string): BarItemStyle {
  return useMemo(() => ({ height: 46, fontSize: 15, lineHeight: 20, weight: "medium", prominentWeight: "medium", iconSize: 24, gutter: 16, canvas }), [canvas])
}

/**
 * The fade under an Android sheet's bar once content is under it: the sheet's color at 63% over a light blur (8),
 * reaching 12 past the bar and let go over its last 32 (a mask on the web; a gradient of the color where there is no
 * mask or blur).
 */
function SheetBarFade({ fill, shown }: { fill: string; shown: boolean }) {
  const veil = withAlpha(fill, 0.63)
  const style: ViewStyle =
    Platform.OS === "web"
      ? ({
          backgroundColor: veil,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          maskImage: "linear-gradient(to bottom, #000 calc(100% - 32px), transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, #000 calc(100% - 32px), transparent)",
        } as ViewStyle)
      : ({ backgroundImage: `linear-gradient(to bottom, ${veil} calc(100% - 32px), ${withAlpha(fill, 0)})` } as ViewStyle)
  return <View pointerEvents="none" style={[styles.androidBarFade, style, { opacity: shown ? 1 : 0 }]} />
}

/**
 * A sheet from the bottom edge: on iOS 26 the sheet of the phone layer (`--dialog-sheet-radius` 38 on its top corners,
 * a bar 16 under its top edge with Close at the leading edge and the title centered, as the web's phone Sheet; no
 * grabber, since its height does not change), on Android the reference's sheet (35dp top corners, white, no handle,
 * a bar of 46dp glass circles 12 under the top edge and 12 from the sides, concentric with the corners, with the title
 * 17 Medium centered, the
 * content 12 from the sides, a 20% dim, the screen's width in portrait). Drag it down to close it: its bar on iOS, anywhere on
 * Android (from content that scrolls once it is at its top, and on a phone only from its rows and fields, since its
 * plain parts keep the drag for the scroll).
 * `BottomSheet.Footer` pins actions under the content.
 */
export const BottomSheet = Object.assign(BottomSheetRoot, { Footer: BottomSheetFooter })

const styles = StyleSheet.create({
  bottom: { flex: 1, justifyContent: "flex-end", alignItems: "center" },
  sheet: { alignSelf: "stretch", overflow: "hidden", borderCurve: "continuous", marginHorizontal: "auto", width: "100%" },
  scroll: { flexGrow: 0, flexShrink: 1 },
  grow: { flexGrow: 1 },
  iosBar: { flexDirection: "row", alignItems: "center", gap: 8 },
  iosHeading: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrimTarget: { position: "absolute", top: 0, left: 0, right: 0 },
  // The bar: 46dp circles 12 under the top edge and 12 from the sides, 11 under them; with no title the top 8 of the
  // sheet's padding
  androidBar: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 1, flexDirection: "row", alignItems: "center", paddingTop: 12, paddingBottom: 11, paddingHorizontal: 12, gap: 6 },
  androidBarFade: { position: "absolute", top: 0, left: 0, right: 0, bottom: -12 },
  androidCircle: { width: 46, height: 46 },
  androidHeading: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center" },
  androidGrip: { height: 8 },
  // The content 12 from the sides (as a page's groups), 16 over the navigation bar; under a bar 13 under its circles
  // (71 from the sheet's top, 2 under the bar)
  androidContent: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 16 },
  androidContentUnderBar: { paddingTop: 12 + 46 + 13 },
  iosFooter: { gap: 10, paddingTop: 12 },
  iosFooterEdge: { position: "absolute", top: -15, left: 0, right: 0, bottom: 0 },
  // Android's sheet actions: 48dp buttons 4 apart, 12 from the sides and above, 12 over the gesture bar, over the
  // content that scrolls under them
  androidFooter: { position: "absolute", left: 0, right: 0, bottom: 0, gap: 4, paddingHorizontal: 12, paddingTop: 12 },
})
