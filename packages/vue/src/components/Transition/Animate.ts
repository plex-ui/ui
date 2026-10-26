import clsx from "clsx"
import { defineComponent, h, type PropType } from "vue"
import {
  toCssVariables,
  toFilterProperty,
  toMsDurationProperty,
  toOpacityProperty,
  toTransformProperty,
} from "../../lib/helpers.js"
import type { InitialTransitionDefinition, InsertMethod, TransitionDefinition } from "./shared.js"
import { TransitionGroup } from "./TransitionGroup.js"
import s from "@plexui/styles/components/Transition/Animate.module.css"

type AnimationOptions = {
  initial?: InitialTransitionDefinition
  enter?: TransitionDefinition
  exit?: TransitionDefinition
  forceCompositeLayer?: boolean
}

/** Port of packages/ui/src/components/Transition/Animate.tsx. */
export const Animate = defineComponent({
  name: "Animate",
  props: {
    /** Determines the tag used by the container and wrapping elements. @default "span" */
    as: { type: String as PropType<"div" | "span">, default: "span" },
    /** Determines how new children are added to the children array */
    insertMethod: String as PropType<InsertMethod>,
    /** Determines if children should have an enter transition applied during mounting. @default true */
    preventInitialTransition: { type: Boolean, default: undefined },
    /** Class applied to the inner TransitionGroup */
    transitionClassName: String,
    /** Styles applied to the enter transition */
    enter: Object as PropType<TransitionDefinition>,
    /** Styles applied to the exit transition */
    exit: Object as PropType<TransitionDefinition>,
    /** Styles applied before the enter transition occurs */
    initial: Object as PropType<InitialTransitionDefinition>,
    /** Determines how transition states are positioned. @default "absolute" */
    transitionPosition: { type: String as PropType<"absolute" | "static">, default: "absolute" },
    /** Applies `will-change` to force animating elements to composite layers. Use with caution! */
    forceCompositeLayer: Boolean,
  },
  setup(props, { slots }) {
    return () => {
      const { enterTotalDuration, exitTotalDuration, variables } = getAnimationProperties(props)
      return h(
        props.as,
        {
          "class": clsx("block", props.transitionPosition === "absolute" && "relative"),
          "data-transition-position": props.transitionPosition,
          "style": variables,
        },
        [
          h(
            TransitionGroup,
            {
              as: props.as,
              class: clsx(s.TransitionItem, props.transitionClassName),
              enterDuration: enterTotalDuration,
              exitDuration: exitTotalDuration,
              insertMethod: props.insertMethod,
              preventInitialTransition: props.preventInitialTransition,
            },
            slots,
          ),
        ],
      )
    }
  },
})

// Keep in sync with default values in Animate.module.css
const DEFAULT_ENTER_DURATION_MS_EASE = 400
const DEFAULT_ENTER_DURATION_MS_CUBIC = 500
const DEFAULT_EXIT_DURATION_MS_EASE = 200
const DEFAULT_EXIT_DURATION_MS_CUBIC = 300

function getAnimationProperties({
  initial: initial,
  enter: enter,
  exit: exit,
  forceCompositeLayer,
}: AnimationOptions): {
  enterTotalDuration: number
  exitTotalDuration: number
  variables: Record<string, string>
} {
  // Dynamically inspect if we're transitioning transform properties, and apply cubic curves and timings as defaults
  const initialTransform = toTransformProperty(initial)
  const enterTransform = toTransformProperty(enter)
  const exitTransform = toTransformProperty(exit)
  const isCubicTransition = [initialTransform, exitTransform, enterTransform].some(
    (t) => t !== "none",
  )
  const enterDuration =
    enter?.duration ??
    (isCubicTransition ? DEFAULT_ENTER_DURATION_MS_CUBIC : DEFAULT_ENTER_DURATION_MS_EASE)
  const enterTimingFunction =
    enter?.timingFunction ?? (isCubicTransition ? "var(--cubic-enter)" : "ease")
  const exitDuration =
    exit?.duration ??
    (isCubicTransition ? DEFAULT_EXIT_DURATION_MS_CUBIC : DEFAULT_EXIT_DURATION_MS_EASE)
  const exitTimingFunction =
    exit?.timingFunction ?? (isCubicTransition ? "var(--cubic-exit)" : "ease")

  // Generate variable overrides from props
  const variables = toCssVariables({
    "tg-will-change": forceCompositeLayer ? "transform, opacity" : "auto",
    "tg-enter-opacity": toOpacityProperty(enter?.opacity ?? 1),
    "tg-enter-transform": enterTransform,
    "tg-enter-filter": toFilterProperty(enter),
    "tg-enter-duration": toMsDurationProperty(enterDuration),
    "tg-enter-delay": toMsDurationProperty(enter?.delay ?? 0),
    "tg-enter-timing-function": enterTimingFunction,
    "tg-exit-opacity": toOpacityProperty(exit?.opacity ?? 0),
    "tg-exit-transform": exitTransform,
    "tg-exit-filter": toFilterProperty(exit),
    "tg-exit-duration": toMsDurationProperty(exitDuration),
    "tg-exit-delay": toMsDurationProperty(exit?.delay ?? 0),
    "tg-exit-timing-function": exitTimingFunction,
    "tg-initial-opacity": toOpacityProperty(initial?.opacity ?? exit?.opacity ?? 0),
    "tg-initial-transform": initialTransform === "none" ? exitTransform : initialTransform,
    "tg-initial-filter": toFilterProperty(initial ?? exit ?? {}),
  } satisfies Record<string, string>)

  const enterTotalDuration = (enter?.delay ?? 0) + enterDuration
  const exitTotalDuration = (exit?.delay ?? 0) + exitDuration

  return { enterTotalDuration, exitTotalDuration, variables }
}
