"use client"

import clsx from "clsx"
import { useCallback, useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import { type Variants } from "../../types"
import { keepMovedFocus } from "../../lib/helpers"
import { Bold as BoldIcon, Italic as ItalicIcon, Link as LinkIcon, List as ListIcon, ListNumbers as ListNumbersIcon } from "../Icon"
import { Tooltip } from "../Tooltip"
import { Button } from "../Button"
import { Dialog } from "../Dialog"
import { Field } from "../Field"
import { Input } from "../Input"
import { getMarkRange, type Editor as CoreEditor } from "@tiptap/core"

import { useEditor, EditorContent } from "@tiptap/react"
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

import s from "@plexui/styles/components/MarkdownEditor/MarkdownEditor.module.css"

export const markdownEditorStyles = {
  toolbarButton: s.ToolbarButton,
}

export type MarkdownEditorProps = {
  /**
   * @default outline
   */
  variant?: Variants<"outline" | "soft">
  /**
   * @default false
   */
  disabled?: boolean
  /**
   * @default false
   */
  invalid?: boolean
  placeholder?: string
  /**
   * Controlled value as markdown string
   */
  value?: string
  /**
   * Default value as markdown string for uncontrolled mode
   */
  defaultValue?: string
  onChange?: (markdown: string) => void
  toolbarEnd?: React.ReactNode
  /**
   * @default 1
   */
  rows?: number
  className?: string
  id?: string
  /** Accessible name for the editor; a `<label for>` cannot name a contenteditable region */
  "aria-label"?: string
  /** Id of the element that names the editor, such as a Field label */
  "aria-labelledby"?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
}

// A link inserted as a text node, not as `<a>` HTML: the markdown parser runs
// with `html: false`, so HTML would land in the text as written
const linkText = (text: string, href: string) => ({
  type: "text",
  text,
  marks: [{ type: "link", attrs: { href } }],
})

type LinkSelection = { from: number; to: number; doc: CoreEditor["state"]["doc"] }

function LinkDialog({
  open, initialUrl, initialTitle, isEditing, disabled, onSave, onRemove, onCancel, onRestoreFocus,
}: {
  open: boolean
  initialUrl: string
  initialTitle: string
  isEditing: boolean
  disabled: boolean
  onSave: (url: string, title: string) => void
  onRemove: () => void
  onCancel: () => void
  onRestoreFocus: (event: Event) => void
}) {
  const [url, setUrl] = useState(initialUrl)
  const [title, setTitle] = useState(initialTitle)

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel() }}>
      <Dialog.Content width={450} mobileVariant="sheet" showClose={false}
        onOpenAutoFocus={() => {
          setUrl(initialUrl)
          setTitle(initialTitle)
        }}
        onCloseAutoFocus={onRestoreFocus}>
        <Dialog.Header><Dialog.Title>Link</Dialog.Title></Dialog.Header>
        <Dialog.Body>
          <div className={s.LinkDialogFields} onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing && event.target instanceof HTMLInputElement) {
              event.preventDefault()
              if (!disabled) onSave(url, title)
            }
          }}>
            <Field label="URL">
              <Input type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                placeholder="Enter URL" value={url} disabled={disabled} onChange={(event) => setUrl(event.target.value)} />
            </Field>
            <Field label="Link title">
              <Input placeholder="Enter link title" value={title} disabled={disabled} onChange={(event) => setTitle(event.target.value)} />
            </Field>
          </div>
        </Dialog.Body>
        <Dialog.Footer>
          {isEditing && <Button color="danger" variant="soft" disabled={disabled} onClick={onRemove}>Remove</Button>}
          <Button color="secondary" variant="soft" onClick={onCancel}>Cancel</Button>
          <Button color="primary" disabled={disabled} onClick={() => onSave(url, title)}>Save</Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  )
}

function ToolbarButton({
  tooltip,
  active,
  disabled,
  onClick,
  children,
}: {
  tooltip: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip content={tooltip} compact>
      <Button
        color="secondary" variant="ghost" size="2xs" iconSize="sm" uniform mobileMaterial="flat"
        className={s.ToolbarButton}
        data-active={active || undefined}
        selected={active}
        // Formatting buttons are toggles: announce their on/off state
        aria-pressed={active}
        onClick={onClick}
        disabled={disabled}
        aria-label={tooltip}
      >
        {children}
      </Button>
    </Tooltip>
  )
}

// Nodes of the HTML (hast) tree the first frame rewrites
type HtmlNode = {
  type: string
  tagName?: string
  value?: string
  properties?: Record<string, unknown>
  children?: HtmlNode[]
}

// The editor reads markdown with `html: false` (markdown-it): HTML is not parsed, its characters are text, and the
// markdown around and inside it still is
function remarkWithoutHtml(this: { data(): object }) {
  const data = this.data() as { micromarkExtensions?: unknown[] }
  ;(data.micromarkExtensions ??= []).push({ disable: { null: ["htmlFlow", "htmlText"] } })
}

// The editor's schema keeps paragraphs, lists, bold, italic, links and line breaks. ProseMirror parses anything else
// into them: a heading is a paragraph of its text, a code block a paragraph of its lines, a quote its paragraphs,
// inline code its text, an image or a rule nothing, and the text of a list item sits in a paragraph. Outside a code
// block it collapses white space, as the page does; the editor's text keeps its spaces (white-space: break-spaces)
const SCHEMA_AS_PARAGRAPH = new Set(["h1", "h2", "h3", "h4", "h5", "h6"])
const SCHEMA_BLOCKS = new Set(["p", "ul", "ol"])
const textOf = (node: HtmlNode): string => node.value ?? (node.children ?? []).map(textOf).join("")
const isBlank = (node: HtmlNode) => node.type === "text" && !node.value?.trim()
const lineBreak = (): HtmlNode => ({ type: "element", tagName: "br", properties: {}, children: [] })

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
    children: children.every((child) => child.type === "text" && !child.value) ? [lineBreak()] : children,
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

function toEditorSchema(nodes: HtmlNode[]): HtmlNode[] {
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
          if (index) content.push(lineBreak())
          if (line) content.push({ type: "text", value: line })
        })
        if (content[content.length - 1]!.tagName === "br") content.push(lineBreak())
        return [paragraph(content, { preserveWhiteSpace: true })]
      }
      case "blockquote":
        return toEditorSchema(children)
      case "p":
        return [paragraph(toEditorSchema(children))]
      case "li": {
        const content: HtmlNode[] = []
        let run: HtmlNode[] = []
        const flush = () => {
          if (!run.every(isBlank)) content.push(paragraph(run))
          run = []
        }
        for (const child of toEditorSchema(children)) {
          if (child.type === "element" && SCHEMA_BLOCKS.has(child.tagName!)) {
            flush()
            content.push(child)
          } else {
            run.push(child)
          }
        }
        flush()
        // A list item starts with a paragraph, an empty one if it has no text (an empty item, an image)
        if (content[0]?.tagName !== "p") content.unshift(paragraph([]))
        return [{ ...node, children: content }]
      }
      case "ul":
      case "ol":
        return [{ ...node, children: toEditorSchema(children).filter((child) => !isBlank(child)) }]
      default:
        return SCHEMA_AS_PARAGRAPH.has(node.tagName!)
          ? [paragraph(toEditorSchema(children))]
          : [{ ...node, children: toEditorSchema(children) }]
    }
  })
}
function rehypeEditorSchema() {
  return (tree: HtmlNode) => {
    tree.children = toEditorSchema(tree.children ?? []).filter((child) => !isBlank(child))
  }
}

/**
 * The content before the editor exists, on the server and in the first render (`immediatelyRender: false`): the
 * markdown as the editor will show it, in its schema and its own boxes (EditorContent's, then ProseMirror's), so the
 * page does not move when ProseMirror takes over. An empty editor shows its placeholder while it can be edited, as the
 * Placeholder extension does (`showOnlyWhenEditable`).
 */
function EditorFirstFrame({ markdown, placeholder, disabled }: { markdown: string; placeholder?: string; disabled: boolean }) {
  const hint = placeholder && !disabled
  return (
    <div>
      <div className={clsx("tiptap", s.EditorContent)}>
        {markdown.trim() ? (
          <ReactMarkdown remarkPlugins={[remarkWithoutHtml]} rehypePlugins={[rehypeEditorSchema]}>
            {markdown}
          </ReactMarkdown>
        ) : (
          <p className={hint ? "is-editor-empty" : undefined} data-placeholder={hint ? placeholder : undefined}>
            <br />
          </p>
        )}
      </div>
    </div>
  )
}

export function MarkdownEditor({
  variant = "outline",
  disabled = false,
  invalid = false,
  placeholder,
  value,
  defaultValue,
  onChange,
  toolbarEnd,
  rows = 1,
  className,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
  "aria-invalid": ariaInvalid,
}: MarkdownEditorProps) {
  const [focused, setFocused] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkDialogInitial, setLinkDialogInitial] = useState({ url: "", title: "" })
  const [activeMarks, setActiveMarks] = useState({
    bold: false, italic: false, link: false, orderedList: false, bulletList: false,
  })
  const [linkCanEnable, setLinkCanEnable] = useState(false)
  const isControlled = value !== undefined
  const suppressChangeRef = useRef(false)
  const linkSelection = useRef<LinkSelection | null>(null)
  const restoreEditorFocus = useRef(false)

  const syncToolbar = useCallback((e: { isActive: (name: string) => boolean; state: { selection: { empty: boolean } } }) => {
    setActiveMarks({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      link: e.isActive("link"),
      orderedList: e.isActive("orderedList"),
      bulletList: e.isActive("bulletList"),
    })
    setLinkCanEnable(!e.state.selection.empty || e.isActive("link"))
  }, [])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      Document,
      Paragraph,
      Text,
      HardBreak,
      BoldExtension,
      ItalicExtension,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer nofollow" },
      }),
      BulletList,
      OrderedList,
      ListItem,
      History,
      MarkdownExtension.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
      ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
    ],
    content: value ?? defaultValue ?? "",
    editable: !disabled,
    editorProps: {
      attributes: {
        class: s.EditorContent,
        role: "textbox",
        "aria-multiline": "true",
        ...(id && { id }),
        ...(ariaLabel && { "aria-label": ariaLabel }),
        ...(ariaLabelledby && { "aria-labelledby": ariaLabelledby }),
        ...(ariaDescribedby && { "aria-describedby": ariaDescribedby }),
        ...(ariaInvalid && { "aria-invalid": "true" }),
      },
    },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    onUpdate: ({ editor: e }) => {
      if (!e.isEditable && linkSelection.current) {
        linkSelection.current = null
        restoreEditorFocus.current = false
        setLinkDialogOpen(false)
      }
      if (suppressChangeRef.current) return
      const md = (e.storage as unknown as Record<string, { getMarkdown?: () => string }>).markdown?.getMarkdown?.() ?? ""
      onChange?.(md)
    },
    onSelectionUpdate: ({ editor: e }) => syncToolbar(e),
    onTransaction: ({ editor: e }) => {
      syncToolbar(e)
      if (linkSelection.current && linkSelection.current.doc !== e.state.doc) {
        linkSelection.current = null
        restoreEditorFocus.current = false
        setLinkDialogOpen(false)
      }
    },
  })

  useEffect(() => {
    if (!editor || !isControlled) return
    const currentMd = (editor.storage as unknown as Record<string, { getMarkdown?: () => string }>).markdown?.getMarkdown?.() ?? ""
    if (value !== currentMd) {
      suppressChangeRef.current = true
      editor.commands.setContent(value || "", { emitUpdate: false })
      suppressChangeRef.current = false
    }
  }, [editor, value, isControlled])

  useEffect(() => {
    if (editor) editor.setEditable(!disabled)
  }, [editor, disabled])

  const handleContainerMouseDown = useCallback((evt: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !editor) return
    const target = evt.target
    // Portals belong to the React tree, but never to the editor's click area.
    if (!(target instanceof Element) || !evt.currentTarget.contains(target)) return
    if (target.closest("button, [type='button'], [role='button'], a, input, label")) return
    // A press in the text places the caret there itself
    if (editor.view.dom.contains(target)) return
    if (editor.isFocused) return
    evt.preventDefault()
    editor.commands.focus("end")
  }, [editor, disabled])

  const openLinkDialog = useCallback(() => {
    if (!editor || disabled) return
    const url = editor.getAttributes("link").href ?? ""
    const selection = editor.state.selection
    const range = selection.empty && editor.isActive("link")
      ? getMarkRange(selection.$from, editor.schema.marks.link, { href: url })
      : selection
    if (!range) return
    linkSelection.current = { from: range.from, to: range.to, doc: editor.state.doc }
    restoreEditorFocus.current = true
    setLinkDialogInitial({ url, title: editor.state.doc.textBetween(range.from, range.to, "") })
    setLinkDialogOpen(true)
  }, [editor, disabled])

  const handleLinkSave = useCallback((url: string, title: string) => {
    const range = linkSelection.current
    if (!editor || disabled || !range) return
    setLinkDialogOpen(false)
    if (range.doc !== editor.state.doc) { restoreEditorFocus.current = false; return }
    linkSelection.current = null
    const selectedText = editor.state.doc.textBetween(range.from, range.to, "")
    const chain = editor.chain().setTextSelection({ from: range.from, to: range.to })
    if (!url) chain.unsetLink().run()
    else if (title && title !== selectedText) chain.insertContent(linkText(title, url)).run()
    else chain.setLink({ href: url }).run()
  }, [editor, disabled])

  const handleLinkRemove = useCallback(() => {
    const range = linkSelection.current
    if (!editor || disabled || !range) return
    setLinkDialogOpen(false)
    if (range.doc !== editor.state.doc) { restoreEditorFocus.current = false; return }
    linkSelection.current = null
    editor.chain().setTextSelection({ from: range.from, to: range.to }).unsetLink().run()
  }, [editor, disabled])

  const handleLinkCancel = useCallback(() => { setLinkDialogOpen(false) }, [])
  const handleRestoreFocus = useCallback((event: Event) => {
    keepMovedFocus(event)
    const shouldRestore = restoreEditorFocus.current && !event.defaultPrevented
    event.preventDefault()
    restoreEditorFocus.current = false
    linkSelection.current = null
    if (shouldRestore && editor && !editor.isDestroyed && !disabled) {
      const closingScope = event.target
      requestAnimationFrame(() => {
        if (editor.isDestroyed || !editor.isEditable) return
        const doc = editor.view.dom.ownerDocument
        const active = doc.activeElement
        if (active && active !== doc.body && !editor.view.dom.contains(active)
          && !(closingScope instanceof Node && closingScope.contains(active))) return
        // Check at the actual restore, then focus synchronously: Tiptap's
        // focus command queues another frame that could steal moved focus.
        editor.view.focus()
      })
    }
  }, [editor, disabled])

  const isInvalid = invalid || ariaInvalid
  const minHeight = 20 * rows + 16

  return (
    <div
      className={clsx(s.Container, className)}
      data-variant={variant}
      data-focused={focused}
      data-disabled={disabled ? "" : undefined}
      data-invalid={isInvalid ? "" : undefined}
      onMouseDown={handleContainerMouseDown}
    >
      <div className={s.Toolbar} onMouseDown={(e) => e.preventDefault()}>
        <div className={s.ToolbarGroup}>
          <ToolbarButton tooltip="Bold" active={activeMarks.bold} disabled={disabled} onClick={() => editor?.chain().focus().toggleBold().run()}>
            <BoldIcon />
          </ToolbarButton>
          <ToolbarButton tooltip="Italic" active={activeMarks.italic} disabled={disabled} onClick={() => editor?.chain().focus().toggleItalic().run()}>
            <ItalicIcon />
          </ToolbarButton>

          <div className={s.ToolbarSeparator} aria-hidden="true" />

          <ToolbarButton tooltip="Numbered list" active={activeMarks.orderedList} disabled={disabled} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
            <ListNumbersIcon />
          </ToolbarButton>
          <ToolbarButton tooltip="Bullet list" active={activeMarks.bulletList} disabled={disabled} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
            <ListIcon />
          </ToolbarButton>

          <div className={s.ToolbarSeparator} aria-hidden="true" />

          <ToolbarButton tooltip="Link" active={activeMarks.link} disabled={disabled || !linkCanEnable} onClick={openLinkDialog}>
            <LinkIcon />
          </ToolbarButton>

          {toolbarEnd && (
            <>
              <div className={s.ToolbarSeparator} aria-hidden="true" />
              <div className={s.ToolbarEnd}>{toolbarEnd}</div>
            </>
          )}
        </div>
      </div>

      <div className={s.Editor} style={{ minHeight }}>
        {editor ? <EditorContent editor={editor} /> : <EditorFirstFrame markdown={value ?? defaultValue ?? ""} placeholder={placeholder} disabled={disabled} />}
      </div>

      <LinkDialog
        open={linkDialogOpen}
        initialUrl={linkDialogInitial.url}
        initialTitle={linkDialogInitial.title}
        isEditing={!!linkDialogInitial.url}
        disabled={disabled}
        onRestoreFocus={handleRestoreFocus}
        onSave={handleLinkSave}
        onRemove={handleLinkRemove}
        onCancel={handleLinkCancel}
      />
    </div>
  )
}
