import { Comment, Text, isVNode, type VNode, type VNodeArrayChildren, type VNodeChild } from "vue"

// The content a `code` vnode carries: an element's text children, or what a
// component's default slot returns (Markdown passes the raw React-style
// `children`, a string when the code is one text node).
const contentOf = (vnode: VNode): unknown => {
  const { children } = vnode
  if (typeof children === "string") return children
  if (children && typeof children === "object" && !Array.isArray(children)) {
    const slot = (children as { default?: unknown }).default
    return typeof slot === "function" ? slot() : undefined
  }
  return undefined
}

/**
 * Vue port of packages/ui/src/components/Markdown/useParseMarkdownPre.ts.
 * Takes what a `pre` override renders as children (its default slot) and
 * reads the code and language off the single `code` child.
 */
export function useParseMarkdownPre(children: VNodeChild | VNodeArrayChildren | undefined) {
  // React's `children`: a single child is the child itself, several are a list
  const child = Array.isArray(children) && children.length === 1 ? children[0] : children

  if (!child || typeof child !== "object" || !isVNode(child) || child.type === Text || child.type === Comment) {
    return { code: "", language: "text" }
  }

  const props = (child.props ?? {}) as Record<string, unknown>
  const content = contentOf(child)

  const code =
    typeof content === "string"
      ? content.replaceAll(/\n$/g, "") // remove trailing newlines
      : ""
  const language =
    typeof props.class === "string" ? (props.class.match(/language-(.*)$/)?.[1] ?? "text") : "text"

  return { code, language }
}
