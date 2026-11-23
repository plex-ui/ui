import { type ReactNode } from "react"
import { SKIP, visit } from "unist-util-visit"
import { createId } from "../../lib/ids"
import { decodeBase64, encodeBase64 } from "../../lib/safeBase64"

type ValidDirectiveProps = { children?: string } & Partial<Record<string, unknown>>

export interface MarkdownDirective<T extends ValidDirectiveProps = ValidDirectiveProps> {
  directiveName: string
  render: (props: { attrs?: string; children?: ReactNode }) => ReactNode
  (props: T): string
}

export function createMarkdownDirective<T extends ValidDirectiveProps>({
  render,
  name,
  mode,
}: {
  render: (props: T) => ReactNode
  name: string
  mode: "inline" | "block"
}): MarkdownDirective<T> {
  const prefix = `OaiMdDirective_${name}`
  const uniqueName = createId(prefix, prefix.length + 6)

  function directive(props: T) {
    const { children, ...attributes } = props
    const attrs = Object.keys(attributes).length >= 0 ? `attrs="${encodeBase64(attributes)}"` : ""
    const leader = mode === "inline" ? " :" : "\n\n:::"

    return `${leader}${uniqueName}${children ? `[${children}]` : ""}{${attrs}}`
  }

  directive.directiveName = uniqueName
  directive.render = ({ children, attrs }: { children?: ReactNode; attrs?: string }) => {
    const parsedAttrs = attrs ? decodeBase64<T>(attrs) : ({} as T)
    return render({ ...parsedAttrs, children })
  }

  return directive
}

/**
 * A directive's attribute reaches its element only as a plain HTML attribute: a lowercase name (`title`, `data-*`,
 * `aria-*`), so never a DOM property such as `innerHTML` or React's `dangerouslySetInnerHTML`; never an event handler,
 * an inline style, a frame's document or `is`.
 */
const ATTRIBUTE_NAME = /^[a-z][a-z0-9-]*$/
const UNSAFE_ATTRIBUTE = /^(?:on|style$|srcdoc$|formaction$|is$)/

/** The attributes that load or open a URL: one with a protocol other than Markdown's safe ones is dropped. */
const URL_ATTRIBUTES = new Set(["href", "src", "action", "cite", "poster", "background", "ping", "data", "codebase"])
const SAFE_PROTOCOL = /^(?:https?|ircs?|mailto|xmpp|tel|sms)$/i

/** react-markdown's `defaultUrlTransform` test, with `tel:` and `sms:` as the Markdown's own transform. */
const isSafeUrl = (value: string) => {
  const colon = value.indexOf(":")
  const firstOf = (char: string) => value.indexOf(char)
  return (
    colon === -1 ||
    [firstOf("/"), firstOf("?"), firstOf("#")].some((index) => index !== -1 && colon > index) ||
    SAFE_PROTOCOL.test(value.slice(0, colon).trim())
  )
}

const safeAttributes = (attributes: Record<string, unknown> | null | undefined) =>
  Object.fromEntries(
    Object.entries(attributes ?? {}).filter(
      ([key, value]) =>
        ATTRIBUTE_NAME.test(key) &&
        !UNSAFE_ATTRIBUTE.test(key) &&
        !(URL_ATTRIBUTES.has(key) && !isSafeUrl(String(value ?? ""))),
    ),
  )

/**
 * Directives become elements only when the Markdown knows them: a `directives` entry or a `components` key, with
 * their attributes minus event handlers, `style` and `srcdoc`. Any other directive stays what was written: an inline
 * or leaf one its source text, a container one its content in a plain `div`. Text from elsewhere (a server, a user)
 * can't make an element of its choosing with attributes of its choosing.
 */
export function reactMarkdownRemarkDirective(options: { names?: Iterable<string> } = {}) {
  const names = new Set(options.names ?? [])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (tree: any, file?: { value?: unknown }) => {
    const source = file?.value == null ? "" : String(file.value)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    visit(tree, ["textDirective", "leafDirective", "containerDirective"], (node: any, index, parent: any) => {
      if (names.has(node.name)) {
        node.data = { hName: node.name, hProperties: safeAttributes(node.attributes), ...node.data }
        return
      }
      if (node.type === "containerDirective") {
        node.data = { hName: "div", hProperties: {}, ...node.data }
        return
      }
      if (!parent || typeof index !== "number") return
      const start = node.position?.start?.offset
      const end = node.position?.end?.offset
      const value =
        typeof start === "number" && typeof end === "number" && end <= source.length
          ? source.slice(start, end)
          : `${node.type === "leafDirective" ? "::" : ":"}${node.name}`
      const text = { type: "text", value }
      parent.children[index] = node.type === "leafDirective" ? { type: "paragraph", children: [text] } : text
      return SKIP
    })
  }
}
