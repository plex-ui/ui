import { onBeforeUnmount, onMounted, reactive, watch } from "vue"
import { waitForAnimationFrame } from "../../lib/helpers.js"
import type { CallbackType, TransitionGroupChildCallbacks } from "./shared.js"
import { getInitialTransitionState, transitionReducer, type TransitionStateAction } from "./transitionReducer.js"

export type TransitionChildProps = {
  shouldRender: boolean
  preventMountTransition?: boolean
  enterDuration: number
  exitDuration: number
  removeChild: () => void
  callbacks?: TransitionGroupChildCallbacks
}

const CALLBACKS: Record<CallbackType, keyof TransitionGroupChildCallbacks> = {
  "enter": "onEnter",
  "enter-active": "onEnterActive",
  "enter-complete": "onEnterComplete",
  "exit": "onExit",
  "exit-active": "onExitActive",
  "exit-complete": "onExitComplete",
}

/**
 * The per-child enter/exit state machine of React's TransitionGroupChild
 * (same reducer, frames and timers), shared by TransitionGroup and
 * SlotTransitionGroup. Returns the reactive state that drives the
 * `data-entering*` / `data-exiting*` / `data-interrupted` attributes.
 */
export function useTransitionChild(props: TransitionChildProps, getElement: () => HTMLElement | null) {
  const state = reactive(getInitialTransitionState(!!props.preventMountTransition))
  const dispatch = (action: TransitionStateAction) => {
    Object.assign(state, transitionReducer(state, action))
  }

  let lastCallback: CallbackType | null = null
  const trigger = (type: CallbackType) => {
    const element = getElement()
    if (!element || type === lastCallback) return
    lastCallback = type
    props.callbacks?.[CALLBACKS[type]]?.(element)
  }

  // Allow a child to prevent mount transition, but still experience
  // future enter transition events, when applicable.
  let preventedMountTransition = false
  let cancel: (() => void) | undefined

  const run = (shouldRender: boolean) => {
    cancel?.()
    cancel = undefined

    // Exit transition
    if (!shouldRender) {
      let exitTimeout: number | undefined
      dispatch({ type: "exit-before" })
      trigger("exit")
      const cancelFrame = waitForAnimationFrame(() => {
        dispatch({ type: "exit-active" })
        trigger("exit-active")
        exitTimeout = window.setTimeout(() => {
          trigger("exit-complete")
          props.removeChild()
        }, props.exitDuration)
      })
      cancel = () => {
        cancelFrame()
        if (exitTimeout !== undefined) clearTimeout(exitTimeout)
      }
      return
    }

    // Enter transition: check if we need to prevent this specific entering cycle
    if (props.preventMountTransition && !preventedMountTransition) {
      preventedMountTransition = true
      return
    }

    let enterTimeout: number | undefined
    dispatch({ type: "enter-before" })
    trigger("enter")
    const cancelFrame = waitForAnimationFrame(() => {
      dispatch({ type: "enter-active" })
      trigger("enter-active")
      enterTimeout = window.setTimeout(() => {
        dispatch({ type: "done" })
        trigger("enter-complete")
      }, props.enterDuration)
    })
    cancel = () => {
      cancelFrame()
      if (enterTimeout !== undefined) clearTimeout(enterTimeout)
    }
  }

  onMounted(() => run(props.shouldRender))
  watch(() => props.shouldRender, run, { flush: "post" })
  onBeforeUnmount(() => cancel?.())

  return state
}
