import type { PluggableList } from "unified"
import remarkBreaks from "remark-breaks"
import remarkDirective from "remark-directive"
import remarkGfm from "remark-gfm"
import { Text, computed, defineComponent, h, isVNode, normalizeClass, type Component, type PropType } from "vue"
import { CodeBlock, CodeBlockBase, CodeBlockBaseCode, getSlotText } from "../CodeBlock/CodeBlock.js"
import { CollapsibleCodeBlock } from "../CodeBlock/CollapsibleCodeBlock.js"
import { TextLink } from "../TextLink/index.js"
import { markdownRemarkDirective, type MarkdownDirective } from "./directives.js"
import { renderMarkdown, sanitizeUrl, type MarkdownComponents } from "./pipeline.js"
import { defaultUrlTransform, type UrlTransform } from "./urlTransform.js"
import { useMathPlugins } from "./useMathPlugins.js"
import { useParseMarkdownPre } from "./useParseMarkdownPre.js"
import s from "@plexui/styles/components/Markdown/Markdown.module.css"

// Vue port of packages/ui/src/components/Markdown/Markdown.tsx. React's
// react-markdown is replaced by the same unified pipeline rendered through
// Vue's JSX runtime (./pipeline.ts), so the elements, attributes and keys
// match. The markdown is the text of the default slot (interpolate a string,
// `{{ md }}`, so its newlines are kept) or, when the slot is empty, the
// `source` prop.

const supportsLookbehind = (() => {
  try {
    new RegExp("(?<=a)b")
    return true
  } catch {
    return false
  }
})()

/**
 * A component that renders one markdown element: it gets the hast `node`
 * prop, the element's attributes (`class`, `href`, ...) and its content as
 * the default slot. A tag name (`"span"`) works too.
 */
export type MarkdownComponent = Component | string

// Every markdown component gets the hast element as `node`; declaring it
// keeps it off the DOM
const nodeProps = { node: Object as PropType<Record<string, unknown>> }

const Pre = defineComponent({
  name: "MarkdownPre",
  inheritAttrs: false,
  props: nodeProps,
  setup(_props, { slots, attrs }) {
    return () => {
      const { code, language } = useParseMarkdownPre(slots.default?.())
      return h(CodeBlock, { language, class: attrs.class, code })
    }
  },
})

const InlineCode = defineComponent({
  name: "MarkdownInlineCode",
  inheritAttrs: false,
  props: nodeProps,
  setup(_props, { slots, attrs }) {
    return () => h("code", { class: [s.InlineCode, attrs.class] }, slots.default?.())
  },
})

const Anchor = defineComponent({
  name: "MarkdownAnchor",
  inheritAttrs: false,
  props: nodeProps,
  setup(_props, { slots, attrs }) {
    // React DOM sanitizes the href TextLink renders; Vue does not, so it happens here
    return () =>
      h(
        TextLink,
        { as: "a", ...attrs, ...(typeof attrs.href === "string" ? { href: sanitizeUrl(attrs.href) } : null) },
        { default: () => slots.default?.() },
      )
  },
})

// Sourced from common markdown implementations
const TableCell = defineComponent({
  name: "MarkdownTableCell",
  props: nodeProps,
  setup(_props, { slots }) {
    return () =>
      h(
        "td",
        null,
        (slots.default?.() ?? []).map((child) =>
          // Markdown does not support <br> tags in tables without parsing raw
          // HTML (which may not be safe), so we need to manually handle them
          isVNode(child) && child.type === Text && child.children === "<br>" ? h("br") : child,
        ),
      )
  },
})

const COMMON_COMPONENTS: MarkdownComponents = {
  code: InlineCode,
  pre: Pre,
  a: Anchor,
  td: TableCell,
}

const NonCopyableCodeBlock = defineComponent({
  name: "MarkdownNonCopyableCodeBlock",
  inheritAttrs: false,
  props: nodeProps,
  setup(_props, { slots, attrs }) {
    return () => {
      const { code, language } = useParseMarkdownPre(slots.default?.())
      return h(CodeBlockBase, { class: attrs.class }, { default: () => [h(CodeBlockBaseCode, { language, code })] })
    }
  },
})

const NON_COPYABLE_CODE_BLOCK_COMPONENTS: MarkdownComponents = {
  pre: NonCopyableCodeBlock,
}

const CollapsiblePre = defineComponent({
  name: "MarkdownCollapsiblePre",
  inheritAttrs: false,
  props: nodeProps,
  setup(_props, { slots, attrs }) {
    return () => {
      const { code, language } = useParseMarkdownPre(slots.default?.())
      return h(CollapsibleCodeBlock, { language, class: attrs.class, code })
    }
  },
})

const COLLAPSIBLE_CODE_BLOCK_COMPONENTS: MarkdownComponents = {
  pre: CollapsiblePre,
}

/** Renders markdown: GFM, directives, optional LaTeX, Plex code blocks and links. */
export const Markdown = defineComponent({
  name: "Markdown",
  // Like React, only `class` reaches the DOM (on the wrapping div)
  inheritAttrs: false,
  props: {
    /** Markdown source, used when the default slot is empty */
    source: String,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    directives: Array as PropType<MarkdownDirective<any>[]>,
    /** Determines if remark-math plugins should be loaded for rendering LaTeX. @default false */
    includeMath: { type: Boolean, default: false },
    /** Determines whether single newlines should insert <br> tags. @default false */
    breakNewLines: { type: Boolean, default: false },
    /** Tag name → component overrides, applied over the built-in ones */
    components: Object as PropType<Record<string, MarkdownComponent>>,
    remarkPlugins: Array as PropType<PluggableList>,
    rehypePlugins: Array as PropType<PluggableList>,
    allowedElements: Array as PropType<ReadonlyArray<string>>,
    disallowedElements: Array as PropType<ReadonlyArray<string>>,
    /** Rewrites URLs; the default drops unsafe protocols (`javascript:`), keeps `tel:` and `sms:` */
    urlTransform: { type: Function as PropType<UrlTransform | null>, default: defaultUrlTransform },
    skipHtml: { type: Boolean, default: false },
    /** @default true */
    copyableCodeBlocks: { type: Boolean, default: true },
    /** Determines if code blocks should use the collapsible view with "View Code" button. @default true */
    collapsibleCodeBlocks: { type: Boolean, default: true },
  },
  setup(props, { slots, attrs }) {
    const mathPlugins = useMathPlugins(() => props.includeMath)

    const mergedRemarkPlugins = computed(() => {
      const baseRemarkPlugins: PluggableList = [
        remarkDirective,
        markdownRemarkDirective,
        ...mathPlugins.value.remarkPlugins,
      ]

      if (props.breakNewLines) {
        baseRemarkPlugins.push(remarkBreaks)
      }

      // remark-gfm requires lookbehind support, which will throw in <= Safari 16.4
      // with no easily available polyfill.
      if (supportsLookbehind) {
        // Do not treat single tilde as strikethrough to allow for more
        // conversational use cases such as "~$20-$30"
        baseRemarkPlugins.push([remarkGfm, { singleTilde: false }])
      }

      return [...baseRemarkPlugins, ...(props.remarkPlugins ?? [])]
    })

    return () => {
      const slotText = getSlotText(slots.default?.())
      const source = slotText !== "" ? slotText : (props.source ?? "")

      const baseComponents: MarkdownComponents = {
        ...COMMON_COMPONENTS,
        ...(props.collapsibleCodeBlocks ? COLLAPSIBLE_CODE_BLOCK_COMPONENTS : null),
        ...(props.copyableCodeBlocks ? null : NON_COPYABLE_CODE_BLOCK_COMPONENTS),
        ...props.components,
      }
      const components =
        props.directives?.reduce((acc, directive) => {
          acc[directive.directiveName] = directive.render
          return acc
        }, baseComponents) ?? baseComponents

      return renderMarkdown({
        children: source,
        className: normalizeClass([s.MarkdownContent, attrs.class]),
        remarkPlugins: mergedRemarkPlugins.value,
        rehypePlugins: [...(props.rehypePlugins ?? []), ...mathPlugins.value.rehypePlugins],
        components,
        allowedElements: props.allowedElements,
        disallowedElements: props.disallowedElements,
        skipHtml: props.skipHtml,
        urlTransform: props.urlTransform,
      })
    }
  },
})

export type MarkdownProps = InstanceType<typeof Markdown>["$props"]
