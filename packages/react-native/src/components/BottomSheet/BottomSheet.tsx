import { isValidElement, useId, useLayoutEffect, useState, type ReactNode } from "react"
import { Animated, Easing, PanResponder, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent, type StyleProp, type ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { childrenOfType, flattenChildren } from "../../internal/children"
import { useKeyboardHeight } from "../../internal/keyboard"
import { iosDim, Overlay, ANDROID_DIM } from "../../internal/Overlay"
import { withAlpha } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
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

type GestureState = { dismissible: boolean; height: number; onOpenChange: (open: boolean) => void; android: boolean; reduced: boolean }

/**
 * The drag of a sheet: down only, closing it past the platform's distance or on a flick; back to its place otherwise.
 * On iOS its bar takes the drag. On Android the whole sheet does: a drag that starts on the content takes the sheet
 * only while the content is scrolled to its top, and only down, mostly (three times as far as sideways); else the
 * content scrolls.
 */
function sheetGesture(drag: Animated.Value) {
  let state: GestureState = { dismissible: false, height: 0, onOpenChange: () => {}, android: false, reduced: false }
  // Where the content stands scrolled, and whether the touch started on it (Android)
  let scrollY = 0
  let onContent = false
  const settle = () => {
    if (state.reduced) drag.setValue(0)
    else if (state.android) {
      drag.stopAnimation((from) => {
        const duration = (ANDROID_SETTLE.duration * Math.max(0, from)) / ANDROID_SETTLE.distance
        Animated.timing(drag, { toValue: 0, duration: Math.max(1, duration), easing: ANDROID_SETTLE.easing, useNativeDriver: false }).start()
      })
    } else Animated.spring(drag, { toValue: 0, useNativeDriver: false, bounciness: 0 }).start()
  }
  const vertical = (dx: number, dy: number) => Math.abs(dy) > 4 && Math.abs(dy) > Math.abs(dx)
  // Android's sheet starts tracking a drag down three times as far as sideways
  const androidDown = (dx: number, dy: number) => dy > 4 && dy / 3 > Math.abs(dx) && (!onContent || scrollY <= 0)
  const responder = PanResponder.create({
    // A sheet that cannot be dismissed does not follow the finger
    onMoveShouldSetPanResponder: (_, gesture) => state.dismissible && !state.android && vertical(gesture.dx, gesture.dy),
    // Android takes the drag from the content (its rows and its scroll) as it starts down at the content's top
    onMoveShouldSetPanResponderCapture: (_, gesture) => state.dismissible && state.android && androidDown(gesture.dx, gesture.dy),
    onPanResponderMove: (_, gesture) => drag.setValue(Math.max(0, gesture.dy)),
    onPanResponderRelease: (_, gesture) => {
      onContent = false
      const release = state.android ? RELEASE.android : RELEASE.ios
      const distance = release.distance(state.height)
      // Android's sheet closes past the distance or on a flick down (more down than sideways), never on a flick up
      const closes = state.android
        ? !(gesture.vy < 0 && -gesture.vy >= release.velocity) && (gesture.dy >= distance || (gesture.vy >= release.velocity && Math.abs(gesture.vy) >= Math.abs(gesture.vx)))
        : gesture.vy > release.velocity || (gesture.dy > distance && gesture.vy > -release.velocity)
      // The sheet leaves from where the finger let it go; the drag resets when it opens again
      if (state.dismissible && closes) state.onOpenChange(false)
      else settle()
    },
    onPanResponderTerminate: () => {
      onContent = false
      settle()
    },
  })
  return {
    responder,
    update: (next: GestureState) => {
      state = next
    },
    /** The content's scroll (Android). */
    content: {
      onTouchStart: () => {
        onContent = true
      },
      onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollY = event.nativeEvent.contentOffset.y
      },
    },
    /** A touch on the sheet ends. */
    end: () => {
      onContent = false
    },
  }
}

function BottomSheetRoot({ open, onOpenChange, title, children, dismissible = true, "aria-label": ariaLabel, testID, contentStyle, closeLabel = "Close" }: BottomSheetProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const { width, height: screen } = useWindowDimensions()
  const [height, setHeight] = useState(0)
  const [drag] = useState(() => new Animated.Value(0))
  const close = () => onOpenChange(false)
  const android = theme.isAndroid
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
  // Android's sheet: 24dp top corners (measured on a Pixel), the dialog's background (white, near-black in dark mode)
  const radius = android ? 24 : theme.length("--dialog-sheet-radius", 38)
  // iOS: the panel of the phone layer, --mobile-surface-elevated-plain-primary (Dialog.module.css), white in light and
  // the elevated near-black in dark
  const background = android
    ? theme.scheme === "dark"
      ? m.surfaceContainer
      : m.surfaceContainerLowest
    : theme.color("--mobile-surface-elevated-plain-primary", theme.color("--color-surface-elevated", theme.colors.background))
  const titleType = android ? { fontSize: 20, lineHeight: 24 } : { fontSize: theme.length("--toolbar-title-font-size", 17), lineHeight: theme.length("--toolbar-title-line-height", 22) }
  const titleId = useId()
  const web = Platform.OS === "web"
  // The web names the dialog by its title; a phone keeps the modal view
  const a11y = web
    ? { role: "dialog" as const, "aria-modal": true, "aria-labelledby": title != null ? titleId : undefined, "aria-label": title != null ? undefined : ariaLabel }
    : { accessibilityViewIsModal: true, "aria-label": ariaLabel }
  // Android's sheet stands under the status bar at most; the phone layer's 16 under the top inset
  const maxHeight = screen - insets.top - (android ? 0 : 16)
  // Android's sheet is as wide as the screen in portrait; in landscape 80% of it and 480dp at least
  const maxWidth = android && width > screen ? Math.max(width * 0.8, Math.min(480, width)) : undefined
  const closeSize = theme.length("--dialog-sheet-close-size", 44)
  const margin = theme.length("--mobile-layout-margin", 16)
  // Android's sheet has no handle: the whole sheet takes the drag, its top with the title (Medium 20, 21 in)
  const header = android ? (
    <View style={title != null ? styles.androidHeader : styles.androidGrip}>
      {title != null ? (
        <Text nativeID={titleId} accessibilityRole="header" weight="medium" color={m.onSurface} style={{ fontSize: titleType.fontSize, lineHeight: titleType.lineHeight }}>
          {title}
        </Text>
      ) : null}
    </View>
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
  return (
    <Overlay open={open} onDismiss={close} scrim={android ? ANDROID_DIM.sheet : iosDim(theme)} dismissible={dismissible} motion="sheet" testID={testID}>
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
                maxWidth,
                borderTopLeftRadius: radius,
                borderTopRightRadius: radius,
                backgroundColor: background,
                // Over the keyboard: Android's height is over its navigation bar, iOS's from the screen's edge
                paddingBottom: android ? insets.bottom + keyboard : keyboard,
                // With reduced motion it fades in place, and follows only the finger
                opacity: reduced ? progress : undefined,
                transform: [{ translateY: reduced ? drag : Animated.add(progress.interpolate({ inputRange: [0, 1], outputRange: [height || screen, 0] }), drag) }],
              },
            ]}
          >
            {header}
            {/* Content taller than the screen scrolls; on iOS the drag stays on the bar, on Android it starts at the
                content's top */}
            <ScrollView
              style={styles.scroll}
              {...(android ? { onTouchStart: gesture.content.onTouchStart, onScroll: gesture.content.onScroll, scrollEventThrottle: 16 } : null)}
              contentContainerStyle={[android ? [styles.androidContent, footer ? styles.androidContentOverFooter : null] : iosContent, contentStyle]}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {content}
            </ScrollView>
            {footer ? (
              <View
                style={[
                  android ? styles.androidFooter : [styles.iosFooter, { paddingHorizontal: margin, paddingBottom: keyboard ? 16 : Math.max(16, insets.bottom) }],
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

/**
 * A sheet from the bottom edge: on iOS 26 the sheet of the phone layer (`--dialog-sheet-radius` 38 on its top corners,
 * a bar 16 under its top edge with Close at the leading edge and the title centered, as the web's phone Sheet; no
 * grabber, since its height does not change), on Android a flat sheet (24dp top corners, white, a Medium 20 title
 * at 21, no handle, a 20% dim, the screen's width in portrait). Drag it down to close it: its bar on iOS, anywhere on
 * Android (from the content once it is scrolled to its top).
 * `BottomSheet.Footer` pins actions under the content.
 */
export const BottomSheet = Object.assign(BottomSheetRoot, { Footer: BottomSheetFooter })

const styles = StyleSheet.create({
  bottom: { flex: 1, justifyContent: "flex-end", alignItems: "center" },
  sheet: { alignSelf: "stretch", overflow: "hidden", borderCurve: "continuous", marginHorizontal: "auto", width: "100%" },
  scroll: { flexGrow: 0, flexShrink: 1 },
  iosBar: { flexDirection: "row", alignItems: "center", gap: 8 },
  iosHeading: { flex: 1, alignItems: "center", justifyContent: "center" },
  scrimTarget: { position: "absolute", top: 0, left: 0, right: 0 },
  // The title's 24 line 20 from the top edge and 8 over the content; with no title the top 8 of the sheet's padding
  androidHeader: { paddingTop: 20, paddingBottom: 8, paddingHorizontal: 21 },
  androidGrip: { height: 8 },
  // The content at the title's 21, with the sheet's 8 under it (16 over the navigation bar)
  androidContent: { paddingHorizontal: 21, paddingTop: 4, paddingBottom: 16 },
  androidContentOverFooter: { paddingBottom: 8 },
  iosFooter: { gap: 10, paddingTop: 12 },
  iosFooterEdge: { position: "absolute", top: -15, left: 0, right: 0, bottom: 0 },
  // Android's sheet actions: a 48dp button 16 from the sides, a text button under it, 16 under the last
  androidFooter: { gap: 4, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
})
