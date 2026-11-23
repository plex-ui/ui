import { Animated } from "react-native"

/**
 * A spring of Compose's motion scheme in the terms of Animated.spring: Compose gives a damping ratio, React Native
 * the damping itself (the ratio times 2√stiffness, at a mass of 1).
 */
const spring = (ratio: number, stiffness: number) => ({ stiffness, damping: ratio * 2 * Math.sqrt(stiffness), mass: 1 })

/** Material 3 Expressive's motion scheme (Compose `ExpressiveMotionTokens`, what `MaterialExpressiveTheme` runs). */
export const materialMotion = {
  fastSpatial: spring(0.6, 800),
  defaultSpatial: spring(0.8, 380),
  fastEffects: spring(1, 3800),
  defaultEffects: spring(1, 1600),
}

export type MaterialSpring = (typeof materialMotion)[keyof typeof materialMotion]

/** Springs a value to `to`; with reduced motion it is there at once. */
export function springTo(value: Animated.Value, to: number, config: MaterialSpring, reducedMotion: boolean) {
  if (reducedMotion) {
    value.stopAnimation()
    value.setValue(to)
    return
  }
  Animated.spring(value, { toValue: to, ...config, useNativeDriver: false }).start()
}
