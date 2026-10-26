import { Comment, Fragment, Text, cloneVNode, type VNode, type VNodeArrayChildren } from "vue"

// Internal: Radix's `asChild` / `Slot` merge for slot vnodes, shared by the
// Tooltip and Popover triggers. Reka's slot merges the other way round (its
// handlers run first and cannot be cancelled), so the triggers merge their
// props onto the child themselves before Reka's parts see it.

type Handler = (...args: never[]) => unknown
type Props = Record<string, unknown>

const isHandler = (key: string) => /^on[A-Z]/.test(key)

const toHandlers = (value: unknown): Handler[] =>
  value == null ? [] : Array.isArray(value) ? value.flatMap(toHandlers) : [value as Handler]

/**
 * Radix's `composeEventHandlers`: runs the caller's handler(s), then `ours`
 * unless one of them called `preventDefault()`.
 */
export const composeEventHandlers =
  <E extends Event>(theirs: unknown, ours: (event: E) => void) =>
  (event: E) => {
    for (const handler of toHandlers(theirs)) (handler as (event: E) => unknown)(event)
    if (!event.defaultPrevented) ours(event)
  }

const isWhitespaceText = (node: VNode) => node.type === Text && !String(node.children ?? "").trim()

const flatten = (nodes: VNodeArrayChildren, out: VNode[]) => {
  for (const node of nodes) {
    if (node == null || typeof node === "boolean") continue
    if (Array.isArray(node)) flatten(node, out)
    else if (typeof node !== "object") out.push({ type: Text, children: String(node) } as VNode)
    else if (node.type === Fragment && Array.isArray(node.children)) flatten(node.children, out)
    else if (node.type !== Comment && !isWhitespaceText(node)) out.push(node)
  }
  return out
}

/** Slot content without fragments, comments and whitespace-only text. */
export const flattenSlot = (nodes: VNodeArrayChildren | undefined) => flatten(nodes ?? [], [])

/**
 * The element a Radix slot clones: the first child, when it is an element or
 * a component. Radix renders nothing for a text child, so neither does this.
 */
export const firstElementChild = (nodes: VNodeArrayChildren | undefined): VNode | undefined => {
  const [first] = flattenSlot(nodes)
  return first && first.type !== Text ? first : undefined
}

/**
 * Clones `child` with `slotProps` merged in the way Radix's Slot does it: the
 * child's own props win, classes are joined (slot first), styles are merged
 * (child last) and handlers both run, the child's first.
 */
export const mergeSlotProps = (child: VNode, slotProps: Props): VNode => {
  const merged: Props = { ...slotProps }

  for (const [key, childValue] of Object.entries(child.props ?? {})) {
    const slotValue = slotProps[key]

    if (isHandler(key) && slotValue != null && childValue != null) {
      merged[key] = [...toHandlers(childValue), ...toHandlers(slotValue)]
    } else if (key === "class" || key === "style") {
      merged[key] = [slotValue, childValue]
    } else {
      merged[key] = childValue
    }
  }

  // Start from empty props so the child's own values are not merged twice
  return cloneVNode({ ...child, props: {} } as VNode, merged)
}
