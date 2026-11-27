import { Children, cloneElement, createContext, Fragment, isValidElement, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react"
import { Animated, Easing, I18nManager, PanResponder, Platform, ScrollView, StyleSheet, View, useWindowDimensions, type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native"
import { Pressable } from "../../internal/Pressable"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Svg, { Path } from "react-native-svg"
import ArrowLeftLg from "../../icons/plex/ArrowLeftLg"
import CheckMd from "../../icons/plex/CheckMd"
import ChevronDown from "../../icons/plex/ChevronDown"
import ChevronRightMd from "../../icons/plex/ChevronRightMd"
import { lastInputKeyboard, spaceToggles } from "../../internal/a11y"
import { textOf } from "../../internal/children"
import { isRTL, mirrored } from "../../internal/direction"
import { curves } from "../../internal/motion"
import { useRipple } from "../../internal/ripple"
import { RowFrameContext, type RowFrame } from "../../internal/row"
import { Glass } from "../../internal/Glass"
import { ACCELERATE_DECELERATE, canTransformGlass, glassOpacity, Overlay, overlayTiming } from "../../internal/Overlay"
import { androidGray, androidSelector, barSurface, withAlpha, dangerText } from "../../theme/material"
import { useAndroidGlass } from "../../internal/BarBackdrop"
import { BarItemContext } from "../Button/Button"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { IconDefaultsProvider } from "../Icon/createIcon"
import { Text } from "../Text/Text"

export type MenuAnchor = { x: number; y: number; width: number; height: number }

/** The List row a menu opens from, measured with its trigger, and the radius of its top and bottom corners. */
export type MenuRow = { box: MenuAnchor; radius: RowFrame["radius"] }

export type Measurable = {
  measureInWindow?: (callback: (x: number, y: number, width: number, height: number) => void) => void
  measure?: (callback: (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void) => void
}

type MenuContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  anchor: MenuAnchor | null
  /** The List row the trigger stands in. */
  row: MenuRow | null
  /** The trigger stands in a bar (Android's header menu: the bar's glass). */
  header: boolean
  setHeader: (header: boolean) => void
  setTrigger: (node: Measurable | null) => void
  setRowFrame: (frame: RowFrame | null) => void
  /** Measures the trigger again, as it moves while the menu is open. */
  place: () => void
}
const MenuContext = createContext<MenuContextValue | null>(null)

/** Closes the menu once an item is chosen; also used by Select. */
const SurfaceContext = createContext<{ close: () => void; check: boolean; multiple?: boolean; openSub?: (sub: OpenSub) => void; refreshSub?: (owner: object, items: ReactNode) => void; subOpen?: boolean; header?: boolean }>({ close: () => {}, check: false })

export type MenuProps = {
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/** Measures an element where the overlay lays the menu out. */
export function measure(node: Measurable | null, done: (anchor: MenuAnchor) => void) {
  // Android's window measure starts under the status bar, while the overlay's Modal draws under it
  // (statusBarTranslucent): the place in the root view, which draws from the screen's top edge to edge, is the Modal's
  if (Platform.OS === "android" && node?.measure) {
    node.measure((_x, _y, width, height, pageX, pageY) => done({ x: pageX, y: pageY, width, height }))
    return
  }
  if (!node?.measureInWindow) return done({ x: 0, y: 0, width: 0, height: 0 })
  node.measureInWindow((x, y, width, height) => done({ x, y, width, height }))
}

/**
 * Where a menu's trigger stands, and the List row it stands in: measured as the menu opens (`place`, then `then`), and
 * again while it is open when the window turns or resizes. A measure that comes back after a newer one, or after the
 * menu closed, is dropped.
 */
export function useMenuAnchor(open: boolean) {
  const trigger = useRef<Measurable | null>(null)
  const rowFrame = useRef<RowFrame | null>(null)
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null)
  const [row, setRow] = useState<MenuRow | null>(null)
  const generation = useRef(0)
  const { width, height } = useWindowDimensions()
  const place = useCallback((then?: () => void) => {
    const own = ++generation.current
    measure(trigger.current, (box) => {
      if (own !== generation.current) return
      const frame = rowFrame.current
      if (!frame) {
        setAnchor(box)
        setRow(null)
        then?.()
        return
      }
      measure(frame.node.current as Measurable | null, (rowBox) => {
        if (own !== generation.current) return
        setAnchor(box)
        setRow({ box: rowBox, radius: frame.radius })
        then?.()
      })
    })
  }, [])
  useEffect(() => {
    if (open) place()
    else generation.current++
  }, [open, width, height, place])
  const setTrigger = useCallback((node: Measurable | null) => {
    trigger.current = node
  }, [])
  const setRowFrame = useCallback((frame: RowFrame | null) => {
    rowFrame.current = frame
  }, [])
  return { anchor, row, place, setTrigger, setRowFrame }
}

/**
 * A menu of actions from a trigger: iOS 26's pop-up menu (glass, radius 34, 250 wide, 17/20 rows of 42 with the
 * symbol at the leading edge, `--menu-*` of the phone layer), Android's popup (white, 12dp corners, 48dp
 * items in Regular 16, groups parted by an 8dp band, a chosen option checked at the leading edge, unrolling from its
 * trigger). Opened from a List row (a row's ⋮), Android dims the screen to black at 40% around the row, which stays
 * lit, and sets the popup 8 under the row at its end edge. Parts as @plexui/ui: `Menu.Trigger`, `Menu.Content`,
 * `Menu.Item`, `Menu.Separator`, `Menu.Label`.
 */
function MenuRoot({ children, open: openProp, onOpenChange }: MenuProps) {
  const [own, setOwn] = useState(false)
  const open = openProp ?? own
  // A menu opened from outside (the controlled `open`) is placed at its trigger too
  const { anchor, row, place, setTrigger, setRowFrame } = useMenuAnchor(open)
  const [header, setHeader] = useState(false)
  // Listens for the input from the start, so a menu opened from the keyboard knows it (the web)
  useEffect(() => {
    lastInputKeyboard()
  }, [])
  const setOpen = (next: boolean) => {
    const apply = () => {
      if (openProp === undefined) setOwn(next)
      onOpenChange?.(next)
    }
    if (next) place(apply)
    else apply()
  }
  return <MenuContext.Provider value={{ open, setOpen, anchor, row, header, setHeader, setTrigger, setRowFrame, place: () => place() }}>{children}</MenuContext.Provider>
}
MenuRoot.displayName = "Menu"

function useMenu(part: string) {
  const context = useContext(MenuContext)
  if (!context) throw new Error(`${part} must be inside a Menu`)
  return context
}

/** The element that opens the menu: a Button or anything with `onPress`. */
function MenuTrigger({ children, style }: { children: ReactElement<{ onPress?: (event: GestureResponderEvent) => void }>; style?: StyleProp<ViewStyle> }) {
  const { open, setOpen, setTrigger, setRowFrame, setHeader, place } = useMenu("Menu.Trigger")
  // A trigger in a List row tells the menu its row; one in a bar that it is the bar's (Android's header menu)
  const frame = useContext(RowFrameContext)
  const inBar = useContext(BarItemContext) != null
  useLayoutEffect(() => {
    setRowFrame(frame)
    return () => setRowFrame(null)
  }, [frame, setRowFrame])
  useLayoutEffect(() => {
    setHeader(inBar)
    return () => setHeader(false)
  }, [inBar, setHeader])
  const onPress = isValidElement(children) ? children.props.onPress : undefined
  const child = isValidElement(children)
    ? cloneElement(children, {
        onPress: (event: GestureResponderEvent) => {
          onPress?.(event)
          setOpen(!open)
        },
        "aria-haspopup": "menu",
        "aria-expanded": open,
      } as Record<string, unknown>)
    : children
  return (
    // A trigger that moves while its menu is open takes the menu with it
    <View ref={setTrigger as never} collapsable={false} onLayout={open ? place : undefined} style={[styles.trigger, style]}>
      {child}
    </View>
  )
}
MenuTrigger.displayName = "Menu.Trigger"

export type MenuContentProps = {
  children: ReactNode
  /** The menu's edge that lines up with the trigger's: `start` is the right edge in a right-to-left layout. @default "start" */
  align?: "start" | "end"
  /** @default 250 on iOS; on Android the popup fits its items, 196 to 288 */
  width?: number
  /**
   * Several options to pick: a press on an item with `checked` checks or unchecks it and the menu stays open; its items
   * read as checkboxes. @default false
   */
  multiple?: boolean
  /**
   * The menu opens over its trigger, as Android's popup and the web's phone menu; `false` opens it under the trigger,
   * its top at the trigger's bottom edge, as Material's dropdown menu under a chip. @default true
   */
  cover?: boolean
  "aria-label"?: string
  testID?: string
}

function MenuContent(props: MenuContentProps) {
  const menu = useMenu("Menu.Content")
  // A menu whose items say `checked` (true or false) is a set of options: it keeps the checkmark's column, as Select's
  return <MenuSurface {...props} check={hasCheckedItems(props.children)} open={menu.open} anchor={menu.anchor} row={menu.row} header={menu.header} onClose={() => menu.setOpen(false)} />
}

export function hasCheckedItems(children: ReactNode): boolean {
  return Children.toArray(children).some((child) =>
    isValidElement<{ checked?: boolean; children?: ReactNode }>(child) ? child.props.checked !== undefined || (child.type === Fragment && hasCheckedItems(child.props.children)) : false,
  )
}
MenuContent.displayName = "Menu.Content"

type SurfaceProps = MenuContentProps & {
  open: boolean
  anchor: MenuAnchor | null
  onClose: () => void
  check?: boolean
  /** The List row the menu opens from: on Android the screen dims around it and the popup stands under it. */
  row?: MenuRow | null
  /** Opened from a bar's button: on Android the header menu, in the bar's glass. */
  header?: boolean
  /**
   * A context menu's touch and hold (ContextMenu): on iOS the screen dims and blurs but the element, drawn again
   * over the dimming as its lifted `preview`, and the menu stands 16 from it, by the third of the screen it is in.
   */
  context?: { preview: ReactNode; radius: number; bare?: boolean }
}

/** The floating panel of a menu, placed under its anchor (over it when the screen ends first). */
export function MenuSurface(props: SurfaceProps) {
  const theme = useTheme()
  return theme.isAndroid ? <AndroidMenuSurface {...props} /> : <IOSMenuSurface {...props} />
}

/** iOS 26's pop-up menu: glass, a submenu over the menu at its row while the menu steps back. */
function IOSMenuSurface({ open, anchor, onClose, align = "start", width, check = false, multiple = false, cover, context, children, "aria-label": ariaLabel, testID }: SurfaceProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const window = useWindowDimensions()
  // Unknown until the panel's first layout, which stands off the screen: a guess would show it flip
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [sub, setSub] = useState<OpenSub | null>(null)
  // The submenu's height, measured off the screen before it shows; its step (0 to 1) moves it in and the menu back
  const [subHeight, setSubHeight] = useState<number | null>(null)
  const [step] = useState(() => new Animated.Value(0))
  const [wasOpen, setWasOpen] = useState(open)
  // Each opening lays the panel out anew: a menu opened again while it still leaves keeps its view, whose size does
  // not change, so it would report no layout and stay where it is measured, off the screen
  const [openings, setOpenings] = useState(0)
  if (wasOpen !== open) {
    setWasOpen(open)
    // Each opening measures again: its items may have changed, and it opens at the menu, not at a submenu
    if (open) {
      setOpenings((count) => count + 1)
      setSize(null)
      setSub(null)
      // A menu closed over its submenu comes back whole
      step.setValue(0)
    }
  }
  const box = anchor ?? { x: window.width / 2, y: window.height / 2, width: 0, height: 0 }
  const panelWidth = width ?? theme.length("--menu-default-width", 250)
  const measured = panelWidth
  const height = size?.height ?? 0
  // A menu opens over its trigger, its top on the trigger's top (or its bottom on the trigger's bottom when it does
  // not fit under it): the web's phone menu (its top and end edge on the trigger's). A dropdown field's list opens 8
  // from the field's edge
  const over = cover !== false
  const gap = 8
  // At least 30 from the top and the bottom and 12 from the sides, as the web's phone menu keeps (its collision padding)
  const margin = 12
  const topEdge = Math.max(insets.top + 8, 30)
  const bottomEdge = Math.max(insets.bottom + 8, 30)
  const rtl = isRTL()
  const alignsLeft = (align === "start") !== rtl
  let left = alignsLeft ? box.x : box.x + box.width - measured
  left = Math.max(margin, Math.min(left, window.width - measured - margin))
  const below = over ? box.y : box.y + box.height + gap
  const fitsBelow = below + height <= window.height - bottomEdge
  const above = over ? box.y + box.height - height : box.y - gap - height
  let top = size == null ? -window.height - 1000 : fitsBelow ? below : Math.max(topEdge, above)
  // A preview wider than the screen less 16 a side is scaled down about its middle to fit, as iOS 27.2 shrinks a
  // lifted cell or card, and one that would cross the 16 is moved in: `seen` is where it shows
  const fit = 16
  const fitScale = context && box.width > window.width - fit * 2 ? (window.width - fit * 2) / box.width : 1
  const seenWidth = box.width * fitScale
  const seenHeight = box.height * fitScale
  const seen = {
    x: context && box.width > 0 ? Math.max(fit, Math.min(box.x + (box.width - seenWidth) / 2, window.width - fit - seenWidth)) : box.x,
    y: box.y + (box.height - seenHeight) / 2,
    width: seenWidth,
    height: seenHeight,
  }
  let previewTop = seen.y
  if (context) {
    // iOS 27.2 places a context menu by where the element stands (ref-app menus-context): in the left third at its
    // left edge, in the right third at its right edge, else at its centre; 16 under it, or over it when the element
    // is in the lower half and the menu fits there (the web's ContextMenu, contextMenuPreview)
    const centre = seen.x + seen.width / 2
    left = centre < window.width / 3 ? seen.x : centre > (window.width * 2) / 3 ? seen.x + seen.width - measured : centre - measured / 2
    left = Math.max(margin, Math.min(left, window.width - measured - margin))
    const lift = 16
    const overIt = seen.y - lift - height
    const underIt = seen.y + seen.height + lift
    const lower = seen.y + seen.height / 2 > window.height / 2
    if (size != null) {
      if (lower && overIt >= topEdge) top = overIt
      else {
        // Where the menu does not fit under the element it lifts the element up with it, as iOS moves the preview, so
        // the menu never covers it
        const overflow = underIt + height - (window.height - bottomEdge)
        previewTop = overflow > 0 ? Math.max(topEdge, seen.y - overflow) : seen.y
        top = Math.max(topEdge, Math.min(previewTop + seen.height + lift, window.height - bottomEdge - height))
      }
    }
  }
  // The measures are from the screen's left; a phone in a right-to-left layout reads `left` as the start edge
  const swap = Platform.OS !== "web" && I18nManager.isRTL && I18nManager.doLeftAndRightSwapInRTL
  const horizontal = swap ? { right: left } : { left }
  const maxHeight = window.height - topEdge - bottomEdge
  const timing = overlayTiming(theme, "menu")
  const moveTo = (value: Animated.Value, to: number, enter: boolean, done?: () => void) => {
    value.stopAnimation()
    if (theme.reducedMotion) {
      value.setValue(to)
      done?.()
      return
    }
    Animated.timing(value, {
      toValue: to,
      duration: enter ? timing.enter : timing.exit,
      easing: enter ? timing.enterEasing : timing.exitEasing,
      useNativeDriver: false,
    }).start(({ finished }) => finished && done?.())
  }
  const openSub = (next: OpenSub) => {
    setSubHeight(null)
    setSub(next)
    step.setValue(0)
    moveTo(step, 1, true)
  }
  const collapse = () => moveTo(step, 0, false, () => setSub(null))
  // A multiple choice keeps the submenu open: its items follow the app's state while it shows
  const refreshSub = (owner: object, items: ReactNode) => setSub((current) => (current == null || current.owner !== owner || current.items === items ? current : { ...current, items }))
  const surface = { close: onClose, check, multiple, openSub, refreshSub, subOpen: sub != null }
  const content = <SurfaceContext.Provider value={surface}>{children}</SurfaceContext.Provider>
  const subItems = sub != null ? <SurfaceContext.Provider value={{ close: onClose, check: hasCheckedItems(sub.items), multiple }}>{sub.items}</SurfaceContext.Provider> : null
  const scale = !theme.reducedMotion && canTransformGlass
  // The web's keyboard, as the WAI-ARIA menu pattern: focus starts at the chosen item (else the first), the arrows
  // move to the next one and stop at the ends, Home and End go to the first and the last
  const panel = useRef<unknown>(null)
  const subPanel = useRef<unknown>(null)
  const web = Platform.OS === "web"
  const placed = size != null
  useEffect(() => {
    if (!web || !open || !placed) return
    // Opened from the keyboard (a key was the last input and the trigger's focus is visible) the focus goes to the
    // chosen item, else the first; opened by a pointer, or open as the page loads, it goes to the panel, so no item
    // looks focused and the arrows still move into the items
    const keyboard = lastInputKeyboard() && focusVisible((globalThis as { document?: { activeElement?: unknown } }).document?.activeElement ?? null)
    const frame = requestAnimationFrame(() => {
      const items = menuItems(panel.current)
      const target = keyboard ? (items.find((item) => item.getAttribute("aria-checked") === "true") ?? items[0]) : (panel.current as DomItem | null)
      target?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [web, open, placed])
  // A submenu takes the focus as it opens, on its first item from the keyboard; back at the menu, its row has it
  const subShown = sub != null && subHeight != null
  useEffect(() => {
    if (!web || !open || !placed) return
    const keyboard = lastInputKeyboard()
    const frame = requestAnimationFrame(() => {
      const host = (subShown ? subPanel.current : panel.current) as { querySelector?: (selector: string) => DomItem | null } | null
      const items = menuItems(subShown ? host : panel.current)
      const trigger = host?.querySelector?.('[aria-haspopup="menu"]') ?? null
      const target = subShown ? (keyboard ? items[0] : (host as DomItem | null)) : keyboard ? trigger : (panel.current as DomItem | null)
      target?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
    // Only as a submenu shows or goes: the opening's own focus is above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subShown])
  const keysOf = (host: { current: unknown }) => (web ? { onKeyDown: (raw: unknown) => menuKeyDown(raw, host.current) } : null)
  const gutter = theme.length("--menu-gutter", 10)
  const stepBack = { transformOrigin: "50% 0", transform: [{ scale: step.interpolate({ inputRange: [0, 1], outputRange: [1, 0.968] }) }] }
  const glass = { radius: theme.length("--menu-radius", 34), elevation: "raised" as const, fillToken: "--menu-mobile-background" }
  // The submenu's heading row covers the row that opened it (its top a gutter above), inside the screen
  const subTop =
    sub == null || subHeight == null
      ? -window.height - 1000
      : Math.max(topEdge, Math.min(sub.y - gutter, window.height - bottomEdge - subHeight))
  return (
    <Overlay open={open} onDismiss={onClose} motion="menu" testID={testID}>
      {(progress, opening) => (
        <>
          {context ? (
            <>
              {/* The page dims (black at 20%, 50% at night) over a 30px blur on the web; the element stays clear */}
              <Animated.View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: theme.color("--context-menu-dimming-background", theme.scheme === "dark" ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.2)"), opacity: progress },
                  web ? ({ backdropFilter: "blur(30px)", WebkitBackdropFilter: "blur(30px)" } as ViewStyle) : null,
                ]}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.preview,
                  // Drawn at its own size and scaled about its middle onto where it is seen
                  swap ? { right: seen.x + (seen.width - box.width) / 2 } : { left: seen.x + (seen.width - box.width) / 2 },
                  {
                    top: previewTop + (seen.height - box.height) / 2,
                    width: box.width,
                    height: box.height,
                    transform: fitScale < 1 ? [{ scale: fitScale }] : undefined,
                    borderRadius: context.radius,
                    // An element that draws its own shape lifts as it is: no card behind it and no clip of its own
                    ...(context.bare ? { overflow: "visible" as const } : { backgroundColor: theme.colors.groupedSurface }),
                    boxShadow: String(theme.token("--context-menu-preview-shadow") ?? "0 0 32px rgba(0, 0, 0, 0.2)"),
                  },
                ]}
              >
                {context.preview}
              </View>
            </>
          ) : null}
          <Animated.View
            key={openings}
            ref={panel as never}
            // The panel takes the focus of a menu opened by a pointer (the web), with no ring of its own
            {...(web ? { tabIndex: -1 as const } : null)}
            accessibilityRole="menu"
            aria-label={ariaLabel}
            {...keysOf(panel)}
            onLayout={(event) => setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}
            style={[
              styles.surface,
              horizontal,
              {
                top,
                width: panelWidth,
                maxHeight,
                opacity: glassOpacity(progress, opening),
                // With reduced motion it fades in place
                transform: scale ? [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] : undefined,
              },
            ]}
          >
            {/* While a submenu stands over it the menu steps back from its top: 0.968 of its size, its rows at half
                strength, and a press on it goes back */}
            <Animated.View style={[styles.shrink, scale ? stepBack : null]}>
              {/* On the web the glass scales itself: a transform above it would stop its blur */}
              <Glass {...glass} style={[styles.shrink, { padding: gutter }, !scale && web && !theme.reducedMotion ? (stepBack as ViewStyle) : null]}>
                {/* A long menu scrolls inside the screen */}
                <ScrollView style={styles.scroll} bounces={false}>
                  <Animated.View pointerEvents={sub ? "none" : "auto"} style={{ opacity: step.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] }) }}>
                    {content}
                  </Animated.View>
                </ScrollView>
              </Glass>
              {sub ? <View style={StyleSheet.absoluteFill} onStartShouldSetResponder={() => true} onResponderRelease={collapse} /> : null}
            </Animated.View>
          </Animated.View>
          {sub ? (
            <Animated.View
              ref={subPanel as never}
              {...(web ? { tabIndex: -1 as const } : null)}
              accessibilityRole="menu"
              aria-label={textOf(sub.label) || undefined}
              {...keysOf(subPanel)}
              onLayout={(event) => setSubHeight(event.nativeEvent.layout.height)}
              style={[
                styles.surface,
                horizontal,
                {
                  top: subTop,
                  width: panelWidth,
                  maxHeight,
                  // On the web the glass fades itself: Chromium kept the blur of a panel faded from above unblurred
                  opacity: web ? 1 : Animated.multiply(glassOpacity(progress, opening), step),
                  // It grows from the middle of its top, where its heading covers the row, as the menu steps back
                  transformOrigin: "50% 0",
                  transform: scale ? [{ scale: step.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] : undefined,
                },
              ]}
            >
              <Glass {...glass} style={[styles.shrink, { padding: gutter }, web ? ({ opacity: Animated.multiply(glassOpacity(progress, opening), step) } as unknown as ViewStyle) : null]}>
                <SurfaceContext.Provider value={{ close: onClose, check: false }}>
                  <MenuRow heading stay={collapse}>
                    {sub.label}
                  </MenuRow>
                  <MenuSeparator />
                </SurfaceContext.Provider>
                {/* The heading stays in reach and the items scroll under it */}
                <ScrollView style={styles.scroll} bounces={false}>
                  {subItems}
                </ScrollView>
              </Glass>
            </Animated.View>
          ) : null}
        </>
      )}
    </Overlay>
  )
}

type Size = { width: number; height: number }
const sameSize = (next: Size) => (current: Size | null) => (current && current.width === next.width && current.height === next.height ? current : next)

/**
 * The rows of an Android popup coming in as it unrolls: as the popup's edge passes 24 short of
 * a row's far side, the row fades in and slides 6dp from the side the popup unrolls from, over 180ms, decelerating.
 */
type Cascade = {
  clock: Animated.Value
  /** The unroll's share of the clock. */
  unroll: number
  /** A row's 180ms as a share of the clock. */
  rowIn: number
  /** The popup's height, which the unroll crosses. */
  height: number
  /** The popup unrolls from its bottom: it stands above its trigger. */
  fromBottom: boolean
}
const CascadeContext = createContext<Cascade | null>(null)

/** How long a row takes to come in, and its slide (the popup's cascade). */
const ROW_IN = 180
const ROW_SLIDE = 6
/** Android's DecelerateInterpolator. */
const DECELERATE = curves.decelerate

/** The rows of a menu, through fragments: the unroll takes 16ms more for each. */
function countRows(children: ReactNode): number {
  return Children.toArray(children).reduce<number>(
    (sum, child) => sum + (isValidElement<{ children?: ReactNode }>(child) ? (child.type === Fragment ? countRows(child.props.children) : 1) : 0),
    0,
  )
}

/** A row of an Android popup's menu, which comes in with the cascade (as it is elsewhere). */
function CascadeRow({ children }: { children: ReactNode }) {
  const cascade = useContext(CascadeContext)
  const [box, setBox] = useState<{ y: number; height: number } | null>(null)
  if (!cascade) return <>{children}</>
  const { clock, unroll, rowIn, height, fromBottom } = cascade
  let start = 0
  if (box && height > 0) {
    // The unroll's edge passes 24 short of the row's far side (32 short of its top as the popup unrolls upward) at
    // this share of its run: the inverse of its curve, (1 − cos πt) / 2
    const reach = fromBottom ? height - box.y - 32 : box.y + box.height - 24
    const share = Math.min(1, Math.max(0, reach / height))
    start = (unroll * Math.acos(1 - 2 * share)) / Math.PI
  }
  const range = { inputRange: [start, start + rowIn], easing: DECELERATE, extrapolate: "clamp" as const }
  return (
    <Animated.View
      onLayout={(event) => {
        const { y, height: rowHeight } = event.nativeEvent.layout
        setBox((current) => (current && current.y === y && current.height === rowHeight ? current : { y, height: rowHeight }))
      }}
      style={{
        opacity: clock.interpolate({ ...range, outputRange: [0, 1] }),
        transform: [{ translateY: clock.interpolate({ ...range, outputRange: [fromBottom ? ROW_SLIDE : -ROW_SLIDE, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  )
}

/** Android's move between a popup's pages: 300ms on the default ease curve. */
const SWIPE_BACK = 300
const SWIPE_EASING = curves.ease
/** A flick back to the menu: Android's 600 px/s, about 0.23dp per ms on a 420dpi phone. */
const SWIPE_FLING = 0.23

type SwipeState = { ready: boolean; span: number; rtl: boolean; grab: () => void; release: (velocity: number) => void }

/**
 * The drag that takes an Android submenu back (a swipe back): towards the end edge, at least 1.5 times as far
 * sideways as down, after 8dp. One responder for the popup's life, told the latest state after each render.
 */
function swipeBackGesture(swipe: Animated.Value) {
  let state: SwipeState = { ready: false, span: 1, rtl: false, grab: () => {}, release: () => {} }
  const along = (dx: number) => (state.rtl ? -dx : dx)
  const responder = PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) => state.ready && along(gesture.dx) > 8 && Math.abs(gesture.dx) >= Math.abs(gesture.dy) * 1.5,
    onPanResponderGrant: () => state.grab(),
    onPanResponderMove: (_, gesture) => swipe.setValue(1 - Math.min(1, Math.max(0, along(gesture.dx) / state.span))),
    onPanResponderRelease: (_, gesture) => state.release(along(gesture.vx)),
    onPanResponderTerminate: () => state.release(0),
    onPanResponderTerminationRequest: () => false,
  })
  return {
    responder,
    update: (next: SwipeState) => {
      state = next
    },
  }
}

type PageProps = { children: ReactNode; width?: number; minWidth: number; maxWidth: number; maxHeight: number; onSize: (size: Size) => void; style?: StyleProp<ViewStyle> }

/**
 * A page of an Android popup: its rows in a plain View, measured (a ScrollView does not tell its parent its width),
 * and in a ScrollView at the width they took when they are taller than the screen. It reports its size.
 */
function AndroidPage({ children, width, minWidth, maxWidth, maxHeight, onSize, style }: PageProps) {
  const [natural, setNatural] = useState<Size | null>(null)
  if (natural != null && natural.height > maxHeight) {
    return (
      <ScrollView
        style={[styles.androidPage, { width: natural.width, height: maxHeight }, style]}
        bounces={false}
        onLayout={(event) => onSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}
      >
        {children}
      </ScrollView>
    )
  }
  return (
    <View
      style={[styles.androidPage, { minWidth, maxWidth, width }, style]}
      onLayout={(event) => {
        const next = { width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height }
        setNatural(sameSize(next))
        // A page taller than the screen scrolls at the screen's height: that is its size
        onSize({ width: next.width, height: Math.min(next.height, maxHeight) })
      }}
    >
      {children}
    </View>
  )
}

/**
 * The Android popup: 12dp corners, as wide as its items (196 to 288). It unrolls from its trigger's side over 150ms
 * and 16 more for each row (accelerate-decelerate) while each row fades in and slides 6dp; it leaves fading as it
 * lifts 5dp, over 150ms. A submenu swipes in: it slides in from the end over 300ms while the menu moves half its
 * width back, shrinks to 0.95 under a dim of up to 25% black, and the popup's size turns into the submenu's; Back, a
 * drag towards the end or a flick takes it back.
 */
function AndroidMenuSurface({ open, anchor, row, header = false, onClose, align = "start", width, check = false, multiple = false, cover, children, "aria-label": ariaLabel, testID }: SurfaceProps) {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const window = useWindowDimensions()
  const m = theme.material
  const reduced = theme.reducedMotion
  const rtl = isRTL()
  const web = Platform.OS === "web"
  // The menu's size, measured as it first lays out off the screen; then the submenu's
  const [size, setSize] = useState<Size | null>(null)
  const [sub, setSub] = useState<OpenSub | null>(null)
  const [subSize, setSubSize] = useState<Size | null>(null)
  // 0 at the menu, 1 at the submenu (the swipe's progress)
  const [swipe] = useState(() => new Animated.Value(0))
  const swipeAt = useRef(0)
  // The menu stays drawn behind a submenu while it moves; a settled submenu hides it
  const [behind, setBehind] = useState(true)
  const [moving, setMoving] = useState(false)
  // The entrance runs on its own clock, evenly from 0 to 1, from the moment the popup is placed
  const [clock] = useState(() => new Animated.Value(0))
  const [revealed, setRevealed] = useState(false)
  const pending = useRef(false)
  const [openings, setOpenings] = useState(0)
  const [wasOpen, setWasOpen] = useState(open)
  if (wasOpen !== open) {
    setWasOpen(open)
    // Each opening measures again and opens at the menu, its page laid out anew (a page kept from a menu that still
    // leaves would report no layout)
    if (open) {
      setOpenings((count) => count + 1)
      setSize(null)
      setSub(null)
      setSubSize(null)
      setBehind(true)
      setMoving(false)
      setRevealed(false)
      swipe.setValue(0)
      clock.setValue(0)
    }
  }
  useEffect(() => {
    const id = swipe.addListener(({ value }) => {
      swipeAt.current = value
    })
    return () => swipe.removeListener(id)
  }, [swipe])
  const box = anchor ?? { x: window.width / 2, y: window.height / 2, width: 0, height: 0 }
  // The popup opens over its trigger (its top on the trigger's top, or its bottom on the trigger's bottom when it does
  // not fit under it); a dropdown field's list opens right at the field's edge. Inside the safe areas and 8 from them
  const over = cover !== false
  const margin = 8
  const topEdge = insets.top + margin
  const bottomEdge = insets.bottom + margin
  const maxHeight = window.height - topEdge - bottomEdge
  // The start edges line up (Compose's MenuPosition follows the layout direction)
  const alignsLeft = (align === "start") !== rtl
  const placeFor = (panel: Size) => {
    if (row) {
      // From a List row: at the row's end edge, 8 under the row, or 8 over it when it does not fit under
      const { box: lit } = row
      const left = Math.max(margin, Math.min(rtl ? lit.x : lit.x + lit.width - panel.width, window.width - panel.width - margin))
      const under = lit.y + lit.height + ROW_MENU_GAP
      const fitsUnder = under + panel.height <= window.height - bottomEdge
      return { left, top: fitsUnder ? under : Math.max(topEdge, lit.y - ROW_MENU_GAP - panel.height), fromBottom: !fitsUnder }
    }
    const left = Math.max(margin, Math.min(alignsLeft ? box.x : box.x + box.width - panel.width, window.width - panel.width - margin))
    const below = over ? box.y : box.y + box.height
    const fitsBelow = below + panel.height <= window.height - bottomEdge
    const top = fitsBelow ? below : Math.max(topEdge, over ? box.y + box.height - panel.height : box.y - panel.height)
    return { left, top, fromBottom: !fitsBelow }
  }
  const main = size ? placeFor(size) : null
  // While a submenu moves, the popup's place and size go from the menu's to the submenu's
  const morphing = size != null && sub != null && subSize != null
  const next = morphing ? placeFor(subSize) : null
  const morph = (from: number, to: number) => swipe.interpolate({ inputRange: [0, 1], outputRange: [from, to] })
  const top = main == null ? -window.height - 1000 : next ? morph(main.top, next.top) : main.top
  const left = main == null ? 0 : next ? morph(main.left, next.left) : main.left
  // The measures are from the screen's left; a phone in a right-to-left layout reads `left` as the start edge
  const swapped = Platform.OS !== "web" && I18nManager.isRTL && I18nManager.doLeftAndRightSwapInRTL
  const horizontal = swapped ? { right: left } : { left }
  const fromBottom = main?.fromBottom ?? false
  const placed = size != null
  // The entrance: the unroll's 150ms and 16 a row, and the last row's 180 after it. From a List row the popup does not
  // unroll: it fades in whole over 150ms as it grows from 0.95 with a slight overshoot over 200
  const unroll = 150 + 16 * countRows(children)
  const total = unroll + ROW_IN
  const popping = row != null
  useEffect(() => {
    if (!open || !placed || reduced) return
    clock.setValue(0)
    const animation = Animated.timing(clock, { toValue: 1, duration: popping ? ROW_POP.scale : total, easing: Easing.linear, useNativeDriver: false })
    animation.start(({ finished }) => {
      if (finished) setRevealed(true)
    })
    return () => animation.stop()
    // Once for each opening, as the popup is placed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, placed])
  const height = size?.height ?? 0
  const unrollShare = unroll / total
  const cascade = useMemo<Cascade | null>(
    () => (reduced || popping ? null : { clock, unroll: unrollShare, rowIn: ROW_IN / total, height, fromBottom }),
    [reduced, popping, clock, unrollShare, total, height, fromBottom],
  )
  // The unroll: the popup's height from 0 to its own, from its trigger's side; from the bottom the popup and its rows
  // move together, so its bottom edge stays. The panel's fill and shadow fade in as it unrolls
  const unrolling = placed && !revealed && !reduced && !popping
  const reveal = (outputRange: number[]) => clock.interpolate({ inputRange: [0, unrollShare], outputRange, easing: ACCELERATE_DECELERATE, extrapolate: "clamp" })
  const panelWidth = morphing ? morph(size.width, subSize.width) : undefined
  const panelHeight = morphing ? morph(size.height, subSize.height) : unrolling ? reveal([0, height]) : undefined
  const drop = unrolling && fromBottom ? reveal([height, 0]) : null
  // The pages move across the wider of the two
  const span = Math.max(size?.width ?? 0, subSize?.width ?? 0) * (rtl ? -1 : 1)
  const minWidth = Math.max(196, width ?? 0)
  const maxWidth = Math.max(288, width ?? 0)
  const run = (to: 0 | 1, fling = 0) => {
    swipe.stopAnimation()
    setBehind(true)
    setMoving(true)
    const finish = () => {
      setMoving(false)
      if (to === 1) setBehind(false)
      else {
        setSub(null)
        setSubSize(null)
      }
    }
    if (reduced) {
      swipe.setValue(to)
      finish()
      return
    }
    // A shorter way, or a flick, takes less of the 300ms, half at least
    const duration = SWIPE_BACK * Math.max(0.5, Math.abs(swipeAt.current - to) - Math.min(0.2, fling))
    Animated.timing(swipe, { toValue: to, duration, easing: SWIPE_EASING, useNativeDriver: false }).start(({ finished }) => {
      if (finished) finish()
    })
  }
  const openSub = (opened: OpenSub) => {
    // A submenu opened while the popup unrolls finds it whole
    if (!revealed) {
      clock.stopAnimation()
      clock.setValue(1)
      setRevealed(true)
    }
    swipe.stopAnimation()
    swipe.setValue(0)
    setSub(opened)
    setSubSize(null)
    setBehind(true)
    setMoving(true)
    // It slides in once it has laid out, off at the end
    pending.current = true
  }
  const onSubSize = (measured: Size) => {
    setSubSize(sameSize(measured))
    if (!pending.current) return
    pending.current = false
    run(1)
  }
  const collapse = () => run(0)
  const [swipeBack] = useState(() => swipeBackGesture(swipe))
  useLayoutEffect(() => {
    swipeBack.update({
      // Only a settled submenu follows the finger
      ready: sub != null && !moving && !behind,
      span: Math.abs(span) || 1,
      rtl,
      grab: () => {
        swipe.stopAnimation()
        setBehind(true)
      },
      // Past half way, or on a flick towards the end, it goes back
      release: (velocity) => {
        if (velocity >= SWIPE_FLING) run(0, (velocity / SWIPE_FLING) * 0.1)
        else run(swipeAt.current >= 0.5 ? 1 : 0)
      },
    })
  })
  const refreshSub = (owner: object, items: ReactNode) => setSub((current) => (current == null || current.owner !== owner || current.items === items ? current : { ...current, items }))
  const surface = { close: onClose, check, multiple, openSub, refreshSub, subOpen: sub != null, header }
  // The submenu's page: Back, the 8dp band, the items
  const subItems =
    sub != null ? (
      <SurfaceContext.Provider value={{ close: onClose, check: hasCheckedItems(sub.items), multiple, header }}>
        <MenuRow icon={<ArrowLeftLg />} stay={collapse}>
          {sub.backLabel}
        </MenuRow>
        <MenuSeparator />
        {sub.items}
      </SurfaceContext.Provider>
    ) : null
  // The web's keyboard, as the WAI-ARIA menu pattern, over the page in front
  const panel = useRef<unknown>(null)
  const mainPage = useRef<unknown>(null)
  const subPage = useRef<unknown>(null)
  useEffect(() => {
    if (!web || !open || !placed) return
    // Opened from the keyboard the focus goes to the chosen item, else the first; opened by a pointer, to the panel
    const keyboard = lastInputKeyboard() && focusVisible((globalThis as { document?: { activeElement?: unknown } }).document?.activeElement ?? null)
    const frame = requestAnimationFrame(() => {
      const items = menuItems(mainPage.current)
      const target = keyboard ? (items.find((item) => item.getAttribute("aria-checked") === "true") ?? items[0]) : (panel.current as DomItem | null)
      target?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [web, open, placed])
  // A submenu takes the focus as it opens, on its first item from the keyboard; back at the menu, its row has it
  const subOpen = sub != null
  useEffect(() => {
    if (!web || !open || !placed) return
    const keyboard = lastInputKeyboard()
    const frame = requestAnimationFrame(() => {
      const host = (subOpen ? subPage.current : mainPage.current) as { querySelector?: (selector: string) => DomItem | null } | null
      const trigger = host?.querySelector?.('[aria-haspopup="menu"]') ?? null
      const target = subOpen ? (keyboard ? menuItems(host)[0] : (panel.current as DomItem | null)) : keyboard ? trigger : (panel.current as DomItem | null)
      target?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
    // Only as a submenu opens or goes: the opening's own focus is above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subOpen])
  // A screen reader skips the menu behind a submenu
  const hidden = sub != null && !web ? { importantForAccessibility: "no-hide-descendants" as const, accessibilityElementsHidden: true } : null
  // The submenu stands at the popup's start edge
  const startEdge = rtl && !swapped ? { right: 0 } : { left: 0 }
  // A row's menu (and any other) is the popup's card: white, a raised gray at night (the web's --android-card); a
  // header menu the bar's glass, blurred 36 under it on the web
  const glass = useAndroidGlass("bar")
  const card = theme.scheme === "dark" ? theme.color("--gray-300", barSurface(m, theme.scheme)) : barSurface(m, theme.scheme)
  const background = header ? (glass.backgroundColor as string) : card
  const fillLook: ViewStyle = header
    ? ({ ...glass, borderRadius: 22, ...(web ? { backdropFilter: "blur(36px)", WebkitBackdropFilter: "blur(36px)" } : null) } as ViewStyle)
    : { backgroundColor: card, borderRadius: 12, boxShadow: theme.scheme === "dark" ? "0 3px 8px rgba(0, 0, 0, 0.4)" : "0 3px 8px rgba(0, 0, 0, 0.14), 0 0 1px rgba(0, 0, 0, 0.12)" }
  // The screen behind it dims: black at 40% (20% at night) around a row's menu and any other, 10% behind a header menu
  const dimAlpha = header ? 0.1 : theme.scheme === "dark" ? 0.2 : 0.4
  // From a List row: the popup's fade (and the dim's) over the first 150ms of its 200, and its growth from 0.95
  const popFade = clock.interpolate({ inputRange: [0, ROW_POP.fade / ROW_POP.scale], outputRange: [0, 1], easing: ACCELERATE_DECELERATE, extrapolate: "clamp" })
  const popScale = clock.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1], easing: ROW_POP.easing })
  return (
    <Overlay open={open} onDismiss={onClose} motion="menu" testID={testID}>
      {(progress, opening) => {
        // It leaves fading as it lifts 5dp, towards the side it unrolled from; with reduced motion it only fades
        const lift = progress.interpolate({ inputRange: [0, 1], outputRange: [fromBottom ? 5 : -5, 0] })
        const shift = reduced ? null : opening ? drop : drop ? Animated.add(drop, lift) : lift
        const popIn = popping && opening && !reduced
        const opacity = reduced || !opening ? progress : popping ? popFade : 1
        return (
          <>
            {row ? (
              <RowDim row={row} fade={popIn ? popFade : progress} alpha={dimAlpha} width={window.width} height={window.height} />
            ) : (
              <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0, 0, 0, ${dimAlpha})`, opacity: progress }]} />
            )}
            <Animated.View
              ref={panel as never}
              // The panel takes the focus of a menu opened by a pointer (the web), with no ring of its own
              {...(web ? { tabIndex: -1 as const, onKeyDown: (raw: unknown) => menuKeyDown(raw, sub ? subPage.current : mainPage.current) } : null)}
              accessibilityRole="menu"
              aria-label={ariaLabel}
              style={[
                styles.surface,
                horizontal,
                {
                  top,
                  opacity,
                  // From a row it grows from its bottom end corner
                  transformOrigin: popIn ? (rtl ? "0% 100%" : "100% 100%") : undefined,
                  transform: popIn ? [{ scale: popScale }] : shift ? [{ translateY: shift }] : undefined,
                },
              ]}
            >
              {/* The panel's fill and shadow, which fade in as it unrolls; the rows fade in on their own */}
              <Animated.View pointerEvents="none" style={[styles.androidFill, fillLook, { opacity: unrolling ? reveal([0, 1]) : 1 }]} />
              <Animated.View pointerEvents={moving ? "none" : "auto"} style={[styles.android, header ? styles.androidHeaderPanel : null, { width: panelWidth, height: panelHeight }]}>
                <Animated.View
                  ref={mainPage as never}
                  {...hidden}
                  pointerEvents={sub ? "none" : "auto"}
                  style={[
                    styles.androidPageBox,
                    behind ? null : styles.gone,
                    {
                      transformOrigin: rtl ? "100% 0" : "0 0",
                      transform:
                        sub != null
                          ? [{ translateX: swipe.interpolate({ inputRange: [0, 1], outputRange: [0, -span / 2] }) }, { scale: swipe.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] }) }]
                          : drop
                            ? [{ translateY: Animated.multiply(drop, -1) }]
                            : undefined,
                    },
                  ]}
                >
                  <CascadeContext.Provider value={cascade}>
                    <AndroidPage key={openings} width={morphing ? size.width : width} minWidth={minWidth} maxWidth={maxWidth} maxHeight={maxHeight} onSize={(measured) => setSize(sameSize(measured))} style={header ? styles.androidHeaderPage : undefined}>
                      <SurfaceContext.Provider value={surface}>{children}</SurfaceContext.Provider>
                    </AndroidPage>
                  </CascadeContext.Provider>
                  {/* The menu darkens behind the submenu, up to 25% black */}
                  {sub ? <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: "#000000", opacity: swipe.interpolate({ inputRange: [0, 1], outputRange: [0, 0.25] }) }]} /> : null}
                </Animated.View>
                {sub ? (
                  // As wide as the widest page may be, so the submenu takes its own width, not the menu's
                  <Animated.View
                    ref={subPage as never}
                    {...swipeBack.responder.panHandlers}
                    pointerEvents="box-none"
                    style={[styles.androidSubPage, startEdge, { width: maxWidth, transform: [{ translateX: swipe.interpolate({ inputRange: [0, 1], outputRange: [span || window.width, 0] }) }] }]}
                  >
                    <AndroidPage width={width} minWidth={minWidth} maxWidth={maxWidth} maxHeight={maxHeight} onSize={onSubSize} style={[{ backgroundColor: background }, header ? styles.androidHeaderPage : null]}>
                      {subItems}
                    </AndroidPage>
                  </Animated.View>
                ) : null}
              </Animated.View>
            </Animated.View>
          </>
        )
      }}
    </Overlay>
  )
}

/** The space between a List row and the popup opened from it. */
const ROW_MENU_GAP = 8

/**
 * The entrance of a popup from a List row: a fade over 150ms (accelerate-decelerate) and a scale from 0.95 over 200ms
 * on an overshoot of tension 2 (Android's OvershootInterpolator(2), which peaks near 1.007).
 */
const ROW_POP = { fade: 150, scale: 200, easing: curves.overshoot(2) } as const

/**
 * Android's dim around the List row a menu opens from: black at 40% over a light screen and 20% over a dark one, the
 * row left lit to its corners (the card's, where the row meets the card's edge). It fades in with the popup over
 * 150ms and out with it.
 */
function RowDim({ row, fade, alpha, width, height }: { row: MenuRow; fade: Animated.Value | Animated.AnimatedInterpolation<number>; alpha: number; width: number; height: number }) {
  const { x, y, width: w, height: h } = row.box
  const t = Math.min(row.radius.top, h / 2, w / 2)
  const b = Math.min(row.radius.bottom, h / 2, w / 2)
  // The screen, and the row cut out of it (even-odd)
  const hole = `M${x + t} ${y}H${x + w - t}A${t} ${t} 0 0 1 ${x + w} ${y + t}V${y + h - b}A${b} ${b} 0 0 1 ${x + w - b} ${y + h}H${x + b}A${b} ${b} 0 0 1 ${x} ${y + h - b}V${y + t}A${t} ${t} 0 0 1 ${x + t} ${y}Z`
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: fade }]}>
      <Svg width={width} height={height}>
        <Path d={`M0 0H${width}V${height}H0Z${hole}`} fill="#000000" fillOpacity={alpha} fillRule="evenodd" />
      </Svg>
    </Animated.View>
  )
}

type DomItem = { getAttribute: (name: string) => string | null; focus: (options?: { preventScroll?: boolean }) => void }

/** The enabled items of a menu's panel on the web, in their order. */
function menuItems(node: unknown): DomItem[] {
  const found = (node as { querySelectorAll?: (selector: string) => ArrayLike<DomItem> } | null)?.querySelectorAll?.('[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]')
  return found ? Array.from(found).filter((item) => item.getAttribute("aria-disabled") !== "true") : []
}

/**
 * The web's keys in a menu (the WAI-ARIA menu pattern): the arrows move to the next item and stop at the ends, Home
 * and End go to the first and the last. `host` holds the items, else the element that has the handler. Select's
 * Android dialog takes it too.
 */
export function menuKeyDown(raw: unknown, host?: unknown) {
  const event = raw as { key: string; target?: unknown; currentTarget?: unknown; preventDefault: () => void }
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return
  const items = menuItems(host ?? event.currentTarget)
  if (!items.length) return
  event.preventDefault()
  const index = items.indexOf(event.target as DomItem)
  const last = items.length - 1
  const next = event.key === "Home" ? 0 : event.key === "End" ? last : event.key === "ArrowDown" ? Math.min(last, index + 1) : Math.max(0, index - 1)
  items[next].focus()
}

/** A CSS box token of one to four lengths (`10px 8px`) as its four sides. */
function cssBox(theme: Theme, name: string, fallback: [number, number, number, number]) {
  const value = theme.token(name)
  const parts = typeof value === "number" ? [value] : typeof value === "string" ? value.trim().split(/\s+/).map((part) => parseFloat(part)) : []
  const [top, right = top, bottom = top, left = right] = parts.length && !parts.some(Number.isNaN) ? parts : fallback
  return { top, right, bottom, left }
}

/**
 * Whether the web's focus on an item came from the keyboard (`:focus-visible`): a menu opened by a pointer focuses its
 * first item too, which then stays unmarked, as on Android.
 */
const focusVisible = (node: unknown) => {
  const element = node as { matches?: (selector: string) => boolean } | null
  if (!element?.matches) return false
  try {
    return element.matches(":focus-visible")
  } catch {
    return true
  }
}

/**
 * Android's check of a chosen popup item (a checkbox's check drawn bare): a 1.9dp stroke with round ends in the
 * item's text color, in a 26dp box.
 */
function PopupCheck({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 26 26">
      <Path d="M7.54 13.04 L11.5 17 L20.41 8.09" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  )
}

export type MenuItemProps = {
  children: ReactNode
  /** A symbol at the leading edge. */
  icon?: ReactNode
  description?: ReactNode
  danger?: boolean
  disabled?: boolean
  /** Shows the checkmark of a chosen option (Select, a radio item). A menu with such items keeps the checkmark's column. */
  checked?: boolean
  onSelect?: () => void
  testID?: string
}

/** What a submenu's rows add to an item: the trigger's chevron, the heading row of an open submenu, Android's Back. */
type RowExtras = {
  /** Pressed, the row does this and the menu stays open (a submenu's trigger, its heading, Back). */
  stay?: () => void
  /** The row opens a submenu: a chevron at its end. */
  opens?: boolean
  /** The row heads an open submenu (iOS): Semibold, with no checkmark column, a chevron down at its end. */
  heading?: boolean
  expanded?: boolean
  rowRef?: { current: unknown }
}

export function MenuItem(props: MenuItemProps) {
  return <MenuRow {...props} />
}
MenuItem.displayName = "Menu.Item"

function MenuRow({ children, icon, description, danger = false, disabled = false, checked, onSelect, testID, stay, opens = false, heading = false, expanded, rowRef }: MenuItemProps & RowExtras) {
  const theme = useTheme()
  const surface = useContext(SurfaceContext)
  const own = useRef<unknown>(null)
  const node = rowRef ?? own
  // An item that says `checked` in a menu of options is a radio item (a checkbox item when several can be chosen): the
  // web names it so, and a phone reads its state
  const option = surface.check && checked !== undefined && !stay
  const select = () => {
    if (disabled) return
    if (stay) return stay()
    onSelect?.()
    // An option of a multiple choice checks or unchecks itself and the menu stays open
    if (!(surface.multiple && option)) surface.close()
  }
  const semantics = {
    ...(Platform.OS === "web"
      ? { role: (option ? (surface.multiple ? "menuitemcheckbox" : "menuitemradio") : "menuitem") as "menuitem", "aria-checked": option ? !!checked : undefined }
      : { accessibilityRole: "menuitem" as const }),
    accessibilityState: { disabled, checked: option ? !!checked : undefined, expanded: opens ? !!expanded : undefined },
    ...(opens ? { "aria-haspopup": "menu" as const, "aria-expanded": !!expanded } : null),
    // React Native Web's Pressable takes Space only for a button
    ...spaceToggles(select),
  }
  const rtl = isRTL()
  // Android's press: the item's ripple from the touch point in the dialog button selector, clipped to the item and the
  // popup's corners at the first and the last; the platform's on a device, drawn here on the web
  const nativeRipple = theme.isAndroid && Platform.OS === "android"
  const ripple = useRipple(androidSelector(theme.scheme), theme.isAndroid && !nativeRipple, theme.reducedMotion)
  if (theme.isAndroid) {
    // Android's popup item: 48dp, 18 in, Regular 16 in the text color, a 24dp icon at 18 with the text 20 past it (62
    // in), a 13 gray description; red for a destructive item. A chosen option shows the bare check at the end, 18
    // after the text; a row that opens a submenu shows its arrow 8 after the text. Keyboard focus shows as the text
    // color at 12%
    const m = theme.material
    const chosen = surface.check && !!checked && !stay
    const color = danger ? dangerText(theme) : m.onSurface
    const trailCheck = surface.check && !opens && !stay
    return (
      <CascadeRow>
        <Pressable
          {...semantics}
          ref={node as never}
          disabled={disabled}
          onPress={select}
          onPressIn={nativeRipple ? undefined : ripple.start}
          onPressOut={nativeRipple ? undefined : ripple.end}
          android_ripple={nativeRipple ? { color: androidSelector(theme.scheme), foreground: true } : undefined}
          testID={testID}
          // The web's keyboard focus shows as a layer (React Native Web passes `focused`), in place of the browser's
          // square ring, which the popup's round corners would cut
          style={(state) => [
            styles.androidItem,
            { opacity: disabled ? 0.5 : 1 },
            (state as { focused?: boolean }).focused && focusVisible(node.current) ? { backgroundColor: withAlpha(color, 0.12) } : null,
          ]}
        >
          {ripple.layer}
          {icon ? (
            <View style={[styles.androidIcon, mirrored(rtl && stay != null && !opens)]}>
              <IconDefaultsProvider size={24} color={color}>
                {icon}
              </IconDefaultsProvider>
            </View>
          ) : null}
          <View style={styles.text}>
            <Text color={color} numberOfLines={1} style={{ fontSize: 16, lineHeight: 20 }}>
              {children}
            </Text>
            {description != null ? (
              // The secondary text gray of the Android look
              <Text color={theme.colors.labelSecondary} style={{ fontSize: 13, lineHeight: 16 }}>
                {description}
              </Text>
            ) : null}
          </View>
          {opens ? (
            <View style={[styles.androidArrow, mirrored(rtl)]}>
              <ChevronRightMd size={24} color={color} />
            </View>
          ) : trailCheck ? (
            <View style={styles.androidTrailCheck}>{chosen ? <PopupCheck color={color} /> : null}</View>
          ) : null}
        </Pressable>
      </CascadeRow>
    )
  }
  const color = disabled ? theme.color("--menu-disabled-label-color") : danger ? theme.color("--color-text-danger") : theme.colors.text
  const inner = theme.length("--menu-radius", 34) - theme.length("--menu-gutter", 10)
  const padding = cssBox(theme, "--menu-item-padding", [10, 8, 10, 6])
  const gap = theme.length("--menu-item-gap", 6)
  // The row's content keeps the panel's inline padding, its press the gutter (the web's capsule reaches 6 past the row)
  const inline = inlineExtra(theme)
  const checkColumn = surface.check && !heading
  const iconSize = theme.length("--menu-leading-icon-size", 20)
  const chevron = theme.length("--menu-check-size", 18)
  return (
    <Pressable
      {...semantics}
      ref={node as never}
      disabled={disabled}
      onPress={select}
      testID={testID}
      style={({ pressed }) => [
        styles.iosItem,
        {
          minHeight: theme.length("--menu-row-min-height", 42),
          borderRadius: inner,
          gap,
          paddingTop: padding.top,
          paddingBottom: padding.bottom,
          paddingStart: padding.left + inline,
          paddingEnd: padding.right + inline,
        },
        pressed ? { backgroundColor: theme.color("--menu-press-background") } : null,
      ]}
    >
      {checkColumn ? (
        <View style={[styles.check, { width: theme.length("--menu-check-column", 13), marginEnd: theme.length("--menu-check-gap", 8.5) - gap }]}>
          {checked && !stay ? <CheckMd size={chevron} color={color} /> : null}
        </View>
      ) : null}
      {icon ? (
        // In a menu with a selection the symbol stands 2 past the label line and its label 14 after it; in one
        // without, it is centred in a 36 column and its label 8 after it (touch.css)
        <View
          style={
            checkColumn
              ? { width: iconSize, alignItems: "center", marginStart: theme.length("--menu-check-icon-offset", 2), marginEnd: theme.length("--menu-check-icon-gap", 14) - gap }
              : { width: theme.length("--menu-leading-icon-slot", 36), alignItems: "center", marginEnd: theme.length("--menu-leading-icon-gap", 8) - gap }
          }
        >
          <IconDefaultsProvider size={iconSize} color={color}>
            {icon}
          </IconDefaultsProvider>
        </View>
      ) : null}
      {/* The label and its description 2 apart (the web's ItemLeading) */}
      <View style={[styles.text, { gap: 2 }]}>
        <Text color={color} weight={heading ? "semibold" : undefined} style={{ fontSize: theme.length("--menu-font-size", 17), lineHeight: theme.length("--menu-line-height", 20) }}>
          {children}
        </Text>
        {description != null ? (
          <Text
            color={disabled ? theme.color("--menu-disabled-description-color") : theme.color("--menu-description-color")}
            style={{ fontSize: theme.length("--menu-description-font-size", 13), lineHeight: theme.length("--menu-description-line-height", 18) }}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {opens || heading ? (
        // The chevron of a submenu in the label's color, 18 across and 2 past the row's end: forward on its trigger,
        // down on the heading of the open one
        <View style={[styles.chevron, { width: chevron, height: chevron }, opens ? mirrored(rtl) : null]}>
          {heading ? <ChevronDown size={chevron} color={color} /> : <ChevronRightMd size={chevron} color={color} />}
        </View>
      ) : null}
    </Pressable>
  )
}

/** How far a phone menu's rows stand in from its gutter: `--menu-padding-inline` (16) less `--menu-gutter` (10). */
const inlineExtra = (theme: Theme) => theme.length("--menu-padding-inline", 16) - theme.length("--menu-gutter", 10)

/** The heading of a submenu stays and its items scroll; the menu's own items are a submenu's `items`. */
/** An open submenu; `owner` is the row that opened it, the only one whose items it follows. */
type OpenSub = { label: ReactNode; items: ReactNode; backLabel: string; y: number; owner?: object }

export type MenuSubContentProps = {
  /** The submenu's items: Menu.Item, Menu.Separator, Menu.Label. */
  children: ReactNode
  /** The row that goes back to the menu on Android, as the popup heads a submenu there. @default "Back" */
  backLabel?: string
}

const SubContext = createContext<MenuSubContentProps | null>(null)

/**
 * A submenu: a `Menu.SubTrigger` row and its `Menu.SubContent`. On iOS, as iOS 26 and the web's phone menu, the
 * submenu opens over the menu at its row, headed by that row in Semibold with a chevron down (a press on it, or on the
 * menu behind, goes back), while the menu steps back (0.968 of its size, its rows at half strength). On Android, as
 * a page of its popup, the submenu slides in from the end over 300ms, headed by Back and an 8dp
 * band, while the menu moves back under a dim and the popup takes the submenu's size; Back, a drag towards the end or
 * a flick goes back. Choosing an item closes the whole menu.
 */
function MenuSub({ children }: { children: ReactNode }) {
  const parts = Children.toArray(children)
  const found = parts.find((child): child is ReactElement<MenuSubContentProps> => isValidElement(child) && child.type === MenuSubContent)
  return <SubContext.Provider value={found ? found.props : null}>{parts.filter((child) => child !== found)}</SubContext.Provider>
}
MenuSub.displayName = "Menu.Sub"

export type MenuSubTriggerProps = Pick<MenuItemProps, "children" | "icon" | "disabled" | "testID">

/** The row that opens a submenu: the item's look with a chevron at its end. */
function MenuSubTrigger({ children, icon, disabled, testID }: MenuSubTriggerProps) {
  const sub = useContext(SubContext)
  const surface = useContext(SurfaceContext)
  const row = useRef<unknown>(null)
  const open = () => {
    if (!sub) return
    measure(row.current as Measurable | null, (box) => surface.openSub?.({ label: children, items: sub.children, backLabel: sub.backLabel ?? "Back", y: box.y, owner: row }))
  }
  // The submenu this row opened follows the app's state while it shows (a multiple choice keeps it open)
  const items = sub?.children
  const { subOpen, refreshSub } = surface
  useEffect(() => {
    if (subOpen) refreshSub?.(row, items)
  }, [items, subOpen, refreshSub])
  return (
    <MenuRow icon={icon} disabled={disabled} testID={testID} rowRef={row} stay={open} opens expanded={surface.subOpen}>
      {children}
    </MenuRow>
  )
}
MenuSubTrigger.displayName = "Menu.SubTrigger"

/** The items of a submenu; they show in the menu's panel once its trigger is pressed. */
const MenuSubContent: ((props: MenuSubContentProps) => null) & { displayName?: string } = () => null
MenuSubContent.displayName = "Menu.SubContent"

export function MenuSeparator() {
  const theme = useTheme()
  const surface = useContext(SurfaceContext)
  // Android parts a popup's groups with an 8dp band: a light gray (#F5F5F5, #262626 at night) in a row's menu, the text
  // at 6% in a header menu
  if (theme.isAndroid)
    return (
      <CascadeRow>
        <View style={[styles.androidSeparator, { backgroundColor: androidGray(theme, surface.header ? "menuBand" : "popupGap") }]} />
      </CascadeRow>
    )
  // The phone layer's separator: 1 tall in `--menu-separator-background-color`, `--menu-separator-gutter` around it
  const gutter = cssBox(theme, "--menu-separator-gutter", [10, 8, 10, 8])
  return (
    <View
      style={{
        height: 1,
        marginTop: gutter.top,
        marginBottom: gutter.bottom,
        marginStart: gutter.left + inlineExtra(theme),
        marginEnd: gutter.right + inlineExtra(theme),
        backgroundColor: theme.color("--menu-separator-background-color"),
      }}
    />
  )
}
MenuSeparator.displayName = "Menu.Separator"

/** A heading over a group of items. */
export function MenuLabel({ children }: { children: ReactNode }) {
  const theme = useTheme()
  const surface = useContext(SurfaceContext)
  if (theme.isAndroid) {
    // Android's text in a popup: the dialog's text color, 13 from the sides and 8 above and under it
    return (
      <CascadeRow>
        <View style={styles.androidLabel}>
          <Text color={theme.material.onSurface} style={{ fontSize: 13, lineHeight: 16 }}>
            {children}
          </Text>
        </View>
      </CascadeRow>
    )
  }
  const padding = cssBox(theme, "--menu-label-padding", [4, 8, 10, 8])
  // In a menu with a checkmark column the title starts at the labels' column, as the web's (`--menu-check-label-inset`)
  const start = surface.check ? theme.length("--menu-check-label-inset", 27.5) : padding.left
  return (
    <Text
      // The web's MenuLabel: the tertiary text color
      color={theme.colors.textTertiary}
      weight="medium"
      style={{
        fontSize: theme.length("--menu-label-font-size", 13),
        lineHeight: theme.length("--menu-label-line-height", 15),
        paddingTop: padding.top,
        paddingBottom: padding.bottom,
        paddingStart: start + inlineExtra(theme),
        paddingEnd: padding.right + inlineExtra(theme),
      }}
    >
      {children}
    </Text>
  )
}
MenuLabel.displayName = "Menu.Label"

export const Menu = Object.assign(MenuRoot, {
  Trigger: MenuTrigger,
  Content: MenuContent,
  Item: MenuItem,
  Separator: MenuSeparator,
  Label: MenuLabel,
  Sub: MenuSub,
  SubTrigger: MenuSubTrigger,
  SubContent: MenuSubContent,
})

const styles = StyleSheet.create({
  preview: { position: "absolute", overflow: "hidden" },
  trigger: { alignSelf: "flex-start" },
  surface: { position: "absolute", outlineWidth: 0, outlineStyle: "none" as "solid" },
  shrink: { flexShrink: 1 },
  scroll: { flexGrow: 0 },
  // Android's popup: 12dp corners, the items flush with its edges, a soft shadow
  android: { borderRadius: 12, overflow: "hidden" },
  androidFill: { position: "absolute", top: 0, bottom: 0, start: 0, end: 0 },
  // A header menu: 22dp corners, 5 above and under its rows
  androidHeaderPanel: { borderRadius: 22 },
  androidHeaderPage: { paddingVertical: 5 },
  // A page keeps its own size while the popup's changes around it
  androidPageBox: { alignSelf: "flex-start", flexShrink: 0 },
  androidPage: { flexShrink: 0, flexGrow: 0 },
  androidSubPage: { position: "absolute", top: 0, alignItems: "flex-start" },
  gone: { opacity: 0 },
  androidItem: { minHeight: 48, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 6, outlineWidth: 0, outlineStyle: "none" as "solid" },
  // The 24dp icon at 18, the text 20 after it (62 in)
  androidIcon: { width: 24, marginEnd: 20, alignItems: "center" },
  // A chosen option's check at the end: a 24dp column 18 after the text (the 26 glyph box centered on it)
  androidTrailCheck: { width: 24, marginStart: 18, alignItems: "center", justifyContent: "center" },
  // The submenu arrow: 24dp at the end, the text 8 before it
  androidArrow: { width: 24, marginStart: 8, alignItems: "center" },
  androidSeparator: { height: 8 },
  androidLabel: { paddingHorizontal: 13, paddingVertical: 8 },
  iosItem: { flexDirection: "row", alignItems: "center", borderCurve: "continuous" },
  // The check column (13), 8.5 before the label (6 of the row gap and 2.5): the label stands 27.5 in, as `--menu-check-label-inset`
  check: { alignItems: "center", overflow: "visible" },
  // 2 past the row's end, as the web's SubTriggerIcon
  chevron: { alignItems: "center", justifyContent: "center", marginEnd: -2 },
  // Grows and shrinks from its own width (not `flex: 1`, whose zero basis gives an Android menu sized by its items no width)
  text: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
})
