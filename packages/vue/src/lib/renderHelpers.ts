import { Comment, Fragment, Text, cloneVNode, h, isVNode, type VNode, type VNodeArrayChildren } from "vue"

// Port of packages/ui/src/lib/renderHelpers.tsx for slot vnodes.

// PatchFlags.STABLE_FRAGMENT: a compiled <template v-if> or <template v-for> item
const STABLE_FRAGMENT = 64

// React flattens arrays but keeps a <>fragment</> as one child. A compiled
// `<template v-if>` (or one `<template v-for>` item) is React's <>. The other
// fragments pass their children on like an array: a v-for list (React's
// `.map()`), the fragment <slot /> forwards content through (keyed
// `_<slot name>`), and nested arrays in render functions (Vue turns those
// into unflagged fragments, so `h(Fragment)` flattens too).
export const isTransparentFragment = (node: VNode) =>
  node.type === Fragment &&
  Array.isArray(node.children) &&
  !(node.patchFlag > 0 && node.patchFlag & STABLE_FRAGMENT && !(typeof node.key === "string" && node.key.startsWith("_")))

const flattenTextNodes = (children: VNodeArrayChildren): VNode[] => {
  const result: VNode[] = []
  let buffer = ""

  const flush = () => {
    if (buffer !== "") {
      result.push(h(Text, buffer))
      buffer = ""
    }
  }

  const visit = (nodes: VNodeArrayChildren) => {
    for (const node of nodes) {
      if (node == null || typeof node === "boolean") {
        continue
      }

      if (Array.isArray(node)) {
        visit(node)
        continue
      }

      if (typeof node === "string" || typeof node === "number") {
        buffer += String(node)
        continue
      }

      if (node.type === Comment) {
        continue
      }

      if (node.type === Text) {
        buffer += String(node.children ?? "")
        continue
      }

      if (isTransparentFragment(node)) {
        visit(node.children as VNodeArrayChildren)
        continue
      }

      // Boundary encountered: output any accumulated text, then the node
      flush()
      result.push(node)
    }
  }

  visit(children)
  flush()
  return result
}

const wrapChildrenOf = (node: VNode): VNode => {
  const { children } = node

  const isComponent = typeof node.type === "object" || typeof node.type === "function"

  // Element, fragment (React clones a <> with wrapped children too), or
  // component given an array, with child vnodes
  if ((typeof node.type === "string" || node.type === Fragment || isComponent) && Array.isArray(children)) {
    return withChildren(node, wrapTextNodeSiblings(children))
  }

  // Component (stateful or functional) with a default slot
  if (isComponent && children && typeof children === "object" && !Array.isArray(children)) {
    const { _: _compiled, ...slots } = children as Record<string, unknown>
    const defaultSlot = slots.default
    if (typeof defaultSlot === "function") {
      return withChildren(node, {
        ...slots,
        default: (...args: unknown[]) => wrapTextNodeSiblings(defaultSlot(...args)),
      })
    }
  }

  return node
}

const withChildren = (node: VNode, children: VNode["children"]) => {
  const clone = cloneVNode(node)
  clone.children = children
  // Children were rewritten, so compiler hints no longer apply: BAIL makes
  // the renderer drop them and diff this node in full
  clone.patchFlag = -2
  return clone
}

// Helper to wrap text node siblings of other elements in a tag,
// which enables sibling selectors to behave as expected for certain conditions
export const wrapTextNodeSiblings = (children: VNodeArrayChildren | undefined): VNode[] => {
  const flattenedChildren = flattenTextNodes(children ?? [])
  const childrenCount = flattenedChildren.length

  return flattenedChildren.map((child) => {
    if (child.type === Text) {
      const text = String(child.children ?? "")
      // Children with no siblings, and whitespace, are returned as is
      if (!text.trim() || childrenCount <= 1) {
        return child
      }

      // Wrap text nodes that have siblings
      return h("span", text)
    }

    return isVNode(child) ? wrapChildrenOf(child) : child
  })
}
