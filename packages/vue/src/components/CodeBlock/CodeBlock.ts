import { Fragment, Text, defineComponent, h, isVNode, normalizeStyle, type PropType, type VNodeArrayChildren } from "vue"
import { CopyButton } from "../Button/index.js"
import { renderHighlightedRows } from "./highlight.js"
import s from "@plexui/styles/components/CodeBlock/CodeBlock.module.css"

// Vue port of packages/ui/src/components/CodeBlock/CodeBlock.tsx. React's
// `CodeBlockBase.Code` / `CodeBlockBase.CopyButton` are flat exports here
// (`CodeBlockBaseCode`, `CodeBlockBaseCopyButton`): runtime-compiled
// templates cannot resolve dotted names from the `components` option.
//
// React takes the code as a string `children`. Here it is the text of the
// default slot (`<CodeBlock>{{ code }}</CodeBlock>`, interpolation keeps
// whitespace) or, when the slot is empty, the `code` prop.

/** Concatenates the text of slot vnodes (text, interpolations, v-for fragments). */
export const getSlotText = (nodes: VNodeArrayChildren | undefined): string => {
  let text = ""
  for (const node of nodes ?? []) {
    if (node == null || typeof node === "boolean") continue
    if (Array.isArray(node)) {
      text += getSlotText(node)
    } else if (!isVNode(node)) {
      text += String(node)
    } else if (node.type === Text) {
      text += String(node.children ?? "")
    } else if (node.type === Fragment && Array.isArray(node.children)) {
      text += getSlotText(node.children)
    }
    // Elements and comments carry no code: React's `children` is a string
  }
  return text
}

const resolveCode = (slotNodes: VNodeArrayChildren | undefined, code: string | undefined) => {
  const slotText = getSlotText(slotNodes)
  return slotText !== "" ? slotText : (code ?? "")
}

/** Root container. Every attribute falls through to the <div>, like React's rest props. */
export const CodeBlockBase = defineComponent({
  name: "CodeBlockBase",
  setup(_props, { slots }) {
    return () => h("div", { class: s.CodeBlock }, slots.default?.())
  },
})

/** Copy button pinned to the block. Like React, only `class` reaches the DOM. */
export const CodeBlockBaseCopyButton = defineComponent({
  name: "CodeBlockBaseCopyButton",
  inheritAttrs: false,
  props: {
    /** Value written to the clipboard */
    copyValue: { type: String, required: true },
    disabled: { type: Boolean, default: undefined },
    loading: { type: Boolean, default: undefined },
  },
  setup(props, { attrs }) {
    return () =>
      h("div", { class: [s.CopyButtonContainer, attrs.class] }, [
        h(CopyButton, {
          copyValue: props.copyValue,
          variant: "ghost",
          color: "secondary",
          pill: false,
          size: "2xs",
          uniform: true,
          loading: props.loading,
          disabled: props.disabled,
        }),
      ])
  },
})

/** Attributes for the <code> element (react-syntax-highlighter's `codeTagProps`). */
export type CodeTagProps = Record<string, unknown> & { class?: unknown; style?: unknown }

/** The highlighted <pre><code>. Like React, only `class` reaches the DOM from attributes. */
export const CodeBlockBaseCode = defineComponent({
  name: "CodeBlockBaseCode",
  inheritAttrs: false,
  props: {
    /** The code, when the default slot is empty */
    code: String,
    /** Prism language name */
    language: String,
    /**
     * Attributes for the <code> element. When set, they replace the default
     * `language-<language>` class (react-syntax-highlighter behaviour).
     */
    codeTagProps: Object as PropType<CodeTagProps>,
  },
  setup(props, { slots, attrs }) {
    return () => {
      const code = resolveCode(slots.default?.(), props.code)
      const { language, codeTagProps } = props

      // react-syntax-highlighter's default `codeTagProps`, then
      // `style = { whiteSpace: "pre", ...codeTagProps.style }`
      const codeProps = codeTagProps
        ? { ...codeTagProps, style: normalizeStyle([{ whiteSpace: "pre" }, codeTagProps.style as never]) }
        : { class: language ? `language-${language}` : undefined, style: { whiteSpace: "pre" } }

      return h("pre", { class: ["prismjs", s.SyntaxHighlighter, attrs.class] }, [
        h("code", codeProps, renderHighlightedRows(code, language)),
      ])
    }
  },
})

/** Code block with syntax highlighting and a copy button. */
export const CodeBlock = defineComponent({
  name: "CodeBlock",
  inheritAttrs: false,
  props: {
    /** The code, when the default slot is empty */
    code: String,
    /** Prism language name */
    language: String,
  },
  setup(props, { slots, attrs }) {
    return () => {
      const code = resolveCode(slots.default?.(), props.code)
      return h(CodeBlockBase, { class: attrs.class }, {
        default: () => [
          h(CodeBlockBaseCode, { language: props.language, code }),
          h(CodeBlockBaseCopyButton, { copyValue: code }),
        ],
      })
    }
  },
})

export type CodeBlockProps = InstanceType<typeof CodeBlock>["$props"]
