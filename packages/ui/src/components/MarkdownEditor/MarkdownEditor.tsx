"use client"

import clsx from "clsx"
import { useCallback, useEffect, useRef, useState } from "react"
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
        <EditorContent editor={editor} />
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
