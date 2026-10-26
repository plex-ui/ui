import { Comment, Text, isVNode, type FunctionalComponent, type VNode, type VNodeArrayChildren, type VNodeChild } from "vue"
import { visit } from "unist-util-visit"
import { createId } from "../../lib/ids.js"
import { decodeBase64, encodeBase64 } from "../../lib/safeBase64.js"

type ValidDirectiveProps = { children?: string } & Partial<Record<string, unknown>>

export interface MarkdownDirective<T extends ValidDirectiveProps = ValidDirectiveProps> {
  directiveName: string
  /** Functional component Markdown renders the directive with */
  render: FunctionalComponent<{ attrs?: string }>
  (props: T): string
}

/**
 * React's rendered `children`: nothing, the text of a single text child, the
 * single vnode, or the list.
 */
const toChildren = (nodes: VNodeArrayChildren | undefined): string | VNode | VNodeArrayChildren | undefined => {
  if (!nodes || nodes.length === 0) return undefined
  if (nodes.length > 1) return nodes
  const [node] = nodes
  if (isVNode(node) && node.type === Text) return String(node.children ?? "")
  if (isVNode(node) && node.type === Comment) return undefined
  return isVNode(node) ? node : nodes
}

/**
 * Vue port of packages/ui/src/components/Markdown/directives.ts. `render`
 * gets the decoded attributes plus `children`: the directive's label as a
 * string when it is plain text, otherwise its vnodes.
 */
export function createMarkdownDirective<T extends ValidDirectiveProps>({
  render,
  name,
  mode,
}: {
  render: (props: T) => VNodeChild
  name: string
  mode: "inline" | "block"
}): MarkdownDirective<T> {
  const prefix = `OaiMdDirective_${name}`
  const uniqueName = createId(prefix, prefix.length + 6)

  function directive(props: T) {
    const { children, ...attributes } = props
    // Always true, as in React: the attributes are encoded even when empty
    const attrs = Object.keys(attributes).length >= 0 ? `attrs="${encodeBase64(attributes)}"` : ""
    const leader = mode === "inline" ? " :" : "\n\n:::"

    return `${leader}${uniqueName}${children ? `[${children}]` : ""}{${attrs}}`
  }

  const renderDirective: FunctionalComponent<{ attrs?: string }> = ({ attrs }, { slots }) => {
    const parsedAttrs = attrs ? decodeBase64<T>(attrs) : ({} as T)
    return render({ ...parsedAttrs, children: toChildren(slots.default?.()) })
  }
  // React's render reads only `attrs` and `children`: nothing falls through
  renderDirective.inheritAttrs = false

  directive.directiveName = uniqueName
  directive.render = renderDirective

  return directive
}

/** React's `reactMarkdownRemarkDirective`: directives become elements named after them. */
export function markdownRemarkDirective() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tree: any) => {
    visit(tree, ["textDirective", "leafDirective", "containerDirective"], (node) => {
      node.data = {
        hName: node.name,
        hProperties: node.attributes,
        ...node.data,
      }
      return node
    })
  }
}
