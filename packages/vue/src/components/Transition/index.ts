export { Animate } from "./Animate.js"
export { AnimateLayout } from "./AnimateLayout.js"
export { AnimateLayoutGroup } from "./AnimateLayoutGroup.js"
export { SlotTransitionGroup } from "./SlotTransitionGroup.js"
export { TransitionGroup } from "./TransitionGroup.js"
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
