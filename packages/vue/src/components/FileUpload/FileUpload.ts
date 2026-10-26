import clsx from "clsx"
import { defineComponent, h, ref, shallowRef, useId, type PropType } from "vue"
import { FileBlank, FileDocument, ImageSquare, UploadDocuments, X } from "../Icon/index.js"
import { Button } from "../Button/index.js"
import { FieldError } from "../FieldError/index.js"
import s from "@plexui/styles/components/FileUpload/FileUpload.module.css"

// Vue port of packages/ui/src/components/FileUpload/FileUpload.tsx. Like
// React, the components spread no attributes: FileUpload reads `class` and
// `aria-describedby`, FileCard and FileCardGroup read `class`; anything else
// is dropped.

function getFileIcon(file: File) {
  const type = file.type
  const name = file.name.toLowerCase()

  if (
    type === "application/pdf" ||
    name.endsWith(".pdf") ||
    name.endsWith(".doc") ||
    name.endsWith(".docx") ||
    name.endsWith(".txt") ||
    name.endsWith(".rtf")
  ) {
    return h(FileDocument)
  }

  if (type.startsWith("image/") || /\.(png|jpe?g|gif|svg|webp|bmp|ico)$/.test(name)) {
    return h(ImageSquare)
  }

  return h(FileBlank)
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function splitFileName(name: string): { stem: string; ext: string } {
  const lastDot = name.lastIndexOf(".")
  if (lastDot <= 0) return { stem: name, ext: "" }
  return {
    stem: name.slice(0, lastDot),
    ext: name.slice(lastDot),
  }
}

/** Bordered container for standalone `FileCard`s. */
export const FileCardGroup = defineComponent({
  name: "FileCardGroup",
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => h("div", { class: clsx(s.FileCardGroup, attrs.class as string | undefined) }, slots.default?.())
  },
})

export type FileCardGroupProps = InstanceType<typeof FileCardGroup>["$props"]

/**
 * One attached file: type icon, name, size and an optional remove button.
 * `onRemove` (`@remove`) is a function prop because, as in React, the remove
 * button renders only when it is set.
 */
export const FileCard = defineComponent({
  name: "FileCard",
  inheritAttrs: false,
  props: {
    /** The file to display */
    file: { type: Object as PropType<File>, required: true },
    /** Remove callback. When omitted, the delete button is hidden. */
    onRemove: Function as PropType<() => void>,
    /** Disable the remove button */
    disabled: { type: Boolean, default: undefined },
  },
  setup(props, { attrs }) {
    return () => {
      const { file, onRemove } = props
      const { stem, ext } = splitFileName(file.name)

      return h("div", { class: clsx(s.FileItem, attrs.class as string | undefined) }, [
        h("div", { class: s.FileIcon }, [getFileIcon(file)]),
        h("div", { class: s.FileInfo }, [
          h("div", { class: s.FileNameRow }, [
            h("span", { class: s.FileNameStem }, stem),
            ext ? h("span", { class: s.FileNameExt }, ext) : null,
          ]),
          h("span", { class: s.FileSize }, formatFileSize(file.size)),
        ]),
        onRemove
          ? h(
              "button",
              {
                "type": "button",
                "class": s.FileRemove,
                // React passes the click event through (onClick={onRemove}) and
                // never runs a mouse handler of a disabled button
                "onClick": (event: MouseEvent) => {
                  if (props.disabled) return
                  ;(onRemove as (event: MouseEvent) => void)(event)
                },
                "aria-label": `Remove ${file.name}`,
                "disabled": props.disabled,
              },
              [h(X)],
            )
          : null,
      ])
    }
  },
})

export type FileCardProps = InstanceType<typeof FileCard>["$props"]

function matchesAccept(file: File, accept: string): boolean {
  const acceptTypes = accept.split(",").map((t) => t.trim().toLowerCase())
  const fileName = file.name.toLowerCase()
  const fileType = file.type.toLowerCase()

  return acceptTypes.some((acceptType) => {
    if (acceptType.startsWith(".")) {
      return fileName.endsWith(acceptType)
    }
    if (acceptType.endsWith("/*")) {
      const prefix = acceptType.slice(0, -1)
      return fileType.startsWith(prefix)
    }
    return fileType === acceptType
  })
}

/**
 * File picker with a file list. `value` + `update:value` (React's `value` +
 * `onValueChange`) support `v-model:value`. Uncontrolled when `value` is not set.
 */
export const FileUpload = defineComponent({
  name: "FileUpload",
  inheritAttrs: false,
  props: {
    /** Visual variant: compact button or larger tappable area. @default "compact" */
    variant: { type: String as PropType<"compact" | "area">, default: "compact" },
    /** Button label text */
    label: String,
    /** Helper text below the icon (area variant only) */
    description: String,
    /** Accepted file types (e.g. ".pdf,.png,image/*") */
    accept: String,
    /** Allow selecting multiple files. @default false */
    multiple: { type: Boolean, default: false },
    /** Maximum number of files. The button disables at the limit. */
    maxFiles: Number,
    /** Maximum file size in bytes */
    maxSize: Number,
    /** Controlled file list. Bind with `v-model:value`. */
    value: { type: Array as PropType<File[]>, default: undefined },
    /** Error message; sets the invalid visual state */
    errorMessage: String,
    /** Invalid state. @default false (true when errorMessage is set) */
    invalid: { type: Boolean, default: undefined },
    /** Disable all interactions. @default false */
    disabled: { type: Boolean, default: false },
    /** Id of the hidden file input */
    id: String,
  },
  emits: {
    /** Files were added or removed (`v-model:value`) */
    "update:value": (_files: File[]) => true,
    /** A file was rejected (wrong type, too large, over the limit) */
    "fileReject": (_file: File, _reason: string) => true,
  },
  setup(props, { attrs, emit }) {
    const internalFiles = shallowRef<File[]>([])
    const inputRef = ref<HTMLInputElement | null>(null)
    const generatedId = useId()

    const getFiles = () => props.value ?? internalFiles.value

    const updateFiles = (next: File[]) => {
      emit("update:value", next)
      if (props.value === undefined) {
        internalFiles.value = next
      }
    }

    const handleFileSelect = (e: Event) => {
      const target = e.target as HTMLInputElement
      const files = getFiles()
      const { accept, maxSize, maxFiles } = props
      const selected = Array.from(target.files || [])
      const accepted: File[] = []

      for (const file of selected) {
        if (accept && !matchesAccept(file, accept)) {
          emit("fileReject", file, `File type not accepted: ${file.name}`)
          continue
        }
        if (maxSize && file.size > maxSize) {
          emit("fileReject", file, `File too large: ${file.name} (${formatFileSize(file.size)})`)
          continue
        }
        if (maxFiles && files.length + accepted.length >= maxFiles) {
          emit("fileReject", file, `Maximum ${maxFiles} files allowed`)
          continue
        }
        accepted.push(file)
      }

      if (accepted.length > 0) {
        updateFiles([...files, ...accepted])
      }

      target.value = ""
    }

    const removeFile = (index: number) => {
      const next = getFiles().filter((_, i) => i !== index)
      updateFiles(next)
    }

    const openPicker = () => {
      inputRef.value?.click()
    }


    return () => {
      const { variant, label, description, maxFiles, errorMessage, disabled } = props
      const files = getFiles()
      const inputId = props.id || `file-upload-${generatedId}`
      const errorId = `${inputId}-error`
      const invalid = props.invalid ?? !!errorMessage
      const ariaDescribedBy =
        [attrs["aria-describedby"] as string | undefined, errorMessage ? errorId : undefined]
          .filter(Boolean)
          .join(" ") || undefined
      const atLimit = !!maxFiles && files.length >= maxFiles

      return h("div", { class: clsx(s.Root, attrs.class as string | undefined) }, [
        variant === "area"
          ? h(
              "button",
              {
                "type": "button",
                "class": s.AreaTrigger,
                "data-invalid": invalid ? "" : undefined,
                // Like React, no click handling while the button is disabled
                "onClick": () => {
                  if (!(disabled || atLimit)) openPicker()
                },
                "disabled": disabled || atLimit,
              },
              [
                h(UploadDocuments, { class: s.AreaIcon }),
                h("span", { class: s.AreaLabel }, label || "Tap to upload files"),
                description ? h("span", { class: s.AreaDescription }, description) : null,
              ],
            )
          : h(
              Button,
              {
                color: "secondary",
                variant: "soft",
                size: "3xl",
                pill: true,
                block: true,
                disabled: disabled || atLimit,
                onClick: openPicker,
                class: "h-[3.25rem]",
              },
              { default: () => [label || "Upload file"] },
            ),

        files.length > 0
          ? h(
              "ul",
              { "class": s.FileList, "data-variant": variant, "aria-label": "Attached files" },
              files.map((file, index) =>
                h("li", { key: `${file.name}-${file.size}-${file.lastModified}` }, [
                  h(FileCard, { file, onRemove: () => removeFile(index), disabled }),
                ]),
              ),
            )
          : null,

        h("input", {
          "ref": inputRef,
          "type": "file",
          "class": s.HiddenInput,
          "accept": props.accept,
          "multiple": props.multiple,
          "onChange": handleFileSelect,
          "disabled": disabled,
          "id": inputId,
          "aria-describedby": ariaDescribedBy,
          "tabindex": -1,
        }),

        errorMessage ? h(FieldError, { id: errorId, class: s.ErrorMessage }, { default: () => [errorMessage] }) : null,
      ])
    }
  },
})

export type FileUploadProps = InstanceType<typeof FileUpload>["$props"]
