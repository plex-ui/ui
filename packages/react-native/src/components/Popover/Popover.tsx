import { cloneElement, createContext, isValidElement, useCallback, useContext, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react"
import { Animated, Easing, StyleSheet, View, useWindowDimensions, type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { FloatingPanel, paddingOf, type CollisionPadding } from "../../internal/FloatingPanel"
import { anchorProps, type FloatingAlign, type FloatingSide } from "../../internal/floating"
import { Glass } from "../../internal/Glass"
import { barSurface, elevationShadow } from "../../theme/material"
import { useTheme } from "../../theme/ThemeProvider"
import { useMenuAnchor, type Measurable, type MenuAnchor } from "../Menu/Menu"

export type PopoverProps = {
  children: ReactNode
  /** Controlled open state; uncontrolled when omitted. */
  open?: boolean
  /** Called when the popover opens or closes. */
  onOpenChange?: (open: boolean) => void
}

type PopoverContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  anchor: MenuAnchor | null
  setTrigger: (node: Measurable | null) => void
  place: () => void
}
const PopoverContext = createContext<PopoverContextValue | null>(null)

export type PopoverController = {
  /** Closes the popover. */
  close: () => void
  /** Shakes the panel side to side, as a form that cannot be sent yet. */
  shake: () => void
}
const ControllerContext = createContext<PopoverController | null>(null)

/**
 * A floating panel for contextual UI at its trigger, as @plexui/ui's Popover on a phone: a tap on the trigger opens it,
 * a tap anywhere else closes it. On iOS it is the compact glass panel an iPhone presents a popover as (the menus'
 * glass, `--popover-radius` 34, `--menu-shadow`), placed under its trigger and centered by default; on Android a
 * popup of the Plex Android look (its surface, 12dp corners, level 2 shadow) that pops from the trigger. Parts:
 * `Popover.Trigger` and `Popover.Content`; `usePopoverController()` inside the content closes or shakes it.
 */
export function Popover({ children, open: openProp, onOpenChange }: PopoverProps) {
  const [own, setOwn] = useState(false)
  const open = openProp ?? own
  const { anchor, place, setTrigger } = useMenuAnchor(open)
  const setOpen = useCallback(
    (next: boolean) => {
      const apply = () => {
        if (openProp === undefined) setOwn(next)
        onOpenChange?.(next)
      }
      // The trigger is measured before the panel opens at it
      if (next) place(apply)
      else apply()
    },
    [openProp, onOpenChange, place],
  )
  const value = useMemo(() => ({ open, setOpen, anchor, setTrigger, place: () => place() }), [open, setOpen, anchor, setTrigger, place])
  return <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>
}
Popover.displayName = "Popover"

function usePopover(part: string) {
  const context = useContext(PopoverContext)
  if (!context) throw new Error(`${part} must be inside a Popover`)
  return context
}

type TriggerChildProps = { onPress?: (event: GestureResponderEvent) => void; ref?: unknown; onLayout?: (event: never) => void }

export type PopoverTriggerProps = {
  /**
   * The element that toggles the popover: a Button or anything with `onPress` that hands its native view to `ref`
   * (Pressable, View, Text). It keeps its own place in the layout; the panel stands at it.
   */
  children: ReactElement<TriggerChildProps>
}

/** The element that toggles the popover; the panel opens at it, and follows it when it moves. */
function PopoverTrigger({ children }: PopoverTriggerProps) {
  const { open, setOpen, setTrigger, place } = usePopover("Popover.Trigger")
  if (!isValidElement(children)) return children
  const { onPress } = children.props
  return cloneElement(children, {
    ...anchorProps(children.props, setTrigger as never, open ? place : undefined),
    onPress: (event: GestureResponderEvent) => {
      onPress?.(event)
      setOpen(!open)
    },
    "aria-haspopup": "dialog",
    "aria-expanded": open,
  } as Record<string, unknown>)
}
PopoverTrigger.displayName = "Popover.Trigger"

export type PopoverContentProps = {
  children: ReactNode
  /** The panel's width; `"auto"` fits its content between `minWidth` and `maxWidth`. @default "auto" */
  width?: number | "auto"
  /** @default 300 */
  minWidth?: number | "auto"
  /** Capped by the room inside the window. @default 700 */
  maxWidth?: number
  /** The side of the trigger; it turns when it does not fit. @default "bottom" */
  side?: FloatingSide
  /** @default "center" */
  align?: FloatingAlign
  /** From the trigger's edge, negative to overlap it. @default 8 */
  sideOffset?: number
  /** From the start or end alignment. @default -5 for `start` and `end`, 0 for `center` */
  alignOffset?: number
  /** Turns and moves to stay inside the window. @default true */
  avoidCollisions?: boolean
  /** Kept free at the window's edges (the safe area at least); an object leaves 0 at a side it does not name. @default 20 */
  collisionPadding?: CollisionPadding
  /** A translucent, blurred surface (a light frosted gradient) in place of the glass, with its own shadow. iOS and the web. @default false */
  translucent?: boolean
  /** Moves focus to the panel as it opens (the web). @default true */
  autoFocus?: boolean
  /** The id of the element that names the panel (the web). */
  "aria-labelledby"?: string
  "aria-label"?: string
  testID?: string
  /** The panel's own style (padding, a fixed height). */
  style?: StyleProp<ViewStyle>
}

/** The panel: on iOS the glass of an iPhone popover, on Android the popup surface of the Plex Android look. */
function PopoverContent({
  children,
  width = "auto",
  minWidth = 300,
  maxWidth = 700,
  side = "bottom",
  align = "center",
  sideOffset = 8,
  alignOffset,
  avoidCollisions = true,
  collisionPadding = 20,
  translucent = false,
  autoFocus = true,
  "aria-labelledby": ariaLabelledBy,
  "aria-label": ariaLabel,
  testID,
  style,
}: PopoverContentProps) {
  const theme = useTheme()
  const popover = usePopover("Popover.Content")
  const window = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const [shakeX] = useState(() => new Animated.Value(0))
  const shaking = useRef<Animated.CompositeAnimation | null>(null)
  const close = useCallback(() => popover.setOpen(false), [popover])
  const shake = useCallback(() => {
    shaking.current?.stop()
    shakeX.setValue(0)
    // With reduced motion the panel stays still
    if (theme.reducedMotion) return
    // The web's keyframes: 5 to each side twice over 400ms on `ease`
    shaking.current = Animated.timing(shakeX, { toValue: 1, duration: 400, easing: Easing.ease, useNativeDriver: false })
    shaking.current.start()
  }, [shakeX, theme.reducedMotion])
  const controller = useMemo(() => ({ close, shake }), [close, shake])
  const translateX = shakeX.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: [0, -5, 5, -5, 5, 0] })
  const pad = paddingOf(collisionPadding)
  // The room across the window, as Radix's available width caps `maxWidth`
  const available = window.width - Math.max(pad.left, insets.left) - Math.max(pad.right, insets.right)
  const sizing: ViewStyle = {
    width: width === "auto" ? undefined : Math.min(width, available),
    minWidth: minWidth === "auto" ? undefined : Math.min(minWidth, available),
    maxWidth: Math.min(maxWidth, available),
    maxHeight: window.height - Math.max(pad.top, insets.top) - Math.max(pad.bottom, insets.bottom),
  }
  const android = theme.isAndroid
  const radius = android ? ANDROID_RADIUS : theme.length("--popover-radius", 34)
  const content = <ControllerContext.Provider value={controller}>{children}</ControllerContext.Provider>
  const glass = !android && !translucent
  return (
    <FloatingPanel
      open={popover.open}
      onDismiss={close}
      anchor={popover.anchor}
      side={side}
      align={align}
      sideOffset={sideOffset}
      alignOffset={alignOffset ?? (align === "center" ? 0 : -5)}
      avoidCollisions={avoidCollisions}
      collisionPadding={collisionPadding}
      glass={glass}
      autoFocus={autoFocus}
      role="dialog"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      testID={testID}
      style={sizing}
      translateX={translateX}
    >
      {() =>
        android ? (
          // Material has no translucent surface: the popup's own
          <View style={[styles.surface, { borderRadius: radius, backgroundColor: barSurface(theme.material, theme.scheme), boxShadow: elevationShadow.level2 }, style]}>
            {content}
          </View>
        ) : translucent ? (
          <TranslucentSurface radius={radius} style={style}>
            {content}
          </TranslucentSurface>
        ) : (
          <Glass
            radius={radius}
            elevation="raised"
            fillToken="--popover-mobile-background"
            filterToken="--popover-mobile-backdrop-filter"
            shadowToken="--menu-shadow"
            style={[styles.surface, style]}
          >
            {content}
          </Glass>
        )
      }
    </FloatingPanel>
  )
}
PopoverContent.displayName = "Popover.Content"

/**
 * The translucent panel, kept on a phone as on the web: a frosted gradient (light gray from half to whole up the
 * panel, a blue-gray at night) over a 16px blur, with the desktop panel's shadow and hairline.
 */
function TranslucentSurface({ radius, style, children }: { radius: number; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const theme = useTheme()
  const dark = theme.scheme === "dark"
  const gradient = dark
    ? "linear-gradient(360deg, rgba(86, 88, 105, 0.25) 0%, rgba(86, 88, 105, 0.49) 100%)"
    : "linear-gradient(360deg, rgba(247, 247, 248, 0.5) 0%, rgba(247, 247, 248, 1) 100%)"
  const shadow = [theme.token("--shadow"), theme.token("--shadow-hairline")].filter((part) => typeof part === "string").join(", ")
  return (
    <Glass radius={radius} blur={16} tint="transparent" style={[styles.surface, { boxShadow: shadow }, style]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, borderCurve: "continuous", backgroundImage: gradient } as ViewStyle]} />
      {children}
    </Glass>
  )
}

/** `close()` and `shake()` of the popover around: for the content of `Popover.Content`. */
export function usePopoverController(): PopoverController {
  const controller = useContext(ControllerContext)
  if (!controller) throw new Error("usePopoverController must be inside Popover.Content")
  return controller
}

/** The corner of Android's popups in the Plex Android look. */
const ANDROID_RADIUS = 12

const styles = StyleSheet.create({
  surface: { borderCurve: "continuous" },
})

Popover.Trigger = PopoverTrigger
Popover.Content = PopoverContent
