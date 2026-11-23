import { useEffect, useLayoutEffect, useState } from "react"
import { Animated, Easing, Platform, type EasingFunction } from "react-native"

/** Transforms and opacity run on the native driver on a phone; react-native-web has none. */
export const nativeDriver = Platform.OS !== "web"

/** CSS's `ease`, the default curve of a CSS transition and of each keyframe of a CSS animation. */
export const cssEase = Easing.bezier(0.25, 0.1, 0.25, 1)

const beziers = new Map<string, EasingFunction>()

/** A `cubic-bezier()` value (a motion token) as an easing; CSS's named curves too. Anything else is `fallback`. */
export function cssEasing(value: unknown, fallback: EasingFunction = cssEase): EasingFunction {
  if (typeof value !== "string") return fallback
  const named: Record<string, [number, number, number, number]> = {
    ease: [0.25, 0.1, 0.25, 1],
    "ease-in": [0.42, 0, 1, 1],
    "ease-out": [0, 0, 0.58, 1],
    "ease-in-out": [0.42, 0, 0.58, 1],
    linear: [0, 0, 1, 1],
  }
  const match = /cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/.exec(value)
  const points = match ? (match.slice(1).map(Number) as [number, number, number, number]) : named[value.trim()]
  if (!points) return fallback
  const key = points.join(",")
  let easing = beziers.get(key)
  if (!easing) {
    easing = Easing.bezier(...points)
    beziers.set(key, easing)
  }
  return easing
}

type TransitionOptions = {
  duration: number
  easing: EasingFunction
  /** Runs on the native driver: only for transforms and opacity. */
  native?: boolean
  /** With reduced motion the value is there at once. */
  reducedMotion?: boolean
}

/**
 * A number that moves to `target` as a CSS transition does: from where it stands, over `duration` on `easing`; at
 * once with reduced motion or a zero duration.
 */
export function useTransitionValue(target: number, { duration, easing, native = false, reducedMotion = false }: TransitionOptions) {
  const [value] = useState(() => new Animated.Value(target))
  useEffect(() => {
    if (reducedMotion || duration <= 0) {
      value.stopAnimation()
      value.setValue(target)
      return
    }
    const animation = Animated.timing(value, { toValue: target, duration, easing, useNativeDriver: native && nativeDriver, isInteraction: false })
    animation.start()
    return () => animation.stop()
  }, [value, target, duration, easing, native, reducedMotion])
  return value
}

/**
 * A color that changes as a CSS `transition: background-color` does: from the color it showed to the new one over
 * `duration`; at once with reduced motion or a zero duration (a pressed fill that lands at once).
 */
export function useColorTransition(color: string, { duration, easing, reducedMotion = false }: Omit<TransitionOptions, "native">) {
  const [progress] = useState(() => new Animated.Value(1))
  const [pair, setPair] = useState({ from: color, to: color })
  if (pair.to !== color) setPair({ from: pair.to, to: color })
  const instant = reducedMotion || duration <= 0
  // The new pair starts from its first color before it is drawn
  useLayoutEffect(() => {
    progress.stopAnimation()
    progress.setValue(pair.from === pair.to || instant ? 1 : 0)
  }, [pair, instant, progress])
  useEffect(() => {
    if (pair.from === pair.to || instant) return
    const animation = Animated.timing(progress, { toValue: 1, duration, easing, useNativeDriver: false, isInteraction: false })
    animation.start()
    return () => animation.stop()
  }, [pair, instant, duration, easing, progress])
  if (pair.from === pair.to || instant) return color
  return progress.interpolate({ inputRange: [0, 1], outputRange: [pair.from, pair.to] })
}

/**
 * A clock for a looping animation: 0 to `period` ms, linear, over and over while `running`, after `delay` ms (a CSS
 * animation's delay: only before the first turn). Parts of the animation read it through `interpolate`, as a CSS
 * animation's keyframes read its time.
 */
export function useLoopClock(period: number, running: boolean, native: boolean, delay = 0) {
  const [clock] = useState(() => new Animated.Value(0))
  useEffect(() => {
    clock.stopAnimation()
    clock.setValue(0)
    if (!running) return
    const loop = Animated.loop(Animated.timing(clock, { toValue: period, duration: period, easing: Easing.linear, useNativeDriver: native && nativeDriver, isInteraction: false }))
    if (delay <= 0) {
      loop.start()
      return () => loop.stop()
    }
    const timer = setTimeout(() => loop.start(), delay)
    return () => {
      clearTimeout(timer)
      loop.stop()
    }
  }, [clock, period, running, native, delay])
  return clock
}

/**
 * A number that moves to `target` as a CSS transition does, handed back as a plain number on each frame: for a value
 * an animated prop cannot carry (an SVG stroke, which does not reach the element on the web).
 */
export function useTweenedNumber(target: number, { duration, easing, reducedMotion = false }: Omit<TransitionOptions, "native">) {
  const value = useTransitionValue(target, { duration, easing, reducedMotion })
  const [shown, setShown] = useState(target)
  useEffect(() => {
    const id = value.addListener(({ value: next }) => setShown(next))
    return () => value.removeListener(id)
  }, [value])
  // A value set at once (reduced motion) reaches no listener before the next frame
  return reducedMotion || duration <= 0 ? target : shown
}
