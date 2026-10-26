import type { Element, ElementContent, Nodes, Parents, Root } from "hast"
import { toJsxRuntime, type Components } from "hast-util-to-jsx-runtime"
import { urlAttributes } from "html-url-attributes"
import remarkParse from "remark-parse"
import remarkRehype, { type Options as RemarkRehypeOptions } from "remark-rehype"
import { unified, type PluggableList } from "unified"
import { visit } from "unist-util-visit"
import type { Component, VNode } from "vue"
import { Fragment, jsx as vueJsx } from "vue/jsx-runtime"
import { isDev } from "../../lib/environment.js"
import { markdownDefaultUrlTransform, type UrlTransform } from "./urlTransform.js"

// Vue port of react-markdown 9.1.0 (`Markdown` in lib/index.js, the sync
// variant `import ReactMarkdown from "react-markdown"` resolves to): the same
// unified pipeline (remark-parse → remark plugins → remark-rehype → rehype
// plugins), the same tree filtering, then hast-util-to-jsx-runtime driving
// Vue's JSX runtime instead of React's. Deprecated react-markdown options are
// not ported: Plex's Markdown never passes them.

/** Filter elements: return `false` to drop `element`. */
export type AllowElement = (
  element: Readonly<Element>,
  index: number,
  parent: Readonly<Parents> | undefined,
) => boolean | null | undefined

/** Tag name → Vue component (or tag name) that renders it. */
export type MarkdownComponents = Record<string, Component | string>

export type MarkdownPipelineOptions = {
  allowElement?: AllowElement | null
  allowedElements?: ReadonlyArray<string> | null
  /** Markdown source */
  children?: string | null
  /** Wraps the output in a `div` with this class */
  className?: string | null
  components?: MarkdownComponents | null
  disallowedElements?: ReadonlyArray<string> | null
  rehypePlugins?: PluggableList | null
  remarkPlugins?: PluggableList | null
  remarkRehypeOptions?: Readonly<RemarkRehypeOptions> | null
  skipHtml?: boolean | null
  unwrapDisallowed?: boolean | null
  urlTransform?: UrlTransform | null
}

const emptyPlugins: PluggableList = []
const emptyRemarkRehypeOptions = { allowDangerousHtml: true }

// devlop's `unreachable`: throws in development, a no-op in production builds
const unreachable = (message: string) => {
  if (isDev) throw new Error(message)
}

type Props = Record<string, unknown> & { children?: unknown }
type VueJsx = (type: unknown, props: Props, key?: string) => VNode

// React DOM's URL handling (react-dom 19 `setProp` / `sanitizeURL`), which
// shapes the React DOM: `javascript:` URLs are replaced by an error-throwing
// one, and an empty `src` / `href` is not rendered (except `<a href="">`).
// An <img> keeps its raw `src`: React's `commitMount` sets `img.src` again
// after mount, over the sanitized attribute.
const isJavaScriptProtocol =
  /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i

/** React DOM's `sanitizeURL`. */
export const sanitizeUrl = <T>(url: T): T | string =>
  isJavaScriptProtocol.test("" + url)
    ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')"
    : url

const SANITIZED_ATTRIBUTES = ["src", "href", "action", "formaction", "xlink:href"]

const applyReactDomUrls = (tag: string, props: Props) => {
  for (const key of SANITIZED_ATTRIBUTES) {
    const value = props[key]
    if (typeof value !== "string") continue
    if (value === "" && (key === "src" || key === "href") && !(tag === "a" && key === "href")) {
      delete props[key]
    } else if (!(tag === "img" && key === "src")) {
      props[key] = sanitizeUrl(value)
    }
  }
}

/**
 * `vue/jsx-runtime`'s `jsx`, with React's `children` prop reaching Vue
 * components as a default slot function (a plain value warns "Non-function
 * value encountered for default slot"), fragments always getting an array,
 * and elements getting React DOM's URL handling.
 */
const create = (type: unknown, props: Props, key?: string): VNode => {
  if (typeof type === "string") {
    applyReactDomUrls(type.toLowerCase(), props)
  }
  if ("children" in props) {
    const children = props.children
    if (type === Fragment) {
      props.children = Array.isArray(children) ? children : [children]
    } else if (typeof type !== "string") {
      props.children = { default: () => children }
    }
  }
  return key === undefined ? (vueJsx as VueJsx)(type, props) : (vueJsx as VueJsx)(type, props, key)
}

function createProcessor(options: Readonly<MarkdownPipelineOptions>) {
  const rehypePlugins = options.rehypePlugins || emptyPlugins
  const remarkPlugins = options.remarkPlugins || emptyPlugins
  const remarkRehypeOptions = options.remarkRehypeOptions
    ? { ...options.remarkRehypeOptions, ...emptyRemarkRehypeOptions }
    : emptyRemarkRehypeOptions

  return unified().use(remarkParse).use(remarkPlugins).use(remarkRehype, remarkRehypeOptions).use(rehypePlugins)
}

function createFile(options: Readonly<MarkdownPipelineOptions>) {
  const children = options.children || ""
  if (typeof children !== "string") {
    unreachable("Unexpected value `" + children + "` for `children` prop, expected `string`")
  }
  return children
}

/** Renders markdown to a Vue vnode tree (react-markdown's `Markdown`). */
export function renderMarkdown(options: Readonly<MarkdownPipelineOptions>): VNode {
  const processor = createProcessor(options)
  const file = createFile(options)
  return post(processor.runSync(processor.parse(file), file) as Root, options)
}

function post(tree: Nodes, options: Readonly<MarkdownPipelineOptions>): VNode {
  const allowedElements = options.allowedElements
  const allowElement = options.allowElement
  const components = options.components
  const disallowedElements = options.disallowedElements
  const skipHtml = options.skipHtml
  const unwrapDisallowed = options.unwrapDisallowed
  const urlTransform = options.urlTransform || markdownDefaultUrlTransform

  if (allowedElements && disallowedElements) {
    unreachable("Unexpected combined `allowedElements` and `disallowedElements`, expected one or the other")
  }

  // Wrap in `div` if there's a class name.
  if (options.className) {
    tree = {
      type: "element",
      tagName: "div",
      properties: { className: options.className },
      // Assume no doctypes.
      children: (tree.type === "root" ? tree.children : [tree]) as ElementContent[],
    }
  }

  visit(tree, transform)

  return toJsxRuntime(tree, {
    Fragment,
    components: (components ?? undefined) as Partial<Components> | undefined,
    // Vue takes HTML attribute names (`class`, `for`) and CSS property names
    elementAttributeNameCase: "html",
    stylePropertyNameCase: "css",
    ignoreInvalidStyle: true,
    jsx: create as never,
    jsxs: create as never,
    passKeys: true,
    passNode: true,
  }) as unknown as VNode

  function transform(node: Nodes, index: number | undefined, parent: Parents | undefined) {
    if (node.type === "raw" && parent && typeof index === "number") {
      if (skipHtml) {
        parent.children.splice(index, 1)
      } else {
        parent.children[index] = { type: "text", value: node.value }
      }

      return index
    }

    if (node.type === "element") {
      let key: string
      for (key in urlAttributes) {
        if (Object.hasOwn(urlAttributes, key) && Object.hasOwn(node.properties, key)) {
          const value = node.properties[key]
          const test = urlAttributes[key]
          if (test === null || test.includes(node.tagName)) {
            node.properties[key] = urlTransform(String(value || ""), key, node)
          }
        }
      }
    }

    if (node.type === "element") {
      let remove = allowedElements
        ? !allowedElements.includes(node.tagName)
        : disallowedElements
          ? disallowedElements.includes(node.tagName)
          : false

      if (!remove && allowElement && typeof index === "number") {
        remove = !allowElement(node, index, parent)
      }

      if (remove && parent && typeof index === "number") {
        if (unwrapDisallowed && node.children) {
          parent.children.splice(index, 1, ...node.children)
        } else {
          parent.children.splice(index, 1)
        }

        return index
      }
    }
  }
}
