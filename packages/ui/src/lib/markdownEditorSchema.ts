import { Extension, type AnyExtension } from "@tiptap/core"
import { defaultMarkdownSerializer } from "@tiptap/pm/markdown"
import { DOMParser as ProseMirrorDOMParser, type Mark, type Node as ProseMirrorNode, type Slice } from "@tiptap/pm/model"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import Document from "@tiptap/extension-document"
import Paragraph from "@tiptap/extension-paragraph"
import Text from "@tiptap/extension-text"
import BoldExtension from "@tiptap/extension-bold"
import ItalicExtension from "@tiptap/extension-italic"
import LinkExtension from "@tiptap/extension-link"
import BulletList from "@tiptap/extension-bullet-list"
import OrderedList from "@tiptap/extension-ordered-list"
import ListItem from "@tiptap/extension-list-item"
import History from "@tiptap/extension-history"
import Placeholder from "@tiptap/extension-placeholder"
import HardBreak from "@tiptap/extension-hard-break"
import { Markdown as MarkdownExtension } from "tiptap-markdown"

// The Markdown Editor's schema, shared by React and Vue: the TipTap extensions for the formats it offers, how its
// markdown is written, and the first frame (its markdown as the editor will show it, before the editor exists)

export type MarkdownEditorFormat = "bold" | "italic" | "orderedList" | "bulletList" | "link"

export const MARKDOWN_EDITOR_FORMATS: readonly MarkdownEditorFormat[] = ["bold", "italic", "orderedList", "bulletList", "link"]

export type MarkdownEditorSchema = {
  /** The formats the editor offers: a toolbar button, its shortcut and input rule, and a mark or node in the schema */
  formats: ReadonlySet<MarkdownEditorFormat>
  /** A single newline is a line break, read and written as one "\n" */
  breaks: boolean
}

export const markdownEditorSchema = (
  formats: readonly MarkdownEditorFormat[] = MARKDOWN_EDITOR_FORMATS,
  breaks = false,
): MarkdownEditorSchema => ({ formats: new Set(formats), breaks })

const LISTS = [
  ["bulletList", "ul"],
  ["orderedList", "ol"],
] as const

/* ------------------------------------------------------------------ */
/*  Writing markdown                                                   */
/* ------------------------------------------------------------------ */

type SerializerState = {
  out: string
  atBlockStart: boolean
  /** Inside a link written as an autolink, "<" and ">" around its URL */
  inAutolink?: boolean
  write: (content?: string) => void
  text: (text: string, escape?: boolean) => void
}

// Where the line after a line break starts in the markdown being written, and the paragraph it is in
const lineStarts = new WeakMap<SerializerState, { at: number; parent: ProseMirrorNode }>()

// A line break before more text: "\n" with `breaks`, otherwise a backslash and a newline, a line break in any
// markdown. Breaks at the end of a paragraph write nothing, as in tiptap-markdown. With `breaks`, "\n" ends a line of
// text; a line with none (the paragraph's first, or one between two breaks) would be blank and end the paragraph, so
// its break is a backslash and a newline too
const lineBreak = (breaks: boolean) =>
  HardBreak.extend({
    addStorage() {
      return {
        ...this.parent?.(),
        markdown: {
          serialize(state: SerializerState, node: ProseMirrorNode, parent: ProseMirrorNode, index: number) {
            for (let i = index + 1; i < parent.childCount; i++) {
              if (parent.child(i).type === node.type) continue
              let line = ""
              for (let j = index - 1; j >= 0 && parent.child(j).type !== node.type; j--) line = (parent.child(j).text ?? "") + line
              state.write(breaks && /[^ \t]/.test(line) ? "\n" : "\\\n")
              lineStarts.set(state, { at: state.out.length, parent })
              return
            }
          },
          parse: {},
        },
      }
    },
  })

// What opens a block at the start of a markdown line, after its white space: a "-" or "+" item, a "#" heading, a "1."
// or "1)" item. "*" is escaped wherever it is, ">" is written as "&gt;"
const LINE_OPENER = /^(?:\d+(?=[.)](?:[ \t]|$))|(?=-|\+(?:[ \t]|$)|#{1,6}(?:[ \t]|$)))/
// A line of "=" makes the line above it a heading
const HEADING_UNDERLINE = /^(?==+[ \t]*$)/
// A line of "|", ":" and at least one "-" makes the line above it the head of a table ("-" first is escaped already)
const TABLE_DELIMITER = /^(?=[|:][|: \t]*-[-|: \t]*$)/
// A character reference markdown reads as its character: "&" and a name, or "#" and at most seven decimal or six
// hexadecimal digits, then ";". Its "&" is written as "&amp;", so a typed "&lt;" stays those four characters
const CHARACTER_REFERENCE = /&(?=#\d{1,7};|#[xX][\da-fA-F]{1,6};|[A-Za-z][A-Za-z\d]{1,31};)/g
const escapeHtml = (text: string) =>
  text.replace(CHARACTER_REFERENCE, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

// A letter, a mark or a digit: a run of "_" between two of them is inside a word, where it opens no emphasis
const WORD_CHARACTER = /[\p{L}\p{M}\p{N}]/u

// Text escaped as prosemirror-markdown escapes it, but for "_": it keeps a "_" with a word character, or another "_",
// on each side, so "__s__" was "\__s_\_", read again as "_", an italic "s" and "_". A run of "_" stays as it is only
// inside a word, each "_" of any other is escaped
const writeEscaped = (state: SerializerState, text: string) => {
  let at = 0
  for (const run of text.matchAll(/_+/g)) {
    const end = run.index + run[0].length
    if (run.index > at) state.text(text.slice(at, run.index))
    const insideWord = WORD_CHARACTER.test(text[run.index - 1] ?? "") && WORD_CHARACTER.test(text[end] ?? "")
    state.text(insideWord ? run[0] : run[0].replace(/_/g, "\\_"), false)
    at = end
  }
  if (at < text.length) state.text(text.slice(at))
}

// Text as tiptap-markdown writes it (with "<" and ">" as entities, and the "&" of a character reference), escaping
// what would open a block at the start of a line, so the line keeps its text when the markdown is read again. After a
// line break the line continues the paragraph and is never code, so an opener is escaped after any white space, also
// white space written before it (a marked one is written outside its mark). At the start of a paragraph, as
// prosemirror-markdown does, after up to three spaces: four columns start code there, so white space that reaches
// them is not written (markdown would drop it anyway). The URL of an autolink is written as it is: markdown reads no
// escape or reference there
const EditorText = Text.extend({
  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        serialize(state: SerializerState, node: ProseMirrorNode, parent: ProseMirrorNode) {
          if (state.inAutolink) {
            state.atBlockStart = false
            return state.text(node.text ?? "", false)
          }
          let text = escapeHtml(node.text ?? "")
          // Four columns of white space start code at the start of a paragraph, and markdown drops less: none is written
          const leading = state.atBlockStart ? /^[ \t]*/.exec(text)![0] : ""
          if (leading.includes("\t") || leading.length >= 4) text = text.slice(leading.length)
          const lineStart = lineStarts.get(state)
          const afterBreak = lineStart?.parent === parent && !state.atBlockStart && /^[ \t]*$/.test(state.out.slice(lineStart.at))
          const space = (afterBreak ? /^[ \t]*/ : state.atBlockStart ? /^ {0,3}/ : null)?.exec(text)?.[0]
          const rest = space === undefined ? "" : text.slice(space.length)
          const opener =
            space === undefined
              ? null
              : LINE_OPENER.exec(rest) ?? (afterBreak ? HEADING_UNDERLINE.exec(rest) ?? TABLE_DELIMITER.exec(rest) : null)
          // The opener is escaped here; prosemirror-markdown's own escape at the start of a paragraph would escape it twice
          state.atBlockStart = false
          if (!opener) return writeEscaped(state, text)
          const at = space!.length + opener[0].length
          state.text(`${text.slice(0, at)}\\`, false)
          writeEscaped(state, text.slice(at))
        },
        parse: {},
      },
    }
  },
})

// A link as prosemirror-markdown writes it, but a line ending of its title is a character reference: markdown reads a
// title over two lines, and a pasted one can start a block on the second ("# h"), which would end the paragraph and
// the link with it when read again. The "&" of a reference in the title is written as "&amp;", as in text, and a
// backslash that would escape what follows (punctuation, the reference of a line ending, the closing quote) as two
const markdownLink = defaultMarkdownSerializer.marks.link!
const EditorLink = LinkExtension.extend({
  addStorage() {
    return {
      ...this.parent?.(),
      markdown: {
        serialize: {
          ...markdownLink,
          close(state: SerializerState, mark: Mark, parent: ProseMirrorNode, index: number) {
            const title = mark.attrs.title as string | null | undefined
            const attrs = title
              ? {
                  ...mark.attrs,
                  title: title
                    .replace(/\\(?=[!-/:-@[-`{-~\r\n]|$)/g, "\\\\")
                    .replace(CHARACTER_REFERENCE, "&amp;")
                    .replace(/\r\n?|\n/g, "&#10;"),
                }
              : mark.attrs
            return (markdownLink.close as (...args: unknown[]) => string)(state, { ...mark, attrs }, parent, index)
          },
        },
        parse: {},
      },
    }
  },
})

// An item of a list the editor offers. An item of the other list is its paragraphs, not an item of the offered one,
// which ProseMirror would otherwise wrap it in
const listItemOf = (tags: ReadonlySet<string>) =>
  ListItem.extend({
    parseHTML() {
      return [{ tag: "li", getAttrs: (element: HTMLElement) => (tags.has(element.parentElement?.localName ?? "") ? null : false) }]
    },
  })

/* ------------------------------------------------------------------ */
/*  Pasting text                                                       */
/* ------------------------------------------------------------------ */

// The parts of markdown-it and of tiptap-markdown's parser that pasting uses
type MarkdownItToken = { type: string; tag: string; nesting: number; markup: string; content: string; children: MarkdownItToken[] | null }
type InlineState = { pos: number; src: string; push: (type: string, tag: string, nesting: number) => MarkdownItToken }
type InlineRule = (state: InlineState, silent: boolean) => boolean
type BlockState = { src: string; bMarks: number[]; tShift: number[] }
type BlockRule = (state: BlockState, startLine: number, endLine: number, silent: boolean) => boolean
type Ruler<Rule> = {
  __rules__: { name: string; fn: Rule; alt: string[] }[]
  at: (name: string, fn: Rule, options: { alt: string[] }) => void
}
type MarkdownIt = {
  options: { linkify?: boolean; breaks?: boolean }
  disable: (rules: string[]) => MarkdownIt
  core: { ruler: { after: (rule: string, name: string, fn: (state: { tokens: MarkdownItToken[] }) => void) => void } }
  block: { ruler: Ruler<BlockRule> }
  inline: { ruler: Ruler<InlineRule> }
}

// Runs `wrap` in place of a markdown-it rule, which it can call, keeping the rule's place in the chains it ends
// (its `alt`, which Ruler.at would otherwise empty)
function wrapRule<Rule>(ruler: Ruler<Rule>, name: string, wrap: (rule: Rule) => Rule) {
  const { fn, alt } = ruler.__rules__.find((rule) => rule.name === name)!
  ruler.at(name, wrap(fn), { alt: [...alt] })
}
type MarkdownParser = {
  md: MarkdownIt
  parse: (content: string, options: { inline: boolean }) => string
  withPatchedRenderer: (md: MarkdownIt) => MarkdownIt
}

// Blocks and inlines the editor never offers: pasted, their markers stay text, as typed. An image is read as one and
// kept as its source text (pasteMarkdownIt)
const NEVER_OFFERED = ["heading", "lheading", "blockquote", "code", "fence", "hr", "table", "backticks", "strikethrough"]


// The markdown-it that reads pasted text when a format is left out: the editor's own (its options and tiptap-markdown's
// renderer), without the rules of the formats left out and of the blocks never offered. An image is its source text,
// all of it, as markdown-it reads it (disabled, its "[...](...)" would be a link where links are offered). With one
// list left out, a line its marker opens is no list (and does not end a paragraph); with one of bold and italic left
// out, its delimiters are turned back into text
function pasteMarkdownIt(editorMd: MarkdownIt, parser: MarkdownParser, formats: ReadonlySet<MarkdownEditorFormat>) {
  const MarkdownItClass = editorMd.constructor as new (options: object) => MarkdownIt
  const md = parser.withPatchedRenderer(
    new MarkdownItClass({ html: false, linkify: editorMd.options.linkify, breaks: editorMd.options.breaks }),
  )
  const rules = [...NEVER_OFFERED]
  if (!formats.has("link")) rules.push("link", "autolink", "reference")
  if (!LISTS.some(([format]) => formats.has(format))) rules.push("list")
  if (!formats.has("bold") && !formats.has("italic")) rules.push("emphasis")
  md.disable(rules)
  wrapRule(md.inline.ruler, "image", (image) => (state, silent) => {
    const start = state.pos
    if (!image(state, true)) return false
    if (!silent) state.push("text", "", 0).content = state.src.slice(start, state.pos)
    return true
  })
  if (formats.has("bulletList") !== formats.has("orderedList")) {
    wrapRule(md.block.ruler, "list", (list) => (state, startLine, endLine, silent) => {
      const marker = state.src.charCodeAt(state.bMarks[startLine]! + state.tShift[startLine]!)
      const ordered = marker >= 0x30 && marker <= 0x39
      if (!formats.has(ordered ? "orderedList" : "bulletList")) return false
      return list(state, startLine, endLine, silent)
    })
  }
  if (formats.has("bold") !== formats.has("italic")) {
    const leftOut = formats.has("bold") ? ["em_open", "em_close"] : ["strong_open", "strong_close"]
    md.core.ruler.after("inline", "left_out_emphasis", ({ tokens }) => {
      for (const token of tokens.flatMap((block) => block.children ?? [])) {
        if (!leftOut.includes(token.type)) continue
        Object.assign(token, { type: "text", tag: "", nesting: 0, content: token.markup })
      }
    })
  }
  return md
}

// Pasted text is read as markdown, as tiptap-markdown does, but the syntax of a format left out stays text with its
// markers, as it does when typed: "- one" pasted where lists are left out is the line "- one", not "one". Before
// tiptap-markdown's paste (its plugin comes later); pasted HTML and a plain-text paste (Shift) are left to it
const leftOutSyntaxPaste = (formats: ReadonlySet<MarkdownEditorFormat>) =>
  Extension.create({
    name: "markdownEditorPaste",
    priority: 1000,
    addProseMirrorPlugins() {
      const { editor } = this
      let md: MarkdownIt | undefined
      return [
        new Plugin({
          key: new PluginKey("markdownEditorPaste"),
          props: {
            clipboardTextParser(text, context, plainText) {
              // No slice: the next parser reads it
              if (plainText) return null as unknown as Slice
              const { parser } = (editor.storage as unknown as { markdown: { parser: MarkdownParser } }).markdown
              const editorMd = parser.md
              md ??= pasteMarkdownIt(editorMd, parser, formats)
              let html: string
              parser.md = md
              try {
                html = parser.parse(text, { inline: true })
              } finally {
                parser.md = editorMd
              }
              const body = new window.DOMParser().parseFromString(`<body>${html}</body>`, "text/html").body
              return ProseMirrorDOMParser.fromSchema(editor.schema).parseSlice(body, { preserveWhitespace: true, context })
            },
          },
        }),
      ]
    },
  })

/**
 * The editor's extensions. A format left out has no mark or node: its shortcut and input rule are gone, in pasted text
 * its markers stay text, as typed, and pasted HTML and incoming markdown keep its text without it, so the markdown
 * going out does not write it either.
 */
export const markdownEditorExtensions = ({ formats, breaks }: MarkdownEditorSchema, placeholder?: string): AnyExtension[] => {
  const lists = LISTS.filter(([format]) => formats.has(format))
  return [
    ...(MARKDOWN_EDITOR_FORMATS.every((format) => formats.has(format)) ? [] : [leftOutSyntaxPaste(formats)]),
    Document,
    Paragraph,
    EditorText,
    lineBreak(breaks),
    ...(formats.has("bold") ? [BoldExtension] : []),
    ...(formats.has("italic") ? [ItalicExtension] : []),
    ...(formats.has("link")
      ? [EditorLink.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer nofollow" } })]
      : []),
    ...(formats.has("bulletList") ? [BulletList] : []),
    ...(formats.has("orderedList") ? [OrderedList] : []),
    ...(lists.length === LISTS.length ? [ListItem] : lists.length ? [listItemOf(new Set(lists.map(([, tag]) => tag)))] : []),
    History,
    MarkdownExtension.configure({ html: false, breaks, transformPastedText: true, transformCopiedText: true }),
    ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
  ]
}

/* ------------------------------------------------------------------ */
/*  First frame                                                        */
/* ------------------------------------------------------------------ */

// Nodes of the markdown (mdast) and HTML (hast) trees the first frame rewrites
type MarkdownNode = {
  type: string
  value?: string
  position?: { start: { offset?: number }; end: { offset?: number } }
  children?: MarkdownNode[]
}
type HtmlNode = {
  type: string
  tagName?: string
  value?: string
  properties?: Record<string, unknown>
  children?: HtmlNode[]
}

// The editor reads markdown with `html: false` (markdown-it): HTML is not parsed, its characters are text, and the
// markdown around and inside it still is
export function remarkWithoutHtml(this: { data(): object }) {
  const data = this.data() as { micromarkExtensions?: unknown[] }
  ;(data.micromarkExtensions ??= []).push({ disable: { null: ["htmlFlow", "htmlText"] } })
}

// The newlines of a text node's source, in order: a line ending, or a character reference markdown-it reads as a
// newline in the text (of at most seven decimal or six hexadecimal digits). A backslash escape is neither, so
// "\\&#10;" is no reference
const SOURCE_NEWLINES = /\\[\s\S]|&(?:#0{0,5}1[03]|#[xX]0{0,5}[aAdD]|NewLine);|\r\n?|\n/g

// With `breaks`, markdown-it reads a line ending in a paragraph as a line break (a newline from a character reference
// stays text). It drops the spaces at the end of the line, keeping a tab before them, and the spaces and tabs at the
// start of the next one. remark drops the white space at the end of a line from the text, so it is taken from the source
export function remarkLineBreaks() {
  return (tree: MarkdownNode, file: { value?: unknown }) => {
    const source = String(file.value ?? "")
    const split = (node: MarkdownNode): MarkdownNode[] => {
      if (node.type !== "text") {
        if (node.children) node.children = node.children.flatMap(split)
        return [node]
      }
      const value = node.value ?? ""
      const { start, end } = node.position ?? {}
      const raw = start?.offset !== undefined && end?.offset !== undefined ? source.slice(start.offset, end.offset) : value
      // The newlines of the value in order: the source of each (a line ending or a reference) and, for a line ending,
      // the white space before it
      const newlines = [...raw.matchAll(SOURCE_NEWLINES)]
        .filter(([match]) => !match.startsWith("\\"))
        .map((match) => ({ source: match[0], before: /[ \t]*$/.exec(raw.slice(0, match.index))![0] }))
      const lines = [""]
      let index = 0
      for (let at = value.slice(index).search(/[\r\n]/); at >= 0; at = value.slice(index).search(/[\r\n]/)) {
        const newline = newlines.shift() ?? { source: "\n", before: "" }
        if (newline.source.startsWith("&")) {
          lines[lines.length - 1] += value.slice(index, index + at + 1)
          index += at + 1
          continue
        }
        // The end of the line as markdown-it reads it: the white space remark dropped, without its spaces at the end
        // (white space from a character reference is text, and stays)
        lines[lines.length - 1] += value.slice(index, index + at) + newline.before.replace(/ +$/, "")
        lines.push("")
        index += at + (newline.source === "\r\n" && value.startsWith("\r\n", index + at) ? 2 : 1)
      }
      lines[lines.length - 1] += value.slice(index)
      return lines.flatMap((line, at) => {
        const text = at ? line.replace(/^[ \t]+/, "") : line
        return [...(at ? [{ type: "break" }] : []), ...(text ? [{ ...node, value: text }] : [])]
      })
    }
    split(tree)
  }
}

// The editor's schema keeps paragraphs, line breaks and the formats it offers. ProseMirror parses anything else into
// them: a heading is a paragraph of its text, a code block a paragraph of its lines, a quote its paragraphs, inline
// code its text, an image or a rule nothing, the text of a list item sits in a paragraph, a mark left out is its text
// and a list left out its items' paragraphs. Outside a code block it collapses white space, as the page does; the
// editor's text keeps its spaces (white-space: break-spaces)
const SCHEMA_AS_PARAGRAPH = new Set(["h1", "h2", "h3", "h4", "h5", "h6"])
const SCHEMA_BLOCKS = new Set(["p", "ul", "ol"])
const MARKS = new Map<string, MarkdownEditorFormat>([["strong", "bold"], ["em", "italic"], ["a", "link"]])
const textOf = (node: HtmlNode): string => node.value ?? (node.children ?? []).map(textOf).join("")
const isBlank = (node: HtmlNode) => node.type === "text" && !node.value?.trim()
const lineBreakElement = (): HtmlNode => ({ type: "element", tagName: "br", properties: {}, children: [] })

// White space of a paragraph's text as ProseMirror parses it: runs collapse to one space, none at the start of the
// paragraph, after a line break or after another space, none at its end
function collapseWhiteSpace(children: HtmlNode[]) {
  let previous: HtmlNode | null = null
  let lineStart = true
  const walk = (nodes: HtmlNode[]) => {
    for (const node of nodes) {
      if (node.type === "text") {
        let value = (node.value ?? "").replace(/[ \t\r\n\f]+/g, " ")
        if (value.startsWith(" ") && (lineStart || previous?.value?.endsWith(" "))) value = value.slice(1)
        node.value = value
        if (value) {
          previous = node
          lineStart = false
        }
      } else if (node.tagName === "br") {
        lineStart = true
      } else {
        walk(node.children ?? [])
      }
    }
  }
  walk(children)
  if (previous) (previous as HtmlNode).value = (previous as HtmlNode).value!.replace(/ $/, "")
}

const paragraph = (children: HtmlNode[], { preserveWhiteSpace = false } = {}): HtmlNode => {
  if (!preserveWhiteSpace) collapseWhiteSpace(children)
  return {
    type: "element",
    tagName: "p",
    properties: {},
    // An empty paragraph keeps its line, as ProseMirror's trailing break does
    children: children.every((child) => child.type === "text" && !child.value) ? [lineBreakElement()] : children,
  }
}

// tiptap-markdown drops the newline markdown-it writes after an element, outside a code block: a line that follows
// bold, a link or code joins it without a space
const dropNewlineAfterElements = (nodes: HtmlNode[]) =>
  nodes.map((node, index) =>
    index && node.type === "text" && nodes[index - 1]!.type === "element" && node.value?.startsWith("\n")
      ? { ...node, value: node.value.slice(1) }
      : node,
  )

function toEditorSchema(nodes: HtmlNode[], formats: ReadonlySet<MarkdownEditorFormat>): HtmlNode[] {
  // The blocks of a list item: its text in paragraphs, around its lists
  const itemBlocks = (children: HtmlNode[]) => {
    const content: HtmlNode[] = []
    let run: HtmlNode[] = []
    const flush = () => {
      if (!run.every(isBlank)) content.push(paragraph(run))
      run = []
    }
    for (const child of toEditorSchema(children, formats)) {
      if (child.type === "element" && SCHEMA_BLOCKS.has(child.tagName!)) {
        flush()
        content.push(child)
      } else {
        run.push(child)
      }
    }
    flush()
    return content
  }

  return dropNewlineAfterElements(nodes).flatMap((node): HtmlNode[] => {
    if (node.type !== "element") return [node]
    const children = node.children ?? []
    switch (node.tagName) {
      case "img":
      case "hr":
        return []
      case "code":
        return [{ type: "text", value: textOf(node) }]
      case "pre": {
        // ProseMirror keeps a code block's spaces and its newlines as line breaks, the last one followed by the
        // trailing break of a paragraph that ends in a break
        const lines = textOf(node).split("\n")
        if (lines.every((line) => !line)) return []
        const content: HtmlNode[] = []
        lines.forEach((line, index) => {
          if (index) content.push(lineBreakElement())
          if (line) content.push({ type: "text", value: line })
        })
        if (content[content.length - 1]!.tagName === "br") content.push(lineBreakElement())
        return [paragraph(content, { preserveWhiteSpace: true })]
      }
      case "blockquote":
        return toEditorSchema(children, formats)
      case "p":
        return [paragraph(toEditorSchema(children, formats))]
      case "li": {
        const content = itemBlocks(children)
        // A list item starts with a paragraph, an empty one if it has no text (an empty item, an image)
        if (content[0]?.tagName !== "p") content.unshift(paragraph([]))
        return [{ ...node, children: content }]
      }
      case "ul":
      case "ol": {
        const items = children.filter((child) => child.tagName === "li")
        return formats.has(node.tagName === "ul" ? "bulletList" : "orderedList")
          ? [{ ...node, children: toEditorSchema(items, formats) }]
          : items.flatMap((item) => itemBlocks(item.children ?? []))
      }
      default: {
        const mark = MARKS.get(node.tagName!)
        if (mark && !formats.has(mark)) return toEditorSchema(children, formats)
        return SCHEMA_AS_PARAGRAPH.has(node.tagName!)
          ? [paragraph(toEditorSchema(children, formats))]
          : [{ ...node, children: toEditorSchema(children, formats) }]
      }
    }
  })
}

/**
 * The first frame's HTML in the editor's schema. A document left with no block is the empty paragraph ProseMirror
 * gives it, with the placeholder the editor would show (`placeholder` only while it can be edited).
 */
export const rehypeEditorSchema = ({ formats }: MarkdownEditorSchema, placeholder?: string) =>
  function editorSchema() {
    return (tree: HtmlNode) => {
      const blocks = toEditorSchema(tree.children ?? [], formats).filter((child) => !isBlank(child))
      tree.children = blocks.length
        ? blocks
        : [{
            ...paragraph([]),
            properties: placeholder ? { className: ["is-editor-empty"], dataPlaceholder: placeholder } : {},
          }]
    }
  }
