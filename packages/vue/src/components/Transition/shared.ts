// Types and helpers shared by the Vue transition components. Mirrors
// packages/ui/src/components/Transition/shared.ts.

export type TransitionDefinition = {
  opacity?: number
  /** The horizontal translation value in pixels */
  x?: number
  /**  The horizontal vertical value in pixels */
  y?: number
  /** The opacity value ranging from 0 to 1. */
  scale?: number
  rotate?: number | string
  skewX?: number | string
  skewY?: number | string
  blur?: number
  duration?: number
  delay?: number
  timingFunction?: string
}

export type InitialTransitionDefinition = Omit<
  TransitionDefinition,
  "duration" | "delay" | "timingFunction"
>

export type LayoutTransitionDefinition = {
  duration?: number
  delay?: number
  timingFunction?: string
}

export type CallbackType =
  | "enter"
  | "enter-active"
  | "enter-complete"
  | "exit"
  | "exit-active"
  | "exit-complete"

/** The element a transition callback receives (HTML or SVG) */
export type TransitionElement = HTMLElement | SVGElement

export type TransitionGroupChildCallback = (element: TransitionElement) => void

/** Lifecycle hooks, called with the transitioning element (same moments as React's `onEnter`...). */
export type TransitionGroupChildCallbacks = {
  onEnter?: TransitionGroupChildCallback
  onEnterActive?: TransitionGroupChildCallback
  onEnterComplete?: TransitionGroupChildCallback
  onExit?: TransitionGroupChildCallback
  onExitActive?: TransitionGroupChildCallback
  onExitComplete?: TransitionGroupChildCallback
}

export type InsertMethod = "append" | "prepend"
