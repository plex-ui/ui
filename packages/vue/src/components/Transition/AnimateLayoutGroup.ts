import clsx from "clsx"
import { defineComponent, h, type PropType, type VNode } from "vue"
import {
  toCssVariables,
  toFilterProperty,
  toMsDurationProperty,
  toOpacityProperty,
  toTransformProperty,
  waitForAnimationFrame,
} from "../../lib/helpers.js"
import { isPlaceholder } from "./childList.js"
import type {
  InitialTransitionDefinition,
  InsertMethod,
  LayoutTransitionDefinition,
  TransitionDefinition,
} from "./shared.js"
import { TransitionGroup } from "./TransitionGroup.js"
import s from "@plexui/styles/components/Transition/AnimateLayoutGroup.module.css"

type AnimationOptions = {
  initial?: InitialTransitionDefinition
  enter?: TransitionDefinition
  exit?: TransitionDefinition
  forceCompositeLayer?: boolean
  layoutEnter?: LayoutTransitionDefinition
  layoutExit?: LayoutTransitionDefinition
  layoutMove?: LayoutTransitionDefinition
}

/** Port of packages/ui/src/components/Transition/AnimateLayoutGroup.tsx. */
export const AnimateLayoutGroup = defineComponent({
  name: "AnimateLayoutGroup",
  inheritAttrs: false,
  props: {
    as: { type: String as PropType<"div" | "span">, default: "span" },
    // Accepted for API parity; React's AnimateLayoutGroup does not pass them on either
    insertMethod: String as PropType<InsertMethod>,
    preventInitialTransition: { type: Boolean, default: undefined },
    hideOverflow: { type: Boolean, default: false },
    itemAnchor: { type: String as PropType<"start" | "end">, default: "start" },
    /** Determines which property will be animated during transitions. @default "height" */
    dimension: { type: String as PropType<"width" | "height">, default: "height" },
    layoutEnter: Object as PropType<LayoutTransitionDefinition>,
    layoutExit: Object as PropType<LayoutTransitionDefinition>,
    layoutMove: Object as PropType<LayoutTransitionDefinition>,
    enter: Object as PropType<TransitionDefinition>,
    exit: Object as PropType<TransitionDefinition>,
    initial: Object as PropType<InitialTransitionDefinition>,
    /** Class applied to each item wrapper */
    transitionClassName: String,
    forceCompositeLayer: Boolean,
  },
  setup(props, { slots, attrs }) {
    const handleEnter = (element: HTMLElement) => {
      // Stage zero layout
      element.style[props.dimension] = "0"
    }

    const handleEnterActive = (element: HTMLElement) => {
      waitForAnimationFrame(() => {
        // Animate to target height
        // IMPORTANT: Use clientHeight/clientWidth to measure children, in case they have scale() applied
        const value =
          props.dimension === "width"
            ? element.firstElementChild?.clientWidth
            : element.firstElementChild?.clientHeight
        element.style[props.dimension] = `${value ?? 0}px`
      })
    }

    const handleEnterComplete = (element: HTMLElement) => {
      waitForAnimationFrame(() => {
        // Restore natural layout to the DOM node
        element.style[props.dimension] = ""
      })
    }

    const handleExit = (element: HTMLElement) => {
      element.style[props.dimension] = `${element.getBoundingClientRect()[props.dimension]}px`
    }

    const handleExitActive = (element: HTMLElement) => {
      waitForAnimationFrame(() => {
        // Animate to zero layout
        element.style[props.dimension] = "0"
      })
    }

    return () => {
      const { enterTotalDuration, exitTotalDuration, variables } = getAnimationProperties(props)
      const children: VNode[] = (slots.default?.() ?? []).filter((vnode) => !isPlaceholder(vnode))

      return h(
        TransitionGroup,
        {
          as: props.as,
          class: clsx(s.LayoutItem, attrs.class as string | undefined),
          style: variables,
          // Adding 32ms to timers because of the additional waitForAnimationFrame() calls
          enterDuration: enterTotalDuration + 32,
          exitDuration: exitTotalDuration + 32,
          onEnter: handleEnter,
          onEnterActive: handleEnterActive,
          onEnterComplete: handleEnterComplete,
          onExit: handleExit,
          onExitActive: handleExitActive,
        },
        {
          default: () =>
            children.map((child, index) =>
              h(
                props.as,
                {
                  // React's Children.toArray gives unkeyed children ".0", ".1"...
                  "key": child.key ?? `.${index}`,
                  "class": clsx(s.TransitionItem, props.transitionClassName),
                  "data-dimension": props.dimension,
                },
                [child],
              ),
            ),
        },
      )
    }
  },
})

// Keep in sync with default values in AnimateLayout.module.css
const DEFAULT_LAYOUT_ENTER_DURATION_MS = 300
const DEFAULT_LAYOUT_ENTER_DELAY_MS = 0
const DEFAULT_LAYOUT_EXIT_DURATION_MS = 300
const DEFAULT_LAYOUT_EXIT_DELAY_MS = 50
const DEFAULT_LAYOUT_MOVE_DURATION_MS = 300
const DEFAULT_LAYOUT_MOVE_DELAY_MS = 0
const DEFAULT_ENTER_DURATION_MS_EASE = 400
const DEFAULT_ENTER_DURATION_MS_CUBIC = 400
const DEFAULT_ENTER_DELAY_MS = 150
const DEFAULT_EXIT_DURATION_MS_EASE = 200
const DEFAULT_EXIT_DURATION_MS_CUBIC = 300
const DEFAULT_EXIT_DELAY_MS = 0

function getAnimationProperties({
  initial,
  enter,
  exit,
  forceCompositeLayer,
  layoutEnter,
  layoutExit,
  layoutMove,
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
    "tg-enter-filter": toFilterProperty(enter ?? {}),
    "tg-enter-duration": toMsDurationProperty(enterDuration),
    "tg-enter-delay": toMsDurationProperty(enter?.delay ?? DEFAULT_ENTER_DELAY_MS),
    "tg-enter-timing-function": enterTimingFunction,
    "tg-exit-opacity": toOpacityProperty(exit?.opacity ?? 0),
    "tg-exit-transform": exitTransform,
    "tg-exit-filter": toFilterProperty(exit ?? {}),
    "tg-exit-duration": toMsDurationProperty(exitDuration),
    "tg-exit-delay": toMsDurationProperty(exit?.delay ?? DEFAULT_EXIT_DELAY_MS),
    "tg-exit-timing-function": exitTimingFunction,
    "tg-initial-opacity": toOpacityProperty(initial?.opacity ?? exit?.opacity ?? 0),
    "tg-initial-transform": initialTransform === "none" ? exitTransform : initialTransform,
    "tg-initial-filter": toFilterProperty(initial ?? exit ?? {}),
    "tg-layout-enter-duration": toMsDurationProperty(
      layoutEnter?.duration ?? DEFAULT_LAYOUT_ENTER_DURATION_MS,
    ),
    "tg-layout-enter-delay": toMsDurationProperty(
      layoutEnter?.delay ?? DEFAULT_LAYOUT_ENTER_DELAY_MS,
    ),
    "tg-layout-enter-timing-function": layoutEnter?.timingFunction ?? "var(--cubic-move)",
    "tg-layout-exit-duration": toMsDurationProperty(
      layoutExit?.duration ?? DEFAULT_LAYOUT_EXIT_DURATION_MS,
    ),
    "tg-layout-exit-delay": toMsDurationProperty(layoutExit?.delay ?? DEFAULT_LAYOUT_EXIT_DELAY_MS),
    "tg-layout-exit-timing-function": layoutExit?.timingFunction ?? "var(--cubic-move)",
    "tg-layout-move-duration": toMsDurationProperty(
      layoutMove?.duration ?? DEFAULT_LAYOUT_MOVE_DURATION_MS,
    ),
    "tg-layout-move-delay": toMsDurationProperty(
      layoutMove?.delay ?? DEFAULT_LAYOUT_MOVE_DURATION_MS,
    ),
    "tg-layout-move-timing-function": layoutMove?.timingFunction ?? "var(--cubic-move)",
  } satisfies Record<string, string>)

  const enterTotalDuration =
    (enter?.delay ?? DEFAULT_ENTER_DELAY_MS) + (enterDuration ?? DEFAULT_ENTER_DURATION_MS_EASE)
  const exitTotalDuration =
    (exit?.delay ?? DEFAULT_EXIT_DELAY_MS) + (exitDuration ?? DEFAULT_EXIT_DURATION_MS_EASE)
  const layoutEnterTotalDuration =
    (layoutEnter?.delay ?? DEFAULT_LAYOUT_ENTER_DELAY_MS) +
    (layoutEnter?.duration ?? DEFAULT_LAYOUT_ENTER_DURATION_MS)
  const layoutExitTotalDuration =
    (layoutExit?.delay ?? DEFAULT_LAYOUT_EXIT_DELAY_MS) +
    (layoutExit?.duration ?? DEFAULT_LAYOUT_EXIT_DURATION_MS)
  const layoutMoveTotalDuration =
    (layoutMove?.delay ?? DEFAULT_LAYOUT_MOVE_DELAY_MS) +
    (layoutMove?.duration ?? DEFAULT_LAYOUT_MOVE_DURATION_MS)

  return {
    // In order for us to release layout dimensions (e.g., height) to the natural DOM state,
    // we must ensure the behaviors from the TransitionGroup callbacks are synced with the outer layout `transitions`.
    // Setting TransitionGroup timing to the max of these durations is the simplest approach.
    // In practice, these should only vary by about 50-200ms at most; imperceivable to end-users.
    enterTotalDuration: Math.max(
      enterTotalDuration,
      layoutEnterTotalDuration,
      layoutMoveTotalDuration,
    ),
    exitTotalDuration: Math.max(
      exitTotalDuration,
      layoutExitTotalDuration,
      layoutMoveTotalDuration,
    ),
    variables,
  }
}
