import { Comment, Fragment, shallowRef, type VNode } from "vue"
import type { InsertMethod } from "./shared.js"

export type RenderChild = {
  key: PropertyKey
  vnode: VNode
  shouldRender: boolean
  preventMountTransition?: boolean
}

export const isPlaceholder = (vnode: VNode) => vnode.type === Comment

/**
 * Expands fragments, so `v-for` (compiled to a fragment of keyed vnodes)
 * yields the keyed children, as React flattens arrays of children.
 */
export const flattenChildren = (vnodes: VNode[]): VNode[] =>
  vnodes.flatMap((vnode) =>
    vnode.type === Fragment && Array.isArray(vnode.children) ? flattenChildren(vnode.children as VNode[]) : [vnode],
  )

/**
 * The keyed child bookkeeping of React's TransitionGroup
 * (`computeNextRenderChildren`): children that leave stay rendered with
 * `shouldRender: false` until their exit completes and they are removed.
 */
export function useChildList(componentName: string) {
  let list: RenderChild[] | null = null
  // Bumped when an exited child is removed, to re-render without it
  const removals = shallowRef(0)

  const remove = (key: PropertyKey) => {
    list = (list ?? []).filter((child) => child.key !== key)
    removals.value += 1
  }

  const keyedChildren = (children: VNode[]) => {
    const keyed = children.filter((vnode) => !isPlaceholder(vnode))
    for (const vnode of keyed) {
      if (vnode.key == null) {
        throw new Error(`Child elements of <${componentName} /> must include a \`key\``)
      }
    }
    return keyed
  }

  const next = (propChildren: VNode[], insertMethod: InsertMethod, preventInitialTransition: boolean) => {
    void removals.value

    if (list === null) {
      // Lock preventMountTransition to its value on the first render
      list = propChildren.map((vnode) => ({
        key: vnode.key!,
        vnode,
        shouldRender: true,
        preventMountTransition: preventInitialTransition,
      }))
      return list
    }

    const propKeys = new Set(propChildren.map((vnode) => vnode.key))
    const currentKeys = new Set(list.map((child) => child.key))
    const added = propChildren
      .filter((vnode) => !currentKeys.has(vnode.key!))
      .map((vnode) => ({ key: vnode.key!, vnode, shouldRender: true }))
    const updated = list.map((child) => ({
      ...child,
      vnode: propChildren.find((vnode) => vnode.key === child.key) ?? child.vnode,
      shouldRender: propKeys.has(child.key),
    }))
    list = insertMethod === "append" ? updated.concat(added) : added.concat(updated)
    return list
  }

  return { keyedChildren, next, remove }
}
