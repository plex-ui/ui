import clsx from "clsx"
import { defineComponent, h, onBeforeUnmount, onMounted, ref, type PropType, type StyleValue, type VNode } from "vue"
import getDisableAnimations from "./getDisableAnimations.js"
import { isPlaceholder, useChildList } from "./childList.js"
import type { InsertMethod, TransitionGroupChildCallback, TransitionGroupChildCallbacks } from "./shared.js"
import { useTransitionChild } from "./useTransitionChild.js"
import s from "@plexui/styles/components/Transition/TransitionGroup.module.css"

// Port of packages/ui/src/components/Transition/TransitionGroup.tsx. Same
// wrappers, data attributes and timings, so the shared CSS animates both.

type Tag = "div" | "span"

const callbackProp = Function as PropType<TransitionGroupChildCallback>

const TransitionGroupChildInner = defineComponent({
  name: "TransitionGroupChildInner",
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
    callbacks: Object as PropType<TransitionGroupChildCallbacks>,
  },
  setup(props, { slots }) {
    const element = ref<HTMLElement | null>(null)
    const state = useTransitionChild(props, () => element.value)

    return () =>
      h(
        props.as,
        {
          "ref": element,
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

/** Delays mounting a child by `enterMountDelay` ms, except on the initial (prevented) mount. */
export const useMountDelay = (preventMountTransition: boolean | undefined, enterMountDelay: number | undefined) => {
  const mountDelay = !preventMountTransition && enterMountDelay != null ? enterMountDelay : null
  const mounted = ref(mountDelay == null)
  let timeout: number | undefined
  onMounted(() => {
    if (!mounted.value) timeout = window.setTimeout(() => (mounted.value = true), mountDelay!)
  })
  onBeforeUnmount(() => clearTimeout(timeout))
  return mounted
}

const TransitionGroupChild = defineComponent({
  name: "TransitionGroupChild",
  inheritAttrs: false,
  props: {
    preventMountTransition: Boolean,
    enterMountDelay: Number,
  },
  setup(props, { attrs, slots }) {
    const mounted = useMountDelay(props.preventMountTransition, props.enterMountDelay)
    return () =>
      mounted.value
        ? h(TransitionGroupChildInner, { ...attrs, preventMountTransition: props.preventMountTransition } as never, slots)
        : null
  },
})

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
    /** Delay in MS to wait before mounting a child. Unset for no delay (default). */
    enterMountDelay: Number,
    /** Render children changes immediately, bypassing transition timings */
    disableAnimations: { type: Boolean, default: () => getDisableAnimations() },
    /** Determines how new children are added to the children array */
    insertMethod: { type: String as PropType<InsertMethod>, default: "append" },
    /** Called when an enter animation is staged (e.g., component mounted to the DOM) */
    onEnter: callbackProp,
    /** Called when an enter animation starts */
    onEnterActive: callbackProp,
    /** Called when an enter animation completes */
    onEnterComplete: callbackProp,
    /** Called when an exit animation is staged */
    onExit: callbackProp,
    /** Called when an exit animation starts */
    onExitActive: callbackProp,
    /** Called when an exit animation completes (e.g., component unmounted from the DOM) */
    onExitComplete: callbackProp,
  },
  setup(props, { slots, attrs }) {
    const children = useChildList("TransitionGroup")
    // Read at call time, so callers can swap handlers between renders
    const callbacks: TransitionGroupChildCallbacks = {
      onEnter: (el) => props.onEnter?.(el),
      onEnterActive: (el) => props.onEnterActive?.(el),
      onEnterComplete: (el) => props.onEnterComplete?.(el),
      onExit: (el) => props.onExit?.(el),
      onExitActive: (el) => props.onExitActive?.(el),
      onExitComplete: (el) => props.onExitComplete?.(el),
    }

    return () => {
      const slotChildren: VNode[] = slots.default?.() ?? []
      const className = attrs.class as string | undefined
      const style = attrs.style as StyleValue | undefined
      const renderChildren = children.next(
        children.keyedChildren(slotChildren),
        props.insertMethod,
        props.preventInitialTransition,
      )

      if (props.disableAnimations) {
        return slotChildren.map((vnode) =>
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
            preventMountTransition: child.preventMountTransition,
            enterMountDelay: props.enterMountDelay,
            as: props.as,
            className,
            transitionId: props.transitionId,
            styleValue: style,
            shouldRender: child.shouldRender,
            enterDuration: props.enterDuration,
            exitDuration: props.exitDuration,
            removeChild: () => children.remove(child.key),
            callbacks,
          },
          { default: () => [child.vnode] },
        ),
      )
    }
  },
})
