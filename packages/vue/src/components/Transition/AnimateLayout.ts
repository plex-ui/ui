import clsx from "clsx"
import { defineComponent, h, ref, type PropType } from "vue"
import {
  toCssVariables,
  toFilterProperty,
  toMsDurationProperty,
  toOpacityProperty,
  toTransformProperty,
  waitForAnimationFrame,
} from "../../lib/helpers.js"
import type {
  InitialTransitionDefinition,
  InsertMethod,
  LayoutTransitionDefinition,
  TransitionDefinition,
} from "./shared.js"
import { TransitionGroup } from "./TransitionGroup.js"
import s from "@plexui/styles/components/Transition/AnimateLayout.module.css"

type AnimationOptions = {
  initial?: InitialTransitionDefinition
  enter?: TransitionDefinition
  exit?: TransitionDefinition
  forceCompositeLayer?: boolean
  layoutEnter?: LayoutTransitionDefinition
  layoutExit?: LayoutTransitionDefinition
  layoutMove?: LayoutTransitionDefinition
}

/** Port of packages/ui/src/components/Transition/AnimateLayout.tsx. */
export const AnimateLayout = defineComponent({
  name: "AnimateLayout",
  props: {
    as: { type: String as PropType<"div" | "span">, default: "span" },
    insertMethod: String as PropType<InsertMethod>,
    /** An initial height animation will almost never be correct. Consider carefully when overriding. @default true */
    preventInitialTransition: { type: Boolean, default: true },
    /** Determines if `overflow: hidden` is applied to the wrapper element */
    hideOverflow: { type: Boolean, default: false },
    /** Determines which side of the container the items will pin to during enter/exit. @default "start" */
    itemAnchor: { type: String as PropType<"start" | "end">, default: "start" },
    /** Determines which property will be animated during transitions. @default "height" */
    dimension: { type: String as PropType<"width" | "height">, default: "height" },
    layoutEnter: Object as PropType<LayoutTransitionDefinition>,
    layoutExit: Object as PropType<LayoutTransitionDefinition>,
    layoutMove: Object as PropType<LayoutTransitionDefinition>,
    enter: Object as PropType<TransitionDefinition>,
    exit: Object as PropType<TransitionDefinition>,
    initial: Object as PropType<InitialTransitionDefinition>,
    /** Class applied to the inner TransitionGroup */
    transitionClassName: String,
    forceCompositeLayer: Boolean,
  },
  setup(props, { slots }) {
    const containerRef = ref<HTMLElement | null>(null)
    let captain: HTMLElement | null = null
    let exitTimestamp: number | null = null

    const handleEnter = (element: HTMLElement) => {
      const container = containerRef.value
      if (!container) return

      // If handleExit() was called >50ms ago, consider this a "move" and don't touch "interrupted" state
      const justExited = exitTimestamp && Date.now() - exitTimestamp < 50
      const anotherCaptain = !!captain
      // Look at me, I'm the captain now
      captain = element

      // Recent exits are a near guarantee we are "moving" states
      container.dataset.direction = justExited || anotherCaptain ? "move" : "in"

      // If we just exited, don't touch the interrupted state. Exit just set it with the correct state of things
      if (!justExited) {
        container.dataset.interrupted = String(!!container.style[props.dimension])
      }

      const clientRect = container.getBoundingClientRect()
      container.style[props.dimension] = `${clientRect[props.dimension]}px`
    }

    const handleEnterActive = (element: HTMLElement) => {
      const container = containerRef.value
      // ~Impossible to not be the captain at this point, but check anyway.
      if (!container || captain !== element) return

      // IMPORTANT: Use clientHeight/clientWidth to measure children, in case they have scale() applied
      const value = props.dimension === "width" ? element.clientWidth : element.clientHeight
      container.style[props.dimension] = `${value}px`
    }

    const handleEnterComplete = (element: HTMLElement) => {
      const container = containerRef.value
      // Wait for the next tick, to ensure `[data-entering*]` state is cleared from the DOM
      waitForAnimationFrame(() => {
        if (!container || captain !== element) return
        // Restore natural height to the DOM node
        container.style[props.dimension] = ""
      })
    }

    const handleExit = (element: HTMLElement) => {
      const container = containerRef.value
      const amICaptain = !captain || captain === element
      if (!container || !amICaptain) return

      // o7
      captain = null
      exitTimestamp = Date.now()

      container.dataset.direction = "out"
      container.dataset.interrupted = String(!!container.style[props.dimension])

      const clientRect = container.getBoundingClientRect()
      container.style[props.dimension] = `${clientRect[props.dimension]}px`
    }

    const handleExitActive = () => {
      const container = containerRef.value
      // If another component has become the captain, exit early
      if (!container || captain) return
      // Animate to zero layout
      container.style[props.dimension] = "0"
    }

    const handleExitComplete = () => {
      // Wait for the next tick, to ensure `[data-exiting*]` state is cleared from the DOM
      waitForAnimationFrame(() => {
        const container = containerRef.value
        if (!container || captain) return
        // Restore natural height to the DOM node
        container.style[props.dimension] = ""
      })
    }

    return () => {
      const { enterTotalDuration, exitTotalDuration, variables } = getAnimationProperties(props)
      return h(
        props.as,
        {
          "ref": containerRef,
          "class": s.Layout,
          "style": variables,
          "data-item-anchor": props.itemAnchor,
          "data-clip": props.hideOverflow,
          "data-dimension": props.dimension,
        },
        [
          h(
            TransitionGroup,
            {
              as: props.as,
              class: clsx(s.TransitionItem, props.transitionClassName),
              insertMethod: props.insertMethod,
              enterDuration: enterTotalDuration,
              exitDuration: exitTotalDuration,
              preventInitialTransition: props.preventInitialTransition,
              onEnter: handleEnter,
              onEnterActive: handleEnterActive,
              onEnterComplete: handleEnterComplete,
              onExit: handleExit,
              onExitActive: handleExitActive,
              onExitComplete: handleExitComplete,
            },
            slots,
          ),
        ],
      )
    }
  },
})

// Keep in sync with default values in AnimateLayout.module.css
const DEFAULT_LAYOUT_ENTER_DURATION_MS = 300
const DEFAULT_LAYOUT_ENTER_DELAY_MS = 0
const DEFAULT_LAYOUT_EXIT_DURATION_MS = 300
const DEFAULT_LAYOUT_EXIT_DELAY_MS = 0
const DEFAULT_LAYOUT_MOVE_DURATION_MS = 300
const DEFAULT_LAYOUT_MOVE_DELAY_MS = 0
const DEFAULT_ENTER_DURATION_MS_EASE = 300
const DEFAULT_ENTER_DURATION_MS_CUBIC = 300
const DEFAULT_ENTER_DELAY_MS = 100
const DEFAULT_EXIT_DURATION_MS_EASE = 200
const DEFAULT_EXIT_DURATION_MS_CUBIC = 200
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
    "tg-enter-filter": toFilterProperty(enter),
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
    "tg-layout-move-delay": toMsDurationProperty(layoutMove?.delay ?? DEFAULT_LAYOUT_MOVE_DELAY_MS),
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
