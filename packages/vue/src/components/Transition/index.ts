export { Animate, type AnimateProps } from "./Animate.js"
export { AnimateLayout, type AnimateLayoutProps } from "./AnimateLayout.js"
export { AnimateLayoutGroup, type AnimateLayoutGroupProps } from "./AnimateLayoutGroup.js"
export { SlotTransitionGroup, type SlotTransitionGroupProps } from "./SlotTransitionGroup.js"
export { TransitionGroup, type TransitionGroupProps } from "./TransitionGroup.js"
// Vue's template compiler always resolves <TransitionGroup> to its built-in
// component, so templates use this alias; render functions can use either.
export { TransitionGroup as PlexTransitionGroup } from "./TransitionGroup.js"
export type {
  InitialTransitionDefinition,
  LayoutTransitionDefinition,
  TransitionDefinition,
  TransitionGroupChildCallback,
  TransitionGroupChildCallbacks,
} from "./shared.js"
