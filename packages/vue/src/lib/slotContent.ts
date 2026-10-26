import { Comment, Fragment, Text, type VNode, type VNodeArrayChildren } from "vue"

// A slot counts as content when it renders something, like a truthy
// ReactNode in React: comments (v-if placeholders) and empty text (a slot's
// "", which Vue turns into an empty Text vnode) do not count, also inside
// fragments.
export const hasContent = (nodes: VNodeArrayChildren | undefined): boolean =>
  !!nodes?.some((node) => {
    if (node == null || typeof node === "boolean") return false
    if (Array.isArray(node)) return hasContent(node)
    if (typeof node !== "object") return node !== ""
    const vnode = node as VNode
    if (vnode.type === Comment) return false
    if (vnode.type === Text) return vnode.children !== ""
    if (vnode.type === Fragment) return hasContent(vnode.children as VNodeArrayChildren)
    return true
  })
