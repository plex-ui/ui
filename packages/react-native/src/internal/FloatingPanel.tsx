import { useEffect, useState, type ReactNode } from "react"
import { Animated, Easing, I18nManager, Platform, useWindowDimensions, type Role, type StyleProp, type ViewStyle } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { MenuAnchor } from "../components/Menu/Menu"
import { useTheme } from "../theme/ThemeProvider"
import { floatingOrigin, placeFloating, type FloatingAlign, type FloatingSide } from "./floating"
import { curves } from "./motion"
import { ACCELERATE_DECELERATE, canTransformGlass, glassOpacity, Overlay } from "./Overlay"

export type CollisionPadding = number | Partial<Record<"top" | "right" | "bottom" | "left", number>>

export type FloatingPlacement = { side: FloatingSide; arrow: number; size: { width: number; height: number } | null }

export type FloatingPanelProps = {
  open: boolean
  onDismiss: () => void
  /** The trigger's box in the window (`measure`); the middle of the screen until it is measured. */
  anchor: MenuAnchor | null
  side?: FloatingSide
  align?: FloatingAlign
  sideOffset?: number
  alignOffset?: number
  /** Kept free at the window's edges, the safe area at least; an object leaves 0 at a side it does not name. */
  collisionPadding?: CollisionPadding
  /** Turns to the other side when it does not fit. @default true */
  avoidCollisions?: boolean
  /** An arrow's length and the room it keeps from the panel's corners. */
  arrow?: { width: number; padding: number }
  /** The panel's glass appears at once and fades only as it leaves (`glassOpacity`). */
  glass?: boolean
  /**
   * `popup`: it grows from 0.95 (Android's pop on its own clock); `tooltip`: a tooltip's entrance, a fade on iOS (the
   * web's 120ms on `--cubic-enter`, gone at once) and Material's on Android (a fade as it grows from 0.8 over 150ms
   * on LinearOutSlowIn, a fade out over 75). @default "popup"
   */
  motion?: "popup" | "tooltip"
  /** Touches go through the panel to the overlay under it, which closes it (a tooltip's text). */
  passThrough?: boolean
  /** The panel takes the first focus on the web. @default true */
  autoFocus?: boolean
  role?: Role
  "aria-label"?: string
  "aria-labelledby"?: string
  testID?: string
  /** The panel's size limits (its width and min and max width). */
  style?: StyleProp<ViewStyle>
  /** Moves the panel along its own axis, as a shake. */
  translateX?: Animated.Value | Animated.AnimatedInterpolation<number>
  children: (placement: FloatingPlacement) => ReactNode
}

/** The collision padding of each side, as Radix reads it: a number for all four, an object's missing sides 0. */
export function paddingOf(padding: CollisionPadding = 0) {
  if (typeof padding === "number") return { top: padding, right: padding, bottom: padding, left: padding }
  return { top: padding.top ?? 0, right: padding.right ?? 0, bottom: padding.bottom ?? 0, left: padding.left ?? 0 }
}

/**
 * A panel at its trigger, over the app in the overlay layer (a transparent Modal: a tap outside, Android's back and
 * the web's Escape close it). It is measured off the screen first, then placed on its side of the trigger (turned
 * when it does not fit, moved along to stay inside the window and the safe area), as Radix Popper places the web's
 * popovers. It grows from the trigger's side: on iOS from 0.95 as it fades in on the overlay's time (`--motion-enter`
 * on `--cubic-enter`), as the web's phone popover; on Android as a popup in the Plex Android look, a fade over 150ms
 * (accelerate-decelerate) as it grows from 0.95 over 200 on an overshoot of tension 2. With reduced motion it only
 * fades.
 */
export function FloatingPanel({
  open,
  onDismiss,
  anchor,
  side = "bottom",
  align = "center",
  sideOffset = 0,
  alignOffset = 0,
  collisionPadding = 0,
  avoidCollisions = true,
  arrow,
  glass = false,
  motion = "popup",
  passThrough = false,
  autoFocus = true,
  role,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  testID,
  style,
  translateX,
  children,
}: FloatingPanelProps) {
  const theme = useTheme()
  const window = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const reduced = theme.reducedMotion
  const android = theme.isAndroid
  const tooltip = motion === "tooltip"
  // Unknown until the panel's first layout, off the screen: a guess would show it jump or turn
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)
  const [wasOpen, setWasOpen] = useState(open)
  // Android's popup runs on its own clock from the moment it is placed
  const [clock] = useState(() => new Animated.Value(0))
  if (wasOpen !== open) {
    setWasOpen(open)
    if (open) {
      setSize(null)
      clock.setValue(0)
    }
  }
  const placed = size != null
  useEffect(() => {
    if (!android || tooltip || !open || !placed || reduced) return
    clock.setValue(0)
    const animation = Animated.timing(clock, { toValue: 1, duration: POP.scale, easing: Easing.linear, useNativeDriver: false })
    animation.start()
    return () => animation.stop()
    // Once for each opening, as the panel is placed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [android, tooltip, open, placed])
  const pad = paddingOf(collisionPadding)
  const padding = {
    top: Math.max(pad.top, insets.top),
    bottom: Math.max(pad.bottom, insets.bottom),
    left: Math.max(pad.left, insets.left),
    right: Math.max(pad.right, insets.right),
  }
  const box = anchor ?? { x: window.width / 2, y: window.height / 2, width: 0, height: 0 }
  const place = size ? placeFloating({ anchor: box, size, window, side, align, sideOffset, alignOffset, padding, flip: avoidCollisions, arrow }) : null
  const top = place ? place.top : -window.height - 1000
  const left = place?.left ?? 0
  // The measures are from the screen's left; a phone in a right-to-left layout reads `left` as the start edge
  const swapped = Platform.OS !== "web" && I18nManager.isRTL && I18nManager.doLeftAndRightSwapInRTL
  const horizontal = swapped ? { right: left } : { left }
  const placement: FloatingPlacement = { side: place?.side ?? side, arrow: place?.arrow ?? 0, size }
  const origin = size ? floatingOrigin(placement.side, placement.arrow, size) : undefined
  const popFade = clock.interpolate({ inputRange: [0, POP.fade / POP.scale], outputRange: [0, 1], easing: ACCELERATE_DECELERATE, extrapolate: "clamp" })
  const popScale = clock.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1], easing: POP.easing })
  return (
    <Overlay
      open={open}
      onDismiss={onDismiss}
      motion="menu"
      enter={tooltip ? (android ? TOOLTIP.androidEnter : theme.duration("--transition-duration-basic", TOOLTIP.enter)) : undefined}
      exit={tooltip ? (android ? TOOLTIP.androidExit : 0) : undefined}
      testID={testID}
    >
      {(progress, opening, focus) => {
        // Android: the pop on its clock as it opens, a fade as it leaves; iOS: the overlay's progress, glass at once
        const opacity = reduced || !opening || tooltip ? progress : android ? popFade : glass ? glassOpacity(progress, opening) : progress
        const scaleBy = reduced
          ? null
          : tooltip
            ? android
              ? progress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] })
              : null
            : android
              ? opening
                ? popScale
                : null
              : glass && !canTransformGlass
                ? null
                : progress.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] })
        const transform: ViewStyle["transform"] = [
          ...(translateX ? [{ translateX: translateX as unknown as number }] : []),
          ...(scaleBy ? [{ scale: scaleBy as unknown as number }] : []),
        ]
        return (
          <Animated.View
            {...(autoFocus ? focus : null)}
            pointerEvents={passThrough ? "none" : "auto"}
            role={role}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout
              if (!size || size.width !== width || size.height !== height) setSize({ width, height })
            }}
            style={[
              { position: "absolute", top },
              horizontal,
              style,
              { opacity: place ? opacity : 0, transformOrigin: origin, transform: transform.length ? transform : undefined },
              autoFocus ? focus.style : null,
            ]}
          >
            {children(placement)}
          </Animated.View>
        )
      }}
    </Overlay>
  )
}

/** A tooltip's times: the web's `--transition-duration-basic` fade; Material's tooltip fade in and out (150, 75). */
const TOOLTIP = { enter: 120, androidEnter: 150, androidExit: 75 } as const

/**
 * Android's popup entrance in the Plex Android look: a fade over 150ms (accelerate-decelerate) and a scale from 0.95
 * over 200 on an overshoot of tension 2 (OvershootInterpolator(2)), as its message popups pop in.
 */
const POP = { fade: 150, scale: 200, easing: curves.overshoot(2) } as const
