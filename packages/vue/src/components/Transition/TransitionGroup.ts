import clsx from "clsx"
import {
  Comment,
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  reactive,
  shallowRef,
  watch,
  type PropType,
  type StyleValue,
  type VNode,
} from "vue"
import { waitForAnimationFrame } from "../../lib/helpers"
import getDisableAnimations from "./getDisableAnimations"
import { getInitialTransitionState, transitionReducer, type TransitionStateAction } from "./transitionReducer"
import s from "@plexui/styles/components/Transition/TransitionGroup.module.css"

// Port of packages/ui/src/components/Transition/TransitionGroup.tsx. Same
// wrappers, data attributes and timings, so the shared CSS animates both.

type Tag = "div" | "span"

const TransitionGroupChild = defineComponent({
  name: "TransitionGroupChild",
  props: {
    as: { type: String as PropType<Tag>, required: true },
    className: String,
    transitionId: String,
    styleValue: [String, Object, Array] as PropType<StyleValue>,
    preventMountTransition: Boolean,
    shouldRender: { type: Boolean, required: true },
    enterDuration: { type: Number, required: true },
    exitDuration: { type: Number, required: true },
    removeChild: { type: Function as PropType<() => void>, required: true },
  },
  setup(props, { slots }) {
    const state = reactive(getInitialTransitionState(props.preventMountTransition))
    const dispatch = (action: TransitionStateAction) => {
      Object.assign(state, transitionReducer(state, action))
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
        const cancelFrame = waitForAnimationFrame(() => {
          dispatch({ type: "exit-active" })
          exitTimeout = window.setTimeout(() => props.removeChild(), props.exitDuration)
        })
        cancel = () => {
          cancelFrame()
          if (exitTimeout !== undefined) clearTimeout(exitTimeout)
        }
        return
      }

      // Enter transition
      if (props.preventMountTransition && !preventedMountTransition) {
        preventedMountTransition = true
        return
      }

      let enterTimeout: number | undefined
      dispatch({ type: "enter-before" })
      const cancelFrame = waitForAnimationFrame(() => {
        dispatch({ type: "enter-active" })
        enterTimeout = window.setTimeout(() => dispatch({ type: "done" }), props.enterDuration)
      })
      cancel = () => {
        cancelFrame()
        if (enterTimeout !== undefined) clearTimeout(enterTimeout)
      }
    }

    onMounted(() => run(props.shouldRender))
    watch(() => props.shouldRender, run, { flush: "post" })
    onBeforeUnmount(() => cancel?.())

    return () =>
      h(
        props.as,
        {
          "class": clsx(props.className, s.TransitionGroupChild),
          "data-transition-id": props.transitionId,
          "style": props.styleValue,
          "data-entering": state.enter ? "" : undefined,
          "data-entering-active": state.enterActive ? "" : undefined,
          "data-exiting": state.exit ? "" : undefined,
          "data-exiting-active": state.exitActive ? "" : undefined,
          "data-interrupted": state.interrupted ? "" : undefined,
        },
        slots.default?.(),
      )
  },
})

type RenderChild = {
  key: PropertyKey
  vnode: VNode
  shouldRender: boolean
  preventMountTransition?: boolean
}

const isPlaceholder = (vnode: VNode) => vnode.type === Comment

/**
 * Wraps each keyed child in a `<span>` (or `<div>`) that carries
 * `data-entering` / `data-exiting` state while it mounts and unmounts.
 *
 * A `false` slot child (a comment vnode) mirrors React's `Children.map`
 * over `false`: with `disableAnimations` it still renders an empty wrapper.
 * Leave the slot out entirely to render nothing.
 */
export const TransitionGroup = defineComponent({
  name: "TransitionGroup",
  inheritAttrs: false,
  props: {
    /** Determines the tag used by wrapping elements */
    as: { type: String as PropType<Tag>, default: "span" },
    /** Identifier passed to wrapping elements as `[data-transition-id]` */
    transitionId: String,
    /** Determines the amount of time that the enter state is applied during mounting */
    enterDuration: { type: Number, default: 0 },
    /** Determines the amount of time that the exit state is applied before unmounting */
    exitDuration: { type: Number, default: 0 },
    /** Determines if children should have an enter transition applied during mounting of the TransitionGroup. */
    preventInitialTransition: { type: Boolean, default: true },
    /** Render children changes immediately, bypassing transition timings */
    disableAnimations: { type: Boolean, default: () => getDisableAnimations() },
    /** Determines how new children are added to the children array */
    insertMethod: { type: String as PropType<"append" | "prepend">, default: "append" },
  },
  setup(props, { slots, attrs }) {
    let renderChildren: RenderChild[] | null = null
    // Bumped when an exited child is removed, to re-render without it
    const removals = shallowRef(0)

    const removeChild = (key: PropertyKey) => {
      renderChildren = (renderChildren ?? []).filter((child) => child.key !== key)
      removals.value += 1
    }

    const nextRenderChildren = (propChildren: VNode[]): RenderChild[] => {
      if (renderChildren === null) {
        // Lock preventMountTransition to its value on the first render
        return propChildren.map((vnode) => ({
          key: vnode.key!,
          vnode,
          shouldRender: true,
          preventMountTransition: props.preventInitialTransition,
        }))
      }

      const propKeys = new Set(propChildren.map((vnode) => vnode.key))
      const currentKeys = new Set(renderChildren.map((child) => child.key))

      const added = propChildren
        .filter((vnode) => !currentKeys.has(vnode.key!))
        .map((vnode) => ({ key: vnode.key!, vnode, shouldRender: true }))

      const updated = renderChildren.map((child) => ({
        ...child,
        vnode: propChildren.find((vnode) => vnode.key === child.key) ?? child.vnode,
        shouldRender: propKeys.has(child.key),
      }))

      return props.insertMethod === "append" ? updated.concat(added) : added.concat(updated)
    }

    return () => {
      void removals.value
      const children = slots.default?.() ?? []
      const className = attrs.class as string | undefined
      const style = attrs.style as StyleValue | undefined

      const keyedChildren = children.filter((vnode) => !isPlaceholder(vnode))
      for (const vnode of keyedChildren) {
        if (vnode.key == null) {
          throw new Error("Child elements of <TransitionGroup /> must include a `key`")
        }
      }
      renderChildren = nextRenderChildren(keyedChildren)

      if (props.disableAnimations) {
        return children.map((vnode) =>
          h(
            props.as,
            { "class": className, style, "data-transition-id": props.transitionId },
            isPlaceholder(vnode) ? undefined : [vnode],
          ),
        )
      }

      return renderChildren.map((child) =>
        h(
          TransitionGroupChild,
          {
            key: child.key,
            as: props.as,
            className,
            transitionId: props.transitionId,
            styleValue: style,
            preventMountTransition: child.preventMountTransition,
            shouldRender: child.shouldRender,
            enterDuration: props.enterDuration,
            exitDuration: props.exitDuration,
            removeChild: () => removeChild(child.key),
          },
          { default: () => [child.vnode] },
        ),
      )
    }
  },
})
