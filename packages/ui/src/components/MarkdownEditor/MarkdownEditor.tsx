"use client"

import clsx from "clsx"
import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { type Variants } from "../../types"
import { Bold as BoldIcon, Italic as ItalicIcon, Link as LinkIcon, List as ListIcon, ListNumbers as ListNumbersIcon } from "../Icon"
import { Tooltip } from "../Tooltip"

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

import s from "./MarkdownEditor.module.css"

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

function LinkDialog({
  open,
  initialUrl,
  initialTitle,
  isEditing,
  onSave,
  onRemove,
  onCancel,
}: {
  open: boolean
  initialUrl: string
  initialTitle: string
  isEditing: boolean
  onSave: (url: string, title: string) => void
  onRemove: () => void
  onCancel: () => void
}) {
  const [url, setUrl] = useState(initialUrl)
  const [title, setTitle] = useState(initialTitle)
  const urlRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setUrl(initialUrl)
      setTitle(initialTitle)
      requestAnimationFrame(() => urlRef.current?.focus())
    }
  }, [open, initialUrl, initialTitle])

  const handleKeyDown = (evt: React.KeyboardEvent) => {
    if (evt.key === "Enter") {
      evt.preventDefault()
      onSave(url, title)
    }
    if (evt.key === "Escape") {
      evt.preventDefault()
      onCancel()
    }
  }

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <>
      <div className={s.LinkDialogOverlay} onClick={onCancel} />
      <div className={s.LinkDialogContent} role="dialog" aria-label="Link" onKeyDown={handleKeyDown}>
        <div className={s.LinkDialogBody}>
          <h3 className={s.LinkDialogTitle}>Link</h3>
          <div className={s.LinkDialogFields}>
            <div className={s.LinkDialogField}>
              <label className={s.LinkDialogLabel} htmlFor="md-editor-link-url">URL</label>
              <input
                ref={urlRef}
                id="md-editor-link-url"
                className={s.LinkDialogInput}
                type="url"
                placeholder="Enter URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className={s.LinkDialogField}>
              <label className={s.LinkDialogLabel} htmlFor="md-editor-link-title">Link title</label>
              <input
                id="md-editor-link-title"
                className={s.LinkDialogInput}
                type="text"
                placeholder="Enter link title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className={s.LinkDialogFooter}>
          {isEditing && (
            <button type="button" className={s.LinkDialogButtonRemove} onClick={onRemove}>
              Remove
            </button>
          )}
          <div className={s.LinkDialogFooterTrailing}>
            <button type="button" className={s.LinkDialogButtonCancel} onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className={s.LinkDialogButtonSave} onClick={() => onSave(url, title)}>
              Save
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
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
      <button
        type="button"
        className={s.ToolbarButton}
        data-active={active || undefined}
        // Formatting buttons are toggles: announce their on/off state
        aria-pressed={active}
        onClick={onClick}
        disabled={disabled}
        aria-label={tooltip}
      >
        {children}
      </button>
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
      if (suppressChangeRef.current) return
      const md = (e.storage as unknown as Record<string, { getMarkdown?: () => string }>).markdown?.getMarkdown?.() ?? ""
      onChange?.(md)
    },
    onSelectionUpdate: ({ editor: e }) => syncToolbar(e),
    onTransaction: ({ editor: e }) => syncToolbar(e),
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
    const target = evt.target as Element
    if (target.closest("button, [type='button'], [role='button'], a, input, label")) return
    if (editor.isFocused) return
    evt.preventDefault()
    editor.commands.focus("end")
  }, [editor, disabled])

  const openLinkDialog = useCallback(() => {
    if (!editor) return
    const url = editor.getAttributes("link").href ?? ""
    let title = ""
    if (!editor.state.selection.empty) {
      title = editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, "")
    } else if (editor.isActive("link")) {
      const { $from } = editor.state.selection
      const linkMark = $from.marks().find(m => m.type === editor.schema.marks.link)
      if (linkMark) {
        let start = $from.pos
        let end = $from.pos
        editor.state.doc.nodesBetween($from.start(), $from.end(), (node, pos) => {
          if (node.isText && node.marks.some(m => m.eq(linkMark))) {
            start = Math.min(start, pos)
            end = Math.max(end, pos + node.nodeSize)
          }
        })
        title = editor.state.doc.textBetween(start, end, "")
      }
    }
    setLinkDialogInitial({ url, title })
    setLinkDialogOpen(true)
  }, [editor])

  const handleLinkSave = useCallback((url: string, title: string) => {
    if (!editor) return
    setLinkDialogOpen(false)

    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }

    const { from, to, empty } = editor.state.selection
    const selectedText = empty ? "" : editor.state.doc.textBetween(from, to, "")
    const isOnExistingLink = editor.isActive("link")

    if (empty && !isOnExistingLink) {
      editor.chain().focus().insertContent(`<a href="${url}">${title || url}</a>`).run()
    } else if (isOnExistingLink) {
      editor.chain().focus().extendMarkRange("link").run()
      const linkRange = editor.state.selection
      if (title && title !== editor.state.doc.textBetween(linkRange.from, linkRange.to, "")) {
        editor.chain().focus().insertContentAt({ from: linkRange.from, to: linkRange.to }, `<a href="${url}">${title}</a>`).run()
      } else {
        editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
      }
    } else if (title && title !== selectedText) {
      editor.chain().focus().deleteSelection().insertContent(`<a href="${url}">${title}</a>`).run()
    } else {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }, [editor])

  const handleLinkRemove = useCallback(() => {
    if (!editor) return
    setLinkDialogOpen(false)
    editor.chain().focus().extendMarkRange("link").unsetLink().run()
  }, [editor])

  const handleLinkCancel = useCallback(() => {
    setLinkDialogOpen(false)
    editor?.commands.focus()
  }, [editor])

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
        onSave={handleLinkSave}
        onRemove={handleLinkRemove}
        onCancel={handleLinkCancel}
      />
    </div>
  )
}
