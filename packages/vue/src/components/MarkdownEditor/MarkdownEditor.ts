import {
  defineComponent,
  h,
  reactive,
  ref,
  watch,
  type Component,
  type PropType,
} from "vue"
import { EditorContent, useEditor } from "@tiptap/vue-3"
import { getMarkRange, type Editor as CoreEditor } from "@tiptap/core"
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
import type { Variants } from "@plexui/styles/types"
import { keepMovedFocus } from "../../lib/helpers.js"
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Link as LinkIcon,
  List as ListIcon,
  ListNumbers as ListNumbersIcon,
} from "../Icon/index.js"
import { Tooltip } from "../Tooltip/index.js"
import { Button } from "../Button/index.js"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from "../Dialog/index.js"
import { Field } from "../Field/index.js"
import { Input } from "../Input/index.js"
import { flattenSlot } from "../Tooltip/slot.js"
import s from "@plexui/styles/components/MarkdownEditor/MarkdownEditor.module.css"

// Vue port of packages/ui/src/components/MarkdownEditor/MarkdownEditor.tsx on
// @tiptap/vue-3 with the same extensions, configured the same way, so
// ProseMirror renders the same DOM and tiptap-markdown emits the same markdown.
//
// - The editor is created on mount (@tiptap/vue-3's `useEditor`, like React's
//   `immediatelyRender: false`) and destroyed on unmount.
// - Value: `value` + `update:value` (`v-model:value`) and `change` mirror
//   React's `value` + `onChange`; `default-value` is the uncontrolled start.
//   As in React, a controlled value is only pushed into the editor when it
//   changes and differs from the editor's markdown.
// - As in React, `update:value` / `change` also fire once when the editor is
//   created and whenever `disabled` changes (`setEditable` emits an update).
// - Options React reads only when it creates the editor (`placeholder`, the
//   initial content) are read once here too; `id`, `aria-label`,
//   `aria-labelledby`, `aria-describedby` and `aria-invalid` follow the
//   props, as React re-applies them on render.
// - `toolbarEnd` is the `#toolbarEnd` slot. Like React, only `class` is
//   applied (to the container); other attributes are not forwarded.
// - The shared Dialog owns focus trapping and closing. Its portal is not part
//   of the editor's click area, so editing a link preserves its selection.

type EditorLike = Pick<CoreEditor, "isActive" | "state">

const getMarkdown = (editor: CoreEditor) =>
  (editor.storage as unknown as Record<string, { getMarkdown?: () => string }>).markdown?.getMarkdown?.() ?? ""

// A link inserted as a text node, not as `<a>` HTML: the markdown parser runs
// with `html: false`, so HTML would land in the text as written
const linkText = (text: string, href: string) => ({
  type: "text",
  text,
  marks: [{ type: "link", attrs: { href } }],
})

export const markdownEditorStyles = {
  toolbarButton: s.ToolbarButton,
}

type LinkSelection = { from: number; to: number; doc: CoreEditor["state"]["doc"] }

const LinkDialog = defineComponent({
  name: "MarkdownEditorLinkDialog",
  props: {
    open: { type: Boolean, required: true },
    initialUrl: { type: String, required: true },
    initialTitle: { type: String, required: true },
    isEditing: { type: Boolean, required: true },
    disabled: { type: Boolean, required: true },
    onSave: { type: Function as PropType<(url: string, title: string) => void>, required: true },
    onRemove: { type: Function as PropType<() => void>, required: true },
    onCancel: { type: Function as PropType<() => void>, required: true },
    onRestoreFocus: { type: Function as PropType<(event: Event) => void>, required: true },
  },
  setup(props) {
    const url = ref(props.initialUrl)
    const title = ref(props.initialTitle)
    watch(() => [props.open, props.initialUrl, props.initialTitle] as const, ([open, initialUrl, initialTitle]) => {
      if (open) { url.value = initialUrl; title.value = initialTitle }
    })
    return () => h(Dialog, {
      "open": props.open,
      "onUpdate:open": (next: boolean) => { if (!next) props.onCancel() },
    }, { default: () => h(DialogContent, {
      width: 450, mobileVariant: "sheet", showClose: false,
      onCloseAutoFocus: props.onRestoreFocus,
    }, { default: () => [
      h(DialogHeader, null, { default: () => h(DialogTitle, null, { default: () => "Link" }) }),
      h(DialogBody, null, { default: () => h("div", {
        class: s.LinkDialogFields,
        onKeydown: (event: KeyboardEvent) => {
          if (event.key === "Enter" && !event.isComposing && event.target instanceof HTMLInputElement) {
            event.preventDefault()
            if (!props.disabled) props.onSave(url.value, title.value)
          }
        },
      }, [
        h(Field, { label: "URL" }, { default: () => h(Input, {
          type: "url", inputmode: "url", autocapitalize: "none", autocorrect: "off", spellcheck: false,
          placeholder: "Enter URL", value: url.value, disabled: props.disabled,
          "onUpdate:value": (value: string) => { url.value = value },
        }) }),
        h(Field, { label: "Link title" }, { default: () => h(Input, {
          placeholder: "Enter link title", value: title.value, disabled: props.disabled,
          "onUpdate:value": (value: string) => { title.value = value },
        }) }),
      ]) }),
      h(DialogFooter, null, { default: () => [
        props.isEditing ? h(Button, { color: "danger", variant: "soft", disabled: props.disabled, onClick: () => { if (!props.disabled) props.onRemove() } }, { default: () => "Remove" }) : null,
        h(Button, { color: "secondary", variant: "soft", onClick: () => props.onCancel() }, { default: () => "Cancel" }),
        h(Button, { color: "primary", disabled: props.disabled, onClick: () => { if (!props.disabled) props.onSave(url.value, title.value) } }, { default: () => "Save" }),
      ] }),
    ] }) })
  },
})

const ToolbarButton = defineComponent({
  name: "MarkdownEditorToolbarButton",
  props: {
    tooltip: { type: String, required: true },
    active: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    icon: { type: [Object, Function] as PropType<Component>, required: true },
    onClick: { type: Function as PropType<() => void>, required: true },
  },
  setup(props) {
    return () =>
      h(
        Tooltip,
        { content: props.tooltip, compact: true },
        {
          default: () =>
            h(
              Button,
              {
                "color": "secondary", "variant": "ghost", "size": "2xs", "iconSize": "sm", "uniform": true, "mobileMaterial": "flat",
                "class": s.ToolbarButton,
                "data-active": props.active || undefined,
                "selected": props.active,
                // Formatting buttons are toggles: announce their on/off state
                "aria-pressed": props.active,
                // React DOM never calls onClick on a disabled button, even
                // for a dispatched event; Vue's listener would run
                "onClick": () => {
                  if (!props.disabled) props.onClick()
                },
                "disabled": props.disabled,
                "aria-label": props.tooltip,
              },
              { default: () => h(props.icon) },
            ),
        },
      )
  },
})

const MarkdownEditorComponent = defineComponent({
  name: "MarkdownEditor",
  inheritAttrs: false,
  props: {
    /** Visual style of the editor. @default "outline" */
    variant: { type: String as PropType<Variants<"outline" | "soft">>, default: "outline" },
    /** Disables editing and the toolbar. @default false */
    disabled: { type: Boolean, default: false },
    /** Marks the editor as invalid. @default false */
    invalid: { type: Boolean, default: false },
    /** Placeholder text when empty (read when the editor is created) */
    placeholder: String,
    /** Controlled value as a markdown string (`v-model:value`) */
    value: { type: String, default: undefined },
    /** Default value as a markdown string for uncontrolled mode */
    defaultValue: { type: String, default: undefined },
    /** Minimum visible rows. @default 1 */
    rows: { type: Number, default: 1 },
    /** `id` of the editable element */
    id: String,
    /** Accessible name of the editable element; a `<label for>` cannot name a contenteditable region */
    ariaLabel: String,
    /** Id of the element that names the editor, such as a Field label */
    ariaLabelledby: String,
    /** `aria-describedby` of the editable element */
    ariaDescribedby: String,
    /** Sets `aria-invalid="true"` on the editable element and the invalid style */
    ariaInvalid: { type: Boolean, default: undefined },
  },
  emits: {
    /** The editor's markdown after a change (`v-model:value`) */
    "update:value": (markdown: string) => typeof markdown === "string",
    /** Same as `update:value` (React's `onChange`) */
    "change": (markdown: string) => typeof markdown === "string",
  },
  setup(props, { slots, attrs, emit }) {
    const focused = ref(false)
    const linkDialogOpen = ref(false)
    const linkDialogInitial = ref({ url: "", title: "" })
    const activeMarks = reactive({
      bold: false,
      italic: false,
      link: false,
      orderedList: false,
      bulletList: false,
    })
    const linkCanEnable = ref(false)
    const isControlled = () => props.value !== undefined
    let suppressChange = false
    let linkSelection: LinkSelection | null = null
    let restoreEditorFocus = false

    const syncToolbar = (e: EditorLike) => {
      Object.assign(activeMarks, {
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        link: e.isActive("link"),
        orderedList: e.isActive("orderedList"),
        bulletList: e.isActive("bulletList"),
      })
      linkCanEnable.value = !e.state.selection.empty || e.isActive("link")
    }

    const editorAttributes = () => ({
      "class": s.EditorContent,
      "role": "textbox",
      "aria-multiline": "true",
      ...(props.id && { id: props.id }),
      ...(props.ariaLabel && { "aria-label": props.ariaLabel }),
      ...(props.ariaLabelledby && { "aria-labelledby": props.ariaLabelledby }),
      ...(props.ariaDescribedby && { "aria-describedby": props.ariaDescribedby }),
      ...(props.ariaInvalid && { "aria-invalid": "true" }),
    })

    const editor = useEditor({
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
        ...(props.placeholder ? [Placeholder.configure({ placeholder: props.placeholder })] : []),
      ],
      content: props.value ?? props.defaultValue ?? "",
      editable: !props.disabled,
      editorProps: {
        attributes: editorAttributes(),
      },
      onFocus: () => {
        focused.value = true
      },
      onBlur: () => {
        focused.value = false
      },
      onUpdate: ({ editor: e }) => {
        if (suppressChange) return
        const md = getMarkdown(e)
        emit("update:value", md)
        emit("change", md)
      },
      onSelectionUpdate: ({ editor: e }) => syncToolbar(e),
      onTransaction: ({ editor: e }) => {
        syncToolbar(e)
        if (linkSelection && linkSelection.doc !== e.state.doc) {
          linkSelection = null
          restoreEditorFocus = false
          linkDialogOpen.value = false
        }
      },
    })

    // React re-applies the editor props on every render
    watch(editorAttributes, (attributes) => {
      editor.value?.setOptions({ editorProps: { attributes } })
    })

    watch(
      () => [editor.value, props.value, isControlled()] as const,
      ([instance, value, controlled]) => {
        if (!instance || !controlled) return
        const currentMd = getMarkdown(instance)
        if (value !== currentMd) {
          suppressChange = true
          instance.commands.setContent(value || "", { emitUpdate: false })
          suppressChange = false
        }
      },
    )

    watch(
      () => [editor.value, props.disabled] as const,
      ([instance, disabled]) => {
        if (instance) instance.setEditable(!disabled)
        if (disabled) {
          linkSelection = null
          restoreEditorFocus = false
          linkDialogOpen.value = false
        }
      },
    )

    const handleContainerMouseDown = (evt: MouseEvent) => {
      const instance = editor.value
      if (props.disabled || !instance) return
      const target = evt.target
      if (!(target instanceof Element) || !(evt.currentTarget instanceof Element) || !evt.currentTarget.contains(target)) return
      if (target.closest("button, [type='button'], [role='button'], a, input, label")) return
      // A press in the text places the caret there itself
      if (instance.view.dom.contains(target)) return
      if (instance.isFocused) return
      evt.preventDefault()
      instance.commands.focus("end")
    }

    const openLinkDialog = () => {
      const instance = editor.value
      if (!instance || props.disabled) return
      const url = instance.getAttributes("link").href ?? ""
      const selection = instance.state.selection
      const range = selection.empty && instance.isActive("link")
        ? getMarkRange(selection.$from, instance.schema.marks.link, { href: url })
        : selection
      if (!range) return
      linkSelection = { from: range.from, to: range.to, doc: instance.state.doc }
      restoreEditorFocus = true
      linkDialogInitial.value = { url, title: instance.state.doc.textBetween(range.from, range.to, "") }
      linkDialogOpen.value = true
    }
    const handleLinkSave = (url: string, title: string) => {
      const instance = editor.value
      const range = linkSelection
      if (!instance || props.disabled || !range) return
      linkDialogOpen.value = false
      if (range.doc !== instance.state.doc) { restoreEditorFocus = false; return }
      linkSelection = null
      const selectedText = instance.state.doc.textBetween(range.from, range.to, "")
      const chain = instance.chain().setTextSelection({ from: range.from, to: range.to })
      if (!url) chain.unsetLink().run()
      else if (title && title !== selectedText) chain.insertContent(linkText(title, url)).run()
      else chain.setLink({ href: url }).run()
    }
    const handleLinkRemove = () => {
      const instance = editor.value
      const range = linkSelection
      if (!instance || props.disabled || !range) return
      linkDialogOpen.value = false
      if (range.doc !== instance.state.doc) { restoreEditorFocus = false; return }
      linkSelection = null
      instance.chain().setTextSelection({ from: range.from, to: range.to }).unsetLink().run()
    }
    const handleLinkCancel = () => { linkDialogOpen.value = false }
    const handleRestoreFocus = (event: Event) => {
      keepMovedFocus(event)
      const shouldRestore = restoreEditorFocus && !event.defaultPrevented
      event.preventDefault()
      restoreEditorFocus = false
      linkSelection = null
      const instance = editor.value
      if (shouldRestore && instance && !instance.isDestroyed && !props.disabled) {
        const closingScope = event.target
        requestAnimationFrame(() => {
          if (instance.isDestroyed || !instance.isEditable) return
          const doc = instance.view.dom.ownerDocument
          const active = doc.activeElement
          if (active && active !== doc.body && !instance.view.dom.contains(active)
            && !(closingScope instanceof Node && closingScope.contains(active))) return
          // Check at the actual restore, then focus synchronously: Tiptap's
          // focus command queues another frame that could steal moved focus.
          instance.view.focus()
        })
      }
    }

    return () => {
      const { variant, disabled, invalid, ariaInvalid, rows } = props
      const isInvalid = invalid || ariaInvalid
      const minHeight = 20 * rows + 16
      // React renders the slot only for a truthy `toolbarEnd`
      const toolbarEnd = slots.toolbarEnd?.()
      const hasToolbarEnd = flattenSlot(toolbarEnd).length > 0

      return h(
        "div",
        {
          "class": [s.Container, attrs.class],
          "data-variant": variant,
          "data-focused": String(focused.value),
          "data-disabled": disabled ? "" : undefined,
          "data-invalid": isInvalid ? "" : undefined,
          "onMousedown": handleContainerMouseDown,
        },
        [
          h("div", { class: s.Toolbar, onMousedown: (e: MouseEvent) => e.preventDefault() }, [
            h("div", { class: s.ToolbarGroup }, [
              h(ToolbarButton, {
                tooltip: "Bold",
                active: activeMarks.bold,
                disabled,
                icon: BoldIcon,
                onClick: () => editor.value?.chain().focus().toggleBold().run(),
              }),
              h(ToolbarButton, {
                tooltip: "Italic",
                active: activeMarks.italic,
                disabled,
                icon: ItalicIcon,
                onClick: () => editor.value?.chain().focus().toggleItalic().run(),
              }),

              h("div", { "class": s.ToolbarSeparator, "aria-hidden": "true" }),

              h(ToolbarButton, {
                tooltip: "Numbered list",
                active: activeMarks.orderedList,
                disabled,
                icon: ListNumbersIcon,
                onClick: () => editor.value?.chain().focus().toggleOrderedList().run(),
              }),
              h(ToolbarButton, {
                tooltip: "Bullet list",
                active: activeMarks.bulletList,
                disabled,
                icon: ListIcon,
                onClick: () => editor.value?.chain().focus().toggleBulletList().run(),
              }),

              h("div", { "class": s.ToolbarSeparator, "aria-hidden": "true" }),

              h(ToolbarButton, {
                tooltip: "Link",
                active: activeMarks.link,
                disabled: disabled || !linkCanEnable.value,
                icon: LinkIcon,
                onClick: openLinkDialog,
              }),

              ...(hasToolbarEnd
                ? [
                    h("div", { "class": s.ToolbarSeparator, "aria-hidden": "true" }),
                    h("div", { class: s.ToolbarEnd }, toolbarEnd),
                  ]
                : []),
            ]),
          ]),

          h("div", { class: s.Editor, style: { minHeight: `${minHeight}px` } }, [
            h(EditorContent, { editor: editor.value }),
          ]),

          h(LinkDialog, {
            open: linkDialogOpen.value,
            initialUrl: linkDialogInitial.value.url,
            initialTitle: linkDialogInitial.value.title,
            isEditing: !!linkDialogInitial.value.url,
            disabled,
            onRestoreFocus: handleRestoreFocus,
            onSave: handleLinkSave,
            onRemove: handleLinkRemove,
            onCancel: handleLinkCancel,
          }),
        ],
      )
    }
  },
})

/**
 * Compact rich text editor for markdown, with a formatting toolbar (bold,
 * italic, lists, links). Bind the markdown with `v-model:value`.
 */
export const MarkdownEditor = MarkdownEditorComponent

export type MarkdownEditorProps = InstanceType<typeof MarkdownEditorComponent>["$props"]
