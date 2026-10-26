"use client"

import clsx from "clsx"
import { useCallback, useId, useRef, useState } from "react"
import {
  FileDocument,
  ImageSquare,
  FileBlank,
  UploadDocuments,
  X,
} from "../Icon"
import { Button } from "../Button"
import { FieldError } from "../FieldError"
import s from "@plexui/styles/components/FileUpload/FileUpload.module.css"

export type FileUploadProps = {
  variant?: "compact" | "area"
  label?: string
  description?: string
  accept?: string
  multiple?: boolean
  maxFiles?: number
  maxSize?: number
  value?: File[]
  onValueChange?: (files: File[]) => void
  onFileReject?: (file: File, reason: string) => void
  errorMessage?: string
  invalid?: boolean
  disabled?: boolean
  id?: string
  className?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
}

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
    return <FileDocument />
  }

  if (type.startsWith("image/") || /\.(png|jpe?g|gif|svg|webp|bmp|ico)$/.test(name)) {
    return <ImageSquare />
  }

  return <FileBlank />
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

export type FileCardGroupProps = {
  children: React.ReactNode
  className?: string
}

export const FileCardGroup = ({ children, className }: FileCardGroupProps) => {
  return <div className={clsx(s.FileCardGroup, className)}>{children}</div>
}

export type FileCardProps = {
  file: File
  onRemove?: () => void
  disabled?: boolean
  className?: string
}

export const FileCard = ({ file, onRemove, disabled, className }: FileCardProps) => {
  const { stem, ext } = splitFileName(file.name)

  return (
    <div className={clsx(s.FileItem, className)}>
      <div className={s.FileIcon}>{getFileIcon(file)}</div>
      <div className={s.FileInfo}>
        <div className={s.FileNameRow}>
          <span className={s.FileNameStem}>{stem}</span>
          {ext && <span className={s.FileNameExt}>{ext}</span>}
        </div>
        <span className={s.FileSize}>{formatFileSize(file.size)}</span>
      </div>
      {onRemove && (
        <button
          type="button"
          className={s.FileRemove}
          onClick={onRemove}
          aria-label={`Remove ${file.name}`}
          disabled={disabled}
        >
          <X />
        </button>
      )}
    </div>
  )
}

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

export const FileUpload = (props: FileUploadProps) => {
  const {
    variant = "compact",
    label,
    description,
    accept,
    multiple = false,
    maxFiles,
    maxSize,
    value: controlledValue,
    onValueChange,
    onFileReject,
    errorMessage,
    "invalid": invalidProp,
    disabled = false,
    className,
    id: idProp,
    "aria-describedby": ariaDescribedByProp,
    "aria-invalid": ariaInvalidProp,
  } = props

  const [internalFiles, setInternalFiles] = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const generatedId = useId()
  const inputId = idProp || `file-upload-${generatedId}`
  const errorId = `${inputId}-error`

  const files = controlledValue ?? internalFiles
  const isControlled = controlledValue !== undefined
  const invalid = invalidProp ?? !!errorMessage
  const ariaInvalid = ariaInvalidProp ?? (invalid || undefined)

  const ariaDescribedBy =
    [ariaDescribedByProp, errorMessage ? errorId : undefined].filter(Boolean).join(" ") ||
    undefined

  const updateFiles = useCallback(
    (next: File[]) => {
      onValueChange?.(next)
      if (!isControlled) {
        setInternalFiles(next)
      }
    },
    [onValueChange, isControlled],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files || [])
      // Without `multiple`, a pick replaces the file instead of adding to it
      const kept = multiple ? files : []
      const accepted: File[] = []

      for (const file of selected) {
        if (accept && !matchesAccept(file, accept)) {
          onFileReject?.(file, `File type not accepted: ${file.name}`)
          continue
        }
        if (maxSize && file.size > maxSize) {
          onFileReject?.(file, `File too large: ${file.name} (${formatFileSize(file.size)})`)
          continue
        }
        if (maxFiles && kept.length + accepted.length >= maxFiles) {
          onFileReject?.(file, `Maximum ${maxFiles} files allowed`)
          continue
        }
        accepted.push(file)
      }

      if (accepted.length > 0) {
        updateFiles([...kept, ...accepted])
      }

      e.target.value = ""
    },
    [accept, maxSize, maxFiles, multiple, files, updateFiles, onFileReject],
  )

  const removeFile = useCallback(
    (index: number) => {
      const next = files.filter((_, i) => i !== index)
      updateFiles(next)
    },
    [files, updateFiles],
  )

  const openPicker = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const atLimit = !!maxFiles && files.length >= maxFiles

  return (
    <div className={clsx(s.Root, className)}>
      {variant === "area" ? (
        <button
          type="button"
          className={s.AreaTrigger}
          data-invalid={invalid ? "" : undefined}
          onClick={openPicker}
          disabled={disabled || atLimit}
          // The visible trigger is what keyboard and screen-reader users reach
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
        >
          <UploadDocuments className={s.AreaIcon} />
          <span className={s.AreaLabel}>{label || "Tap to upload files"}</span>
          {description && <span className={s.AreaDescription}>{description}</span>}
        </button>
      ) : (
        <Button
          color="secondary"
          variant="soft"
          size="3xl"
          pill
          block
          disabled={disabled || atLimit}
          onClick={openPicker}
          className="h-[3.25rem]"
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
        >
          {label || "Upload file"}
        </Button>
      )}

      {files.length > 0 && (
        <ul
          className={s.FileList}
          data-variant={variant}
          aria-label="Attached files"
        >
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}`}>
              <FileCard
                file={file}
                onRemove={() => removeFile(index)}
                disabled={disabled}
              />
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        className={s.HiddenInput}
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        disabled={disabled}
        id={inputId}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
      />

      {errorMessage && (
        <FieldError id={errorId} className={s.ErrorMessage}>
          {errorMessage}
        </FieldError>
      )}
    </div>
  )
}
