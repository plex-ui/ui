import React, { Children, useCallback, useRef } from "react"
import { isDev, isTest } from "../../lib/constants"

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

// Transition callbacks and types shared across implementations
export type TransitionGroupChildCallback = (element: HTMLDivElement) => void

export type TransitionGroupChildCallbacks = {
  /** Callback fired when an enter animation is staged (e.g., component mounted to the DOM) */
  onEnter: TransitionGroupChildCallback
  /** Callback fired when an enter animation starts */
  onEnterActive: TransitionGroupChildCallback
  /** Callback fired when an enter animation completes */
  onEnterComplete: TransitionGroupChildCallback
  /** Callback fired when an exit animation is staged */
  onExit: TransitionGroupChildCallback
  /** Callback fired when an exit animation starts */
  onExitActive: TransitionGroupChildCallback
  /** Callback fired when an exit animation completes (e.g., component unmounted from the DOM) */
  onExitComplete: TransitionGroupChildCallback
}

export const NonNullChildren = (children: React.ReactNode) =>
  Children.toArray(children).filter((child) => child !== null && child !== undefined)

// Shared keyed-children and transition helpers
export interface ReactElementWithKey extends React.ReactElement {
  key: string
}

export const ChildrenWithKeys = (
  children: React.ReactNode,
  shouldThrow: boolean = false,
  componentName: string = "TransitionGroup",
): ReactElementWithKey[] => {
  const validChildren: ReactElementWithKey[] = []
  Children.forEach(children, (child) => {
    if (child && typeof child === "object" && "key" in child && !!child.key) {
      // @ts-expect-error -- The above conditional is enough coercion that the component is valid
      validChildren.push(child)
    } else if (shouldThrow) {
      throw new Error(`Child elements of <${componentName} /> must include a \`key\``)
    }
  })
  return validChildren
}

export const noop = () => {}

export const useChildCallback = (cb: (el: HTMLDivElement) => void) => {
  const ref = useRef(cb)
  ref.current = cb
  return useCallback<(el: HTMLDivElement) => void>((element) => ref.current(element), [])
}

export type InsertMethod = "append" | "prepend"

export function computeNextRenderChildren<
  RenderChild extends { component: ReactElementWithKey; shouldRender: boolean },
>(
  propChildrenArray: ReactElementWithKey[],
  currentRenderChildren: RenderChild[],
  createDefaultRenderChildProps: (child: ReactElementWithKey) => RenderChild,
  insertMethod: InsertMethod,
): RenderChild[] {
  // Sets, not plain objects: a key such as "constructor" must not match an
  // inherited Object property
  const propChildKeys = new Set(propChildrenArray.map((child) => child.key))
  const currentRenderChildKeys = new Set(currentRenderChildren.map((child) => child.component.key))

  const newRenderChildren: RenderChild[] = propChildrenArray
    .filter((propChild) => !currentRenderChildKeys.has(propChild.key))
    .map(createDefaultRenderChildProps)

  const updatedCurrentChildren: RenderChild[] = currentRenderChildren.map((childProps) => ({
    ...childProps,
    component:
      propChildrenArray.find(({ key }) => key === childProps.component.key) || childProps.component,
    shouldRender: propChildKeys.has(childProps.component.key),
  }))

  return insertMethod === "append"
    ? updatedCurrentChildren.concat(newRenderChildren)
    : newRenderChildren.concat(updatedCurrentChildren)
}

export function assertSingleChildWhenRef(
  componentName: string,
  ref: React.Ref<unknown> | undefined,
  childrenCount: number,
): void {
  if ((isTest || isDev) && ref && childrenCount > 1) {
    throw new Error(`Cannot use forwardRef with multiple children in <${componentName} />`)
  }
}
