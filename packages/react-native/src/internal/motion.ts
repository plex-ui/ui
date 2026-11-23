import { Animated, Easing } from "react-native"

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

/**
 * The curves Android's own motion is built from, named as in CSS where CSS has them. `accelerateDecelerate` is the
 * framework's default interpolator, (1 − cos πt) / 2; `decelerate` is its DecelerateInterpolator(1); `overshoot(t)` is its
 * OvershootInterpolator(t).
 */
export const curves = {
  ease: Easing.bezier(0.25, 0.1, 0.25, 1),
  easeIn: Easing.bezier(0.42, 0, 1, 1),
  easeOut: Easing.bezier(0, 0, 0.58, 1),
  easeInOut: Easing.bezier(0.42, 0, 0.58, 1),
  easeOutQuint: Easing.bezier(0.23, 1, 0.32, 1),
  easeOutBack: Easing.bezier(0.34, 1.56, 0.64, 1),
  easeInQuad: Easing.bezier(0.55, 0.085, 0.68, 0.53),
  easeOutQuad: Easing.bezier(0.25, 0.46, 0.45, 0.94),
  accelerateDecelerate: Easing.inOut(Easing.sin),
  decelerate: Easing.out(Easing.quad),
  accelerate: Easing.quad,
  overshoot: (tension: number) => Easing.out(Easing.back(tension)),
}

/** A spring with no bounce at `stiffness` (damping ratio 1, mass 1), in Animated.spring's terms. */
export const stiffSpring = (stiffness: number, ratio = 1) => ({ stiffness, damping: ratio * 2 * Math.sqrt(stiffness), mass: 1 })
