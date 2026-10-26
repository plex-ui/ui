import { cloneVNode, defineComponent, h, ref, type ComponentPublicInstance, type PropType, type VNode } from "vue"
import getDisableAnimations from "./getDisableAnimations.js"
import { isPlaceholder, useChildList } from "./childList.js"
import type { InsertMethod, TransitionGroupChildCallback, TransitionGroupChildCallbacks } from "./shared.js"
import { useMountDelay } from "./TransitionGroup.js"
import { useTransitionChild } from "./useTransitionChild.js"

// Port of packages/ui/src/components/Transition/SlotTransitionGroup.tsx:
// like TransitionGroup, but the transition attributes go on the child
// itself instead of a wrapper element.

const callbackProp = Function as PropType<TransitionGroupChildCallback>

const toElement = (value: unknown): HTMLElement | null => {
  if (value instanceof HTMLElement) return value
  const el = (value as ComponentPublicInstance | null)?.$el
  return el instanceof HTMLElement ? el : null
}

const SlotTransitionGroupChildInner = defineComponent({
  name: "SlotTransitionGroupChildInner",
  props: {
    component: { type: Object as PropType<VNode>, required: true },
    preventMountTransition: Boolean,
    shouldRender: { type: Boolean, required: true },
    enterDuration: { type: Number, required: true },
    exitDuration: { type: Number, required: true },
    removeChild: { type: Function as PropType<() => void>, required: true },
    callbacks: Object as PropType<TransitionGroupChildCallbacks>,
  },
  setup(props) {
    const element = ref<HTMLElement | null>(null)
    const state = useTransitionChild(props, () => element.value)
    const setElement = (value: unknown) => {
      element.value = toElement(value)
    }

    return () =>
      cloneVNode(
        props.component,
        {
          "data-entering": state.enter ? "" : undefined,
          "data-entering-active": state.enterActive ? "" : undefined,
          "data-exiting": state.exit ? "" : undefined,
          "data-exiting-active": state.exitActive ? "" : undefined,
          "data-interrupted": state.interrupted ? "" : undefined,
          "ref": setElement,
        },
        true,
      )
  },
})

const SlotTransitionGroupChild = defineComponent({
  name: "SlotTransitionGroupChild",
  inheritAttrs: false,
  props: {
    preventMountTransition: Boolean,
    enterMountDelay: Number,
  },
  setup(props, { attrs }) {
    const mounted = useMountDelay(props.preventMountTransition, props.enterMountDelay)
    return () =>
      mounted.value
        ? h(SlotTransitionGroupChildInner, { ...attrs, preventMountTransition: props.preventMountTransition } as never)
        : null
  },
})

export const SlotTransitionGroup = defineComponent({
  name: "SlotTransitionGroup",
  props: {
    /** Determines the amount of time that the enter state is applied during mounting */
    enterDuration: { type: Number, default: 0 },
    /** Determines the amount of time that the exit state is applied before unmounting */
    exitDuration: { type: Number, default: 0 },
    /** Determines if children should have an enter transition applied during mounting of the group. */
    preventInitialTransition: { type: Boolean, default: true },
    /** Delay in MS to wait before mounting a child. Unset for no delay (default). */
    enterMountDelay: Number,
    /** Render children changes immediately, bypassing transition timings */
    disableAnimations: { type: Boolean, default: () => getDisableAnimations() },
    /** Determines how new children are added to the children array */
    insertMethod: { type: String as PropType<InsertMethod>, default: "append" },
    onEnter: callbackProp,
    onEnterActive: callbackProp,
    onEnterComplete: callbackProp,
    onExit: callbackProp,
    onExitActive: callbackProp,
    onExitComplete: callbackProp,
  },
  setup(props, { slots }) {
    const children = useChildList("SlotTransitionGroup")
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
      const renderChildren = children.next(
        children.keyedChildren(slotChildren),
        props.insertMethod,
        props.preventInitialTransition,
      )

      // Fast path: when animations are disabled, render children as-is
      if (props.disableAnimations) {
        return slotChildren.filter((vnode) => !isPlaceholder(vnode))
      }

      return renderChildren.map((child) =>
        h(SlotTransitionGroupChild, {
          key: child.key,
          preventMountTransition: child.preventMountTransition,
          enterMountDelay: props.enterMountDelay,
          component: child.vnode,
          shouldRender: child.shouldRender,
          enterDuration: props.enterDuration,
          exitDuration: props.exitDuration,
          removeChild: () => children.remove(child.key),
          callbacks,
        }),
      )
    }
  },
})
