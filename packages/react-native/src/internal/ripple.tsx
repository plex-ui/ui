import { useRef, useState, type ComponentRef, type ReactNode } from "react"
import { Animated, Easing, Platform, StyleSheet, View, type GestureResponderEvent, type StyleProp, type ViewStyle } from "react-native"

/** Android's RippleForeground: the wave grows and slides to the middle over 225ms on Material's standard curve. */
const ENTER = 225
/** It fades in over 75ms, shows at least 225ms in all, and fades out over 150ms once let go. */
const FADE_IN = 75
const HOLD = FADE_IN + 150
const FADE_OUT = 150
const STANDARD = Easing.bezier(0.4, 0, 0.2, 1)

type Wave = { key: number; x: number; y: number; width: number; height: number }

export type Ripple = {
  /** Starts a wave at the event's touch point (the middle when it has none, as a key's press). */
  start: (event?: GestureResponderEvent) => void
  /** Lets the wave go: it fades once it has shown its 225ms. */
  end: () => void
  /** The wave's layer: first inside the view that takes the press, which clips it to its corners. */
  layer: ReactNode
}

/**
 * Android's ripple where the platform draws none: the web's Android look, and a List row held through the control at
 * its end. A wave starts at the touch point, 60% of the view's larger side across, and grows to cover the view as its
 * centre slides to the view's middle, as Android's bounded ripple does; no scale and no flat layer. `clip` places and
 * sizes the layer (the 40dp circle of a bar's borderless icon); by default it fills the view.
 */
export function useRipple(color: string, enabled: boolean, reduced: boolean, clip?: StyleProp<ViewStyle>): Ripple {
  const node = useRef<ComponentRef<typeof View> | null>(null)
  const [wave, setWave] = useState<Wave | null>(null)
  const [grow] = useState(() => new Animated.Value(0))
  const [shown] = useState(() => new Animated.Value(0))
  const [gone] = useState(() => new Animated.Value(0))
  const count = useRef(0)
  // The wave on screen, and whether the finger is still down
  const live = useRef<number | null>(null)
  const down = useRef(false)
  const started = useRef(0)
  const end = () => {
    down.current = false
    const key = live.current
    if (key == null) return
    live.current = null
    const clear = () => setWave((current) => (current?.key === key ? null : current))
    if (reduced) return clear()
    const delay = Math.max(0, HOLD - (Date.now() - started.current))
    Animated.timing(gone, { toValue: 1, duration: FADE_OUT, delay, easing: Easing.linear, useNativeDriver: false }).start(({ finished }) => {
      if (finished) clear()
    })
  }
  const start = (event?: GestureResponderEvent) => {
    if (!enabled) return
    const touch = event?.nativeEvent as { pageX?: number; pageY?: number } | undefined
    const pageX = typeof touch?.pageX === "number" && Number.isFinite(touch.pageX) ? touch.pageX : null
    const pageY = typeof touch?.pageY === "number" && Number.isFinite(touch.pageY) ? touch.pageY : null
    const key = ++count.current
    down.current = true
    const begin = (left: number, top: number, width: number, height: number) => {
      if (key !== count.current || !width || !height) return
      const x = pageX == null ? width / 2 : pageX - left
      const y = pageY == null ? height / 2 : pageY - top
      live.current = key
      started.current = Date.now()
      setWave({ key, x, y, width, height })
      grow.stopAnimation()
      shown.stopAnimation()
      gone.stopAnimation()
      gone.setValue(0)
      if (reduced) {
        grow.setValue(1)
        shown.setValue(1)
      } else {
        grow.setValue(0)
        shown.setValue(0)
        Animated.parallel([
          Animated.timing(grow, { toValue: 1, duration: ENTER, easing: STANDARD, useNativeDriver: false }),
          Animated.timing(shown, { toValue: 1, duration: FADE_IN, easing: Easing.linear, useNativeDriver: false }),
        ]).start()
      }
      // Let go before the view was measured
      if (!down.current) end()
    }
    if (Platform.OS === "web") {
      // The page's measure of the element, in the same frame as the event's page point
      const element = node.current as unknown as { getBoundingClientRect?: () => { left: number; top: number; width: number; height: number } } | null
      const rect = element?.getBoundingClientRect?.()
      if (!rect) return
      const scroll = globalThis as unknown as { scrollX?: number; scrollY?: number }
      begin(rect.left + (scroll.scrollX ?? 0), rect.top + (scroll.scrollY ?? 0), rect.width, rect.height)
      return
    }
    node.current?.measure((_x, _y, width, height, left, top) => begin(left, top, width, height))
  }
  let drawn: ReactNode = null
  if (wave) {
    const { x, y, width, height } = wave
    // The radius that covers the view from its middle, and the wave's first: 30% of the larger side
    const radius = Math.hypot(width, height) / 2
    const first = Math.min(1, (Math.max(width, height) * 0.3) / radius)
    drawn = (
      <Animated.View
        style={{
          position: "absolute",
          left: width / 2 - radius,
          top: height / 2 - radius,
          width: radius * 2,
          height: radius * 2,
          borderRadius: radius,
          backgroundColor: color,
          opacity: Animated.multiply(shown, Animated.subtract(1, gone)),
          transform: [
            { translateX: grow.interpolate({ inputRange: [0, 1], outputRange: [x - width / 2, 0] }) },
            { translateY: grow.interpolate({ inputRange: [0, 1], outputRange: [y - height / 2, 0] }) },
            { scale: grow.interpolate({ inputRange: [0, 1], outputRange: [first, 1] }) },
          ],
        }}
      />
    )
  }
  const layer = enabled ? (
    <View ref={node} pointerEvents="none" collapsable={false} style={[clip ? styles.placed : StyleSheet.absoluteFill, styles.clip, clip]}>
      {drawn}
    </View>
  ) : null
  return { start, end, layer }
}

const styles = StyleSheet.create({
  clip: { overflow: "hidden" },
  placed: { position: "absolute" },
})
